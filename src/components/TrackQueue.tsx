import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, Play } from 'lucide-react';
import { SpotifyTrack } from '../types';

interface TrackQueueProps {
  tracks: SpotifyTrack[];
  currentTrackIndex: number;
  onTrackSelect: (track: SpotifyTrack, index: number) => void;
}

export function TrackQueue({ tracks, currentTrackIndex, onTrackSelect }: TrackQueueProps) {
  if (tracks.length === 0) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 text-center">
        <p className="text-gray-400">No tracks in queue</p>
      </div>
    );
  }

  return (
    <motion.div
      className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-[#1DB954] rounded-full animate-pulse"></div>
        <h3 className="text-white font-semibold">Queue ({tracks.length} tracks)</h3>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
        <AnimatePresence>
          {tracks.map((track, index) => (
            <motion.div
              key={track.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: index * 0.02 }}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all group ${
                index === currentTrackIndex
                  ? 'bg-[#1DB954]/20 border border-[#1DB954]/50'
                  : 'hover:bg-gray-800/50'
              }`}
              onClick={() => onTrackSelect(track, index)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="relative">
                <img
                  src={track.album.images[2]?.url || track.album.images[0]?.url || '/api/placeholder/40/40'}
                  alt={track.album.name}
                  className="w-10 h-10 rounded object-cover"
                />
                {index === currentTrackIndex && (
                  <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#1DB954] rounded-full animate-pulse"></div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h4 className={`font-medium truncate ${
                  index === currentTrackIndex ? 'text-[#1DB954]' : 'text-white'
                }`}>
                  {track.name}
                </h4>
                <p className="text-sm text-gray-400 truncate">
                  {track.artists.map(a => a.name).join(', ')}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{Math.floor(track.duration_ms / 60000)}:{String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}</span>
              </div>

              {index < currentTrackIndex && (
                <div className="flex items-center gap-1 text-xs text-[#1DB954]">
                  <Zap className="w-3 h-3" />
                  <span>Played</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}