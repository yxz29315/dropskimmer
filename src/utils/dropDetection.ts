import { AudioAnalysis, DropAnalysis, SpotifyTrack } from '../types';
import { spotifyApiCall } from './spotify';

/**
 * Advanced drop detection algorithm using Spotify's Audio Analysis API
 * 
 * Strategy:
 * 1. Analyze sections for tempo/loudness patterns
 * 2. Look for energy buildup followed by drop (20-50% into track)
 * 3. Fall back to loudest segment if heuristics fail
 * 4. Cache results to avoid re-analysis
 */

export async function detectDrop(
  track: SpotifyTrack,
  loudnessThreshold: number = -10,
  previewLength: number = 20000
): Promise<DropAnalysis> {
  try {
    console.log('Detecting drop for track:', track.name);
    
    // Check cache first
    const cached = await getCachedAnalysis(track.id);
    if (cached && (Date.now() - cached.analysisTimestamp) < 7 * 24 * 60 * 60 * 1000) { // 7 days
      console.log('Using cached analysis for:', track.name);
      return cached;
    }

    // Fetch audio analysis from Spotify
    console.log('Fetching audio analysis from Spotify...');
    const analysis: AudioAnalysis = await spotifyApiCall(`/audio-analysis/${track.id}`);
    console.log('Audio analysis received:', analysis);
    
    const dropAnalysis = analyzeForDrop(track, analysis, loudnessThreshold, previewLength);
    console.log('Drop analysis result:', dropAnalysis);
    
    // Cache the result
    await cacheAnalysis(dropAnalysis);
    
    return dropAnalysis;
  } catch (error) {
    console.error('Drop detection failed for', track.name, ':', error);
    
    // Fallback: use 20% into track as requested
    const fallbackDrop: DropAnalysis = {
      trackId: track.id,
      dropStart: Math.floor(track.duration_ms * 0.2), // 20% into track
      confidence: 0.3,
      method: 'fallback',
      previewLength,
      analysisTimestamp: Date.now()
    };
    
    console.log('Using fallback drop detection:', fallbackDrop);
    await cacheAnalysis(fallbackDrop);
    return fallbackDrop;
  }
}

function analyzeForDrop(
  track: SpotifyTrack,
  analysis: AudioAnalysis,
  loudnessThreshold: number,
  previewLength: number
): DropAnalysis {
  const trackDurationMs = track.duration_ms;
  const searchStartMs = trackDurationMs * 0.15; // Start looking at 15%
  const searchEndMs = trackDurationMs * 0.65;   // Stop looking at 65%
  
  console.log(`Analyzing track ${track.name} (${trackDurationMs}ms) for drops between ${searchStartMs}ms and ${searchEndMs}ms`);
  
  // Method 1: Analyze sections for energy patterns
  const sectionDrop = findDropInSections(analysis.sections, searchStartMs, searchEndMs, loudnessThreshold);
  if (sectionDrop) {
    console.log('Found drop using sections analysis:', sectionDrop);
    return {
      trackId: track.id,
      dropStart: Math.floor(sectionDrop.start * 1000),
      confidence: sectionDrop.confidence,
      method: 'sections',
      previewLength,
      analysisTimestamp: Date.now()
    };
  }
  
  // Method 2: Analyze segments for loudness peaks
  const segmentDrop = findDropInSegments(analysis.segments, searchStartMs, searchEndMs, loudnessThreshold);
  if (segmentDrop) {
    console.log('Found drop using segments analysis:', segmentDrop);
    return {
      trackId: track.id,
      dropStart: Math.floor(segmentDrop.start * 1000),
      confidence: segmentDrop.confidence,
      method: 'segments',
      previewLength,
      analysisTimestamp: Date.now()
    };
  }
  
  // Method 3: Find the loudest segment in the search range
  const searchStartSec = searchStartMs / 1000;
  const searchEndSec = searchEndMs / 1000;
  
  const segmentsInRange = analysis.segments.filter(segment => 
    segment.start >= searchStartSec && segment.start <= searchEndSec
  );
  
  if (segmentsInRange.length > 0) {
    const loudestSegment = segmentsInRange.reduce((prev, current) => 
      current.loudness_max > prev.loudness_max ? current : prev
    );
    
    console.log('Using loudest segment in range:', loudestSegment);
    return {
      trackId: track.id,
      dropStart: Math.floor(loudestSegment.start * 1000),
      confidence: 0.6,
      method: 'segments',
      previewLength,
      analysisTimestamp: Date.now()
    };
  }
  
  // Final fallback: 30% into track
  console.log('Using final fallback: 30% into track');
  return {
    trackId: track.id,
    dropStart: Math.floor(trackDurationMs * 0.3),
    confidence: 0.2,
    method: 'fallback',
    previewLength,
    analysisTimestamp: Date.now()
  };
}

interface DropCandidate {
  start: number;
  confidence: number;
}

function findDropInSections(
  sections: AudioAnalysis['sections'],
  searchStartMs: number,
  searchEndMs: number,
  loudnessThreshold: number
): DropCandidate | null {
  const searchStartSec = searchStartMs / 1000;
  const searchEndSec = searchEndMs / 1000;
  
  console.log('Analyzing sections for drops...');
  
  const candidateSections = sections.filter(section => 
    section.start >= searchStartSec && 
    section.start <= searchEndSec &&
    section.loudness >= loudnessThreshold &&
    section.tempo_confidence > 0.3
  );
  
  console.log(`Found ${candidateSections.length} candidate sections`);
  
  if (candidateSections.length === 0) return null;
  
  // Look for sections with high energy and good tempo confidence
  let bestCandidate: DropCandidate | null = null;
  let bestScore = 0;
  
  for (let i = 0; i < candidateSections.length; i++) {
    const section = candidateSections[i];
    const prevSection = i > 0 ? candidateSections[i - 1] : null;
    
    // Score based on loudness, tempo confidence, and energy jump
    let score = (section.loudness + 60) / 15; // Normalize loudness (-60 to 0 dB)
    score += section.tempo_confidence * 3;
    
    // Bonus for energy jump from previous section
    if (prevSection && section.loudness > prevSection.loudness + 2) {
      score += 4;
      console.log(`Energy jump detected: ${prevSection.loudness} -> ${section.loudness}`);
    }
    
    // Bonus for being in the sweet spot (25-45% of track)
    const totalDuration = searchEndSec - searchStartSec;
    const positionRatio = (section.start - searchStartSec) / totalDuration;
    if (positionRatio >= 0.2 && positionRatio <= 0.8) {
      score += 2;
    }
    
    // Bonus for high tempo confidence
    if (section.tempo_confidence > 0.7) {
      score += 2;
    }
    
    console.log(`Section at ${section.start}s: loudness=${section.loudness}, tempo_conf=${section.tempo_confidence}, score=${score}`);
    
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = {
        start: section.start,
        confidence: Math.min(score / 12, 1.0)
      };
    }
  }
  
  return bestCandidate;
}

function findDropInSegments(
  segments: AudioAnalysis['segments'],
  searchStartMs: number,
  searchEndMs: number,
  loudnessThreshold: number
): DropCandidate | null {
  const searchStartSec = searchStartMs / 1000;
  const searchEndSec = searchEndMs / 1000;
  
  console.log('Analyzing segments for drops...');
  
  const candidateSegments = segments.filter(segment => 
    segment.start >= searchStartSec && 
    segment.start <= searchEndSec &&
    segment.loudness_max >= loudnessThreshold
  );
  
  console.log(`Found ${candidateSegments.length} candidate segments`);
  
  if (candidateSegments.length === 0) return null;
  
  // Find segments with sudden loudness spikes
  let bestCandidate: DropCandidate | null = null;
  let bestScore = 0;
  
  for (let i = 1; i < candidateSegments.length; i++) {
    const segment = candidateSegments[i];
    const prevSegment = candidateSegments[i - 1];
    
    const loudnessJump = segment.loudness_max - prevSegment.loudness_max;
    const timbre = segment.timbre;
    
    // Score based on loudness spike and timbral characteristics
    let score = Math.max(0, loudnessJump) * 3;
    score += (segment.loudness_max + 60) / 20; // Normalize loudness
    
    // Bonus for strong timbral characteristics (brightness, energy)
    if (timbre.length > 0) {
      score += Math.abs(timbre[0]) * 0.15; // Brightness
    }
    if (timbre.length > 1) {
      score += Math.abs(timbre[1]) * 0.15; // Energy
    }
    
    // Bonus for significant loudness jump
    if (loudnessJump > 3) {
      score += 3;
      console.log(`Significant loudness jump: ${prevSegment.loudness_max} -> ${segment.loudness_max}`);
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = {
        start: segment.start,
        confidence: Math.min(score / 20, 1.0)
      };
    }
  }
  
  return bestCandidate;
}

// IndexedDB caching for analysis results
const DB_NAME = 'SpotifyDropAnalysisDB';
const DB_VERSION = 1;
const STORE_NAME = 'dropAnalysis';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'trackId' });
        store.createIndex('timestamp', 'analysisTimestamp');
      }
    };
  });
}

async function getCachedAnalysis(trackId: string): Promise<DropAnalysis | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(trackId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (error) {
    console.error('Failed to get cached analysis:', error);
    return null;
  }
}

async function cacheAnalysis(analysis: DropAnalysis): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.put(analysis);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Failed to cache analysis:', error);
  }
}