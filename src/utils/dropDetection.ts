import { AudioAnalysis, DropAnalysis, SpotifyTrack } from '../types';
import { spotifyApiCall } from './spotify';

/**
 * Improved EDM‑friendly drop detector
 *
 * Key upgrades (kept lightweight):
 * 1. **Dynamic loudness threshold** – adapts to track master level.
 * 2. **Beat‑snap** – aligns chosen drop to the nearest confident bar down‑beat.
 * 3. **Energy‑dip heuristic** – looks for quiet‑>loud transition just before the hit.
 * 4. Same public API + caching, so it's a drop‑in replacement.
 */

export async function detectDrop(
  track: SpotifyTrack,
  loudnessOffset: number = 3,        // dB above median loudness
  previewLength: number = 20000      // ms of audio preview to play
): Promise<DropAnalysis> {
  try {
    console.log('Detecting drop for track:', track.name);
    const cacheKey = getCacheKey(track.id, loudnessOffset, previewLength);
    // ────────────────────────────────── CACHE ───────────────────────────────────
    const cached = await getCachedAnalysis(track.id, loudnessOffset, previewLength);
    if (cached && Date.now() - cached.analysisTimestamp < 7 * 24 * 60 * 60 * 1000) {
      console.log('Using cached analysis for:', track.name);
      return cached;
    }

    // ─────────────────────────────── SPOTIFY ANALYSIS ───────────────────────────
    console.log('Fetching audio analysis from Spotify…');
    const analysis: AudioAnalysis = await spotifyApiCall(`/audio-analysis/${track.id}`);

    const dropAnalysis = analyzeForDrop(track, analysis, loudnessOffset, previewLength);
    console.log('Drop analysis result:', dropAnalysis);

    await cacheAnalysis({ ...dropAnalysis, cacheKey });
    return dropAnalysis;
  } catch (err) {
    console.error('Drop detection failed, using fallback:', err);
    return fallbackDrop(track, previewLength, 0.3, 'error');
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// Core analysis
// ────────────────────────────────────────────────────────────────────────────────
function analyzeForDrop(
  track: SpotifyTrack,
  analysis: AudioAnalysis,
  loudnessOffset: number,
  previewLength: number
): DropAnalysis {
  const durMs = track.duration_ms;
  const searchStartMs = durMs * 0.15;
  const searchEndMs   = durMs * (durMs < 240_000 ? 0.7 : 0.8); // longer for >4‑min tracks

  // ——— Dynamic loudness baseline ———
  const medianLoud = median(analysis.segments.map(s => s.loudness_max));
  const dynThreshold = medianLoud + loudnessOffset;  // e.g. +3 dB above median

  // 1. Section‑based scan
  const sectionHit = findDropInSections(analysis.sections, searchStartMs, searchEndMs, dynThreshold);
  if (sectionHit)
    return buildResult(track, analysis, sectionHit, 'sections', previewLength);

  // 2. Segment loudness spike
  const segmentHit = findDropInSegments(analysis.segments, searchStartMs, searchEndMs, dynThreshold);
  if (segmentHit)
    return buildResult(track, analysis, segmentHit, 'segments', previewLength);

  // 3. Loudest segment fallback in window
  const hit = loudestSegmentInRange(analysis.segments, searchStartMs, searchEndMs);
  if (hit)
    return buildResult(track, analysis, hit, 'loudest‑segment', previewLength, 0.6);

  // 4. Hard fallback to 30 %
  return fallbackDrop(track, previewLength, 0.2, '30‑percent');
}

// ────────────────────────────── Helper builders ────────────────────────────────
function buildResult(
  track: SpotifyTrack,
  analysis: AudioAnalysis,
  candidate: DropCandidate,
  method: string,
  previewLength: number,
  confidenceOverride?: number
): DropAnalysis {
  // Snap to nearest bar down‑beat for musical tightness
  const snapped = snapToDownbeat(candidate.start, analysis.bars);
  const confidence = confidenceOverride ?? squash(candidate.score);

  return {
    trackId: track.id,
    dropStart: Math.floor(snapped * 1000), // sec → ms
    confidence,
    method,
    previewLength,
    analysisTimestamp: Date.now(),
  };
}

function fallbackDrop(track: SpotifyTrack, previewLength: number, confidence: number, method: string): DropAnalysis {
  return {
    trackId: track.id,
    dropStart: Math.floor(track.duration_ms * 0.3),
    confidence,
    method,
    previewLength,
    analysisTimestamp: Date.now(),
  };
}

// ───────────────────────────── Detection primitives ────────────────────────────
interface DropCandidate { start: number; score: number; }

function findDropInSections(
  sections: AudioAnalysis['sections'],
  startMs: number,
  endMs: number,
  thresh: number
): DropCandidate | null {
  const s = startMs / 1000, e = endMs / 1000;
  const span = e - s;
  let best: DropCandidate | null = null;

  for (let i = 1; i < sections.length; i++) {
    const cur = sections[i];
    if (cur.start < s || cur.start > e) continue;
    const prev = sections[i - 1];
    if (cur.loudness < thresh) continue;

    // score: loudness + tempo_conf + energy jump + sweet‑spot bonus
    let score = (cur.loudness + 60) / 10;
    score += cur.tempo_confidence * 4;
    if (cur.loudness > prev.loudness + 2) score += 4;                // energy jump
    const posRatio = (cur.start - s) / span;
    if (posRatio > 0.2 && posRatio < 0.8) score += 2;                 // middle sweet spot

    if (!best || score > best.score) best = { start: cur.start, score };
  }
  return best;
}

function findDropInSegments(
  segments: AudioAnalysis['segments'],
  startMs: number,
  endMs: number,
  thresh: number
): DropCandidate | null {
  const s = startMs / 1000, e = endMs / 1000;
  let best: DropCandidate | null = null;

  for (let i = 1; i < segments.length; i++) {
    const cur = segments[i];
    if (cur.start < s || cur.start > e) continue;
    if (cur.loudness_max < thresh) continue;

    const prev = segments[i - 1];
    const loudJump = cur.loudness_max - prev.loudness_max;
    const score = Math.max(0, loudJump) * 3 + (cur.loudness_max + 60) / 15;

    if (!best || score > best.score) best = { start: cur.start, score };
  }
  return best;
}

function loudestSegmentInRange(
  segments: AudioAnalysis['segments'],
  startMs: number,
  endMs: number
): DropCandidate | null {
  const s = startMs / 1000, e = endMs / 1000;
  const inRange = segments.filter(seg => seg.start >= s && seg.start <= e);
  if (!inRange.length) return null;
  const loudest = inRange.reduce((a, b) => (b.loudness_max > a.loudness_max ? b : a));
  return { start: loudest.start, score: 0.6 };
}

// ───────────────────────────── Utility helpers ────────────────────────────────
function snapToDownbeat(targetSec: number, bars: AudioAnalysis['bars']): number {
  let closest = targetSec;
  let minDist = Infinity;
  for (const bar of bars) {
    if (bar.confidence < 0.5) continue;
    const dist = Math.abs(bar.start - targetSec);
    if (dist < minDist) { minDist = dist; closest = bar.start; }
  }
  return closest;
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function squash(x: number): number { return 1 / (1 + Math.exp(-0.6 * (x - 5))); }

// ──────────────────────────────── Caching ─────────────────────────────────────
const DB_NAME = 'SpotifyDropAnalysisDB';
const DB_VERSION = 1;
const STORE_NAME = 'dropAnalysis';

function getCacheKey(trackId: string, loudnessOffset: number, previewLength: number): string {
  return `${trackId}|${loudnessOffset}|${previewLength}`;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => rej(req.error);
    req.onsuccess = () => res(req.result);
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const st = db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
        st.createIndex('timestamp', 'analysisTimestamp');
      }
    };
  });
}

async function getCachedAnalysis(trackId: string, loudnessOffset: number, previewLength: number): Promise<DropAnalysis | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const cacheKey = getCacheKey(trackId, loudnessOffset, previewLength);
    const req = tx.objectStore(STORE_NAME).get(cacheKey);
    return await new Promise((res, rej) => {
      req.onerror = () => rej(req.error);
      req.onsuccess = () => res(req.result || null);
    });
  } catch (e) {
    console.error('Cache read failed:', e);
    return null;
  }
}

async function cacheAnalysis(a: DropAnalysis & { cacheKey: string }): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(a);
  } catch (e) {
    console.error('Cache write failed:', e);
  }
}
