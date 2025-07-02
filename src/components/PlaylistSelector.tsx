import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, Users, Clock } from 'lucide-react';
import { SpotifyPlaylist, SpotifyTrack } from '../types';

interface PlaylistSelectorProps {
  playlists: SpotifyPlaylist[];
  onPlaylistSelect: (tracks: SpotifyTrack[]) => void;
  fetchPlaylistTracks: (playlistId: string) => Promise<SpotifyTrack[]>;
  loading?: boolean;
}

export function PlaylistSelector({ 
  playlists, 
  onPlaylistSelect, 
  fetchPlaylistTracks, 
  loading 
}: PlaylistSelectorProps) {
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [loadingTracks, setLoadingTracks] = useState(false);

  const handlePlaylistClick = async (playlist: SpotifyPlaylist) => {
    try {
      setSelectedPlaylist(playlist.id);
      setLoadingTracks(true);
      
      const tracks = await fetchPlaylistTracks(playlist.id);
      onPlaylistSelect(tracks);
    } catch (error) {
      console.error('Failed to load playlist tracks:', error);
    } finally {
      setLoadingTracks(false);
      setSelectedPlaylist(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-xl p-4 animate-pulse">
            <div className="w-full aspect-square bg-gray-700 rounded-lg mb-3"></div>
            <div className="h-4 bg-gray-700 rounded mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Select a Playlist</h2>
        <p className="text-gray-400">Choose a playlist to power-skim through the best parts</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {playlists.map((playlist) => (
            <motion.div
              key={playlist.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 hover:bg-gray-700/50 transition-all cursor-pointer group border border-gray-700/50"
              onClick={() => handlePlaylistClick(playlist)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative mb-3">
                <img
                  src={playlist.images[0]?.url || '/api/placeholder/300/300'}
                  alt={playlist.name}
                  className="w-full aspect-square object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  {selectedPlaylist === playlist.id && loadingTracks ? (
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <PlayCircle className="w-12 h-12 text-white" />
                  )}
                </div>
              </div>
              
              <h3 className="font-semibold text-white mb-1 line-clamp-2">
                {playlist.name}
              </h3>
              
              <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                {playlist.description || `By ${playlist.owner.display_name}`}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {playlist.owner.display_name}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {playlist.tracks.total} tracks
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}