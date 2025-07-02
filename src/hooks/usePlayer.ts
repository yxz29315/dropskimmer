import { useState, useCallback, useRef, useEffect } from 'react';
import { PlayerState, SpotifyTrack, DropAnalysis } from '../types';
import { detectDrop } from '../utils/dropDetection';
import { 
  loadYouTubeAPI, 
  searchYouTubeVideo, 
  createYouTubePlayer, 
  playFromTime, 
  pausePlayer, 
  getCurrentTime,
  getPlayerState,
  destroyPlayer,
  YT_PLAYER_STATES 
} from '../utils/youtube';

export function usePlayer() {
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTrack: null,
    currentTrackIndex: 0,
    queue: [],
    progress: 0,
    previewLength: 20000, // 20 seconds default
    dropAnalysis: null,
  });

  const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
  const [isYouTubeReady, setIsYouTubeReady] = useState(false);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const previewTimeout = useRef<NodeJS.Timeout | null>(null);
  const currentVideoId = useRef<string | null>(null);

  // Initialize YouTube API
  useEffect(() => {
    loadYouTubeAPI()
      .then(() => {
        console.log('YouTube API loaded successfully');
        setIsYouTubeReady(true);
      })
      .catch(console.error);
  }, []);

  const setQueue = useCallback((tracks: SpotifyTrack[]) => {
    console.log('Setting queue with', tracks.length, 'tracks');
    setPlayerState(prev => ({
      ...prev,
      queue: tracks,
      currentTrackIndex: 0,
      currentTrack: tracks[0] || null,
    }));
  }, []);

  const playTrack = useCallback(async (track: SpotifyTrack, index: number) => {
    try {
      console.log('=== Playing track ===');
      console.log('Track:', track.name, 'by', track.artists[0]?.name);
      console.log('Index:', index);
      
      // Stop any existing playback
      if (youtubePlayer) {
        pausePlayer();
      }
      
      // Clear any existing timeouts
      if (previewTimeout.current) {
        clearTimeout(previewTimeout.current);
        previewTimeout.current = null;
      }
      
      // Update player state immediately
      setPlayerState(prev => ({
        ...prev,
        currentTrack: track,
        currentTrackIndex: index,
        isPlaying: false,
        progress: 0,
        dropAnalysis: null,
      }));

      // Detect drop point using Spotify's Audio Analysis
      console.log('Detecting drop for track...');
      const dropAnalysis = await detectDrop(track, 3, playerState.previewLength);
      console.log('Drop detected:', dropAnalysis);
      
      setPlayerState(prev => ({
        ...prev,
        dropAnalysis,
      }));

      // Search for YouTube video
      const artist = track.artists[0]?.name || '';
      console.log('Searching YouTube for:', artist, '-', track.name);
      const videoId = await searchYouTubeVideo(artist, track.name);
      
      if (!videoId) {
        console.warn('Could not find YouTube video, skipping to next track');
        setTimeout(() => nextTrack(), 2000);
        return;
      }

      console.log('Found YouTube video:', videoId);
      currentVideoId.current = videoId;

      // Create or update YouTube player
      if (!youtubePlayer && isYouTubeReady) {
        console.log('Creating new YouTube player...');
        const player = await createYouTubePlayer(
          'youtube-player',
          videoId,
          () => {
            console.log('YouTube player ready, starting playback from:', dropAnalysis.dropStart, 'ms');
            playFromTime(dropAnalysis.dropStart);
            setPlayerState(prev => ({ ...prev, isPlaying: true }));
            startProgressTracking(dropAnalysis.dropStart);
          },
          (event) => {
            handlePlayerStateChange(event);
          }
        );
        setYoutubePlayer(player);
      } else if (youtubePlayer) {
        console.log('Loading new video in existing player...');
        youtubePlayer.loadVideoById(videoId, dropAnalysis.dropStart / 1000);
        // The onReady callback will handle the rest
      } else {
        console.warn('YouTube player not ready, skipping track');
        setTimeout(() => nextTrack(), 1000);
      }
    } catch (error) {
      console.error('Failed to play track:', error);
      // Try next track after a short delay
      setTimeout(() => nextTrack(), 2000);
    }
  }, [playerState.previewLength, youtubePlayer, isYouTubeReady]);

  const handlePlayerStateChange = useCallback((event: any) => {
    const state = event.data;
    console.log('YouTube player state changed:', state);
    
    if (state === YT_PLAYER_STATES.PLAYING) {
      setPlayerState(prev => ({ ...prev, isPlaying: true }));
      if (playerState.dropAnalysis) {
        startProgressTracking(playerState.dropAnalysis.dropStart);
      }
    } else if (state === YT_PLAYER_STATES.PAUSED) {
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
      stopProgressTracking();
      if (previewTimeout.current) {
        clearTimeout(previewTimeout.current);
        previewTimeout.current = null;
      }
    } else if (state === YT_PLAYER_STATES.ENDED) {
      console.log('Video ended, moving to next track');
      nextTrack();
    } else if (state === YT_PLAYER_STATES.BUFFERING) {
      console.log('Video buffering...');
    }
  }, [playerState.dropAnalysis]);

  const startProgressTracking = useCallback((dropStart: number) => {
    stopProgressTracking();
    console.log('Starting progress tracking from drop start:', dropStart);
    progressInterval.current = setInterval(() => {
      let currentTime = 0;
      if (youtubePlayer && getPlayerState() === YT_PLAYER_STATES.PLAYING) {
        currentTime = getCurrentTime(); // in ms
        // Fallback: use youtubePlayer.getCurrentTime() if getCurrentTime() returns 0
        if (!currentTime && youtubePlayer.getCurrentTime) {
          currentTime = youtubePlayer.getCurrentTime() * 1000;
        }
        const progress = Math.max(0, currentTime - dropStart);
        console.log('[ProgressTracking] currentTime:', currentTime, 'progress:', progress, 'playerState:', getPlayerState());
        setPlayerState(prev => ({
          ...prev,
          progress: progress,
        }));
        // Check if we've reached the end of our preview
        if (progress >= playerState.previewLength) {
          console.log('Preview length reached, moving to next track');
          nextTrack();
        }
      } else {
        // Not playing, do not update progress
        // Optionally, log for debugging
        // console.log('[ProgressTracking] Not playing or player not ready');
      }
    }, 500);
  }, [youtubePlayer, playerState.previewLength, nextTrack]);

  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  const play = useCallback(() => {
    console.log('Play button pressed');
    if (youtubePlayer) {
      youtubePlayer.playVideo();
    } else if (playerState.currentTrack) {
      playTrack(playerState.currentTrack, playerState.currentTrackIndex);
    }
  }, [youtubePlayer, playerState.currentTrack, playerState.currentTrackIndex, playTrack]);

  const pause = useCallback(() => {
    console.log('Pause button pressed');
    if (youtubePlayer) {
      pausePlayer();
    }
    
    if (previewTimeout.current) {
      clearTimeout(previewTimeout.current);
      previewTimeout.current = null;
    }
  }, [youtubePlayer]);

  const nextTrack = useCallback(() => {
    console.log('Moving to next track');
    const nextIndex = playerState.currentTrackIndex + 1;
    if (nextIndex < playerState.queue.length) {
      const nextTrack = playerState.queue[nextIndex];
      playTrack(nextTrack, nextIndex);
    } else {
      // End of queue
      console.log('End of queue reached');
      setPlayerState(prev => ({
        ...prev,
        isPlaying: false,
        progress: 0,
      }));
      stopProgressTracking();
      if (previewTimeout.current) {
        clearTimeout(previewTimeout.current);
        previewTimeout.current = null;
      }
    }
  }, [playerState.currentTrackIndex, playerState.queue, playTrack, stopProgressTracking]);

  const previousTrack = useCallback(() => {
    console.log('Moving to previous track');
    const prevIndex = playerState.currentTrackIndex - 1;
    if (prevIndex >= 0) {
      const prevTrack = playerState.queue[prevIndex];
      playTrack(prevTrack, prevIndex);
    }
  }, [playerState.currentTrackIndex, playerState.queue, playTrack]);

  const setPreviewLength = useCallback((length: number) => {
    console.log('Setting preview length to:', length);
    setPlayerState(prev => ({
      ...prev,
      previewLength: length,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Cleaning up player...');
      stopProgressTracking();
      if (previewTimeout.current) {
        clearTimeout(previewTimeout.current);
      }
      if (youtubePlayer) {
        destroyPlayer();
      }
    };
  }, [stopProgressTracking, youtubePlayer]);

  // Auto-start first track when queue is set
  useEffect(() => {
    if (playerState.queue.length > 0 && !playerState.currentTrack && isYouTubeReady) {
      console.log('Auto-starting first track in queue');
      const firstTrack = playerState.queue[0];
      playTrack(firstTrack, 0);
    }
  }, [playerState.queue, playerState.currentTrack, isYouTubeReady, playTrack]);

  // Live update drop point and playback when previewLength changes
  useEffect(() => {
    async function updateDropLive() {
      if (playerState.currentTrack) {
        const dropAnalysis = await detectDrop(
          playerState.currentTrack,
          3,
          playerState.previewLength
        );
        setPlayerState(prev => ({
          ...prev,
          dropAnalysis,
        }));
        // If currently playing, jump to new drop point
        if (playerState.isPlaying && youtubePlayer) {
          playFromTime(dropAnalysis.dropStart);
        }
      }
    }
    updateDropLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerState.previewLength]);

  return {
    playerState,
    setQueue,
    play,
    pause,
    nextTrack,
    previousTrack,
    setPreviewLength,
    playTrack,
  };
}