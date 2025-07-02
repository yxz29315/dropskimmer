import React from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Settings,
  Zap,
  Clock,
  AlertCircle,
  Volume2
} from 'lucide-react';
import { PlayerState } from '../types';

interface PlayerProps {
  playerState: PlayerState;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onPreviewLengthChange: (length: number) => void;
}

export function Player({
  playerState,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onPreviewLengthChange,
}: PlayerProps) {
  const { 
    isPlaying, 
    currentTrack, 
    progress, 
    previewLength, 
    dropAnalysis,
    currentTrackIndex,
    queue
  } = playerState;

  const progressPercentage = (progress / previewLength) * 100;

  if (!currentTrack) {
    return (
      <motion.div
        className="bg-gray-900/80 backdrop-blur-sm rounded-xl p-8 text-center border border-gray-700/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-gray-600" />
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">Ready to Skim</h3>
            <p className="text-gray-400">Select a playlist to start power-skimming through the best parts</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Hidden YouTube Player */}
      <div id="youtube-player" className="hidden"></div>
      
      {/* Track Info */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <img
            src={currentTrack.album.images[0]?.url || '/api/placeholder/80/80'}
            alt={currentTrack.album.name}
            className="w-20 h-20 rounded-lg shadow-lg"
          />
          {isPlaying && (
            <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
              <motion.div 
                className="w-3 h-3 bg-[#1DB954] rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate text-lg">
            {currentTrack.name}
          </h3>
          <p className="text-gray-400 truncate">
            {currentTrack.artists.map(a => a.name).join(', ')}
          </p>
          <p className="text-gray-500 text-sm truncate">
            {currentTrack.album.name}
          </p>
          
          {/* Drop Analysis Info */}
          <div className="flex items-center gap-4 mt-2">
            {dropAnalysis && (
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-yellow-500" />
                <span className="text-xs text-yellow-500">
                  Drop at {Math.floor(dropAnalysis.dropStart / 1000)}s 
                  ({Math.floor(dropAnalysis.confidence * 100)}% confidence)
                </span>
              </div>
            )}
            {!dropAnalysis && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3 h-3 text-orange-500" />
                <span className="text-xs text-orange-500">Analyzing track...</span>
              </div>
            )}
            
            {/* Track position in queue */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {currentTrackIndex + 1} of {queue.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
          <span>{Math.floor(progress / 1000)}s</span>
          <span className="text-xs">
            {dropAnalysis ? `Drop Preview (${Math.floor(previewLength / 1000)}s)` : 'Loading...'}
          </span>
          <span>{Math.floor(previewLength / 1000)}s</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] h-3 rounded-full relative"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
            transition={{ duration: 0.1 }}
          >
            {/* Pulse effect when playing */}
            {isPlaying && (
              <motion.div
                className="absolute inset-0 bg-white/20 rounded-full"
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 mb-6">
        <motion.button
          onClick={onPrevious}
          className="p-3 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          disabled={currentTrackIndex === 0}
        >
          <SkipBack className="w-6 h-6" />
        </motion.button>

        <motion.button
          onClick={isPlaying ? onPause : onPlay}
          className="p-4 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-full shadow-lg disabled:opacity-50 relative overflow-hidden"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={!currentTrack}
        >
          {isPlaying && (
            <motion.div
              className="absolute inset-0 bg-white/10 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          {isPlaying ? (
            <Pause className="w-7 h-7" />
          ) : (
            <Play className="w-7 h-7 ml-0.5" />
          )}
        </motion.button>

        <motion.button
          onClick={onNext}
          className="p-3 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          disabled={currentTrackIndex >= queue.length - 1}
        >
          <SkipForward className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Settings */}
      <div className="space-y-4 border-t border-gray-700 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Playback Settings</span>
        </div>

        {/* Preview Length Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">Preview Length</span>
            </div>
            <span className="text-sm text-[#1DB954] font-medium">{previewLength / 1000}s</span>
          </div>
          <input
            type="range"
            min="10000"
            max="45000"
            step="5000"
            value={previewLength}
            onChange={(e) => onPreviewLengthChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>10s</span>
            <span>45s</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}