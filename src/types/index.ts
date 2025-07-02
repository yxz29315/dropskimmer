export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string; height: number; width: number }>;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  tracks: {
    total: number;
  };
  images: Array<{ url: string; height: number; width: number }>;
  owner: {
    display_name: string;
  };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  duration_ms: number;
  uri: string;
  preview_url?: string;
}

export interface AudioAnalysis {
  track: {
    duration: number;
    loudness: number;
    tempo: number;
    key: number;
    mode: number;
    time_signature: number;
  };
  sections: Array<{
    start: number;
    duration: number;
    confidence: number;
    loudness: number;
    tempo: number;
    tempo_confidence: number;
    key: number;
    key_confidence: number;
    mode: number;
    mode_confidence: number;
  }>;
  segments: Array<{
    start: number;
    duration: number;
    confidence: number;
    loudness_start: number;
    loudness_max: number;
    loudness_max_time: number;
    pitches: number[];
    timbre: number[];
  }>;
  bars: Array<{
    start: number;
    duration: number;
    confidence: number;
  }>;
}

export interface DropAnalysis {
  trackId: string;
  dropStart: number; // in milliseconds
  confidence: number;
  method: 'sections' | 'segments' | 'fallback';
  previewLength: number;
  analysisTimestamp: number;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTrack: SpotifyTrack | null;
  currentTrackIndex: number;
  queue: SpotifyTrack[];
  progress: number;
  previewLength: number;
  loudnessThreshold: number;
  dropAnalysis: DropAnalysis | null;
}