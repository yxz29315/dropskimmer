import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Music, Github } from 'lucide-react';
import { AuthButton } from './components/AuthButton';
import { PlaylistSelector } from './components/PlaylistSelector'; 
import { Player } from './components/Player';
import { TrackQueue } from './components/TrackQueue';
import { CallbackHandler } from './components/CallbackHandler';
import { useSpotify } from './hooks/useSpotify';
import { usePlayer } from './hooks/usePlayer';
import { SpotifyTrack } from './types';

function App() {
  const [currentView, setCurrentView] = useState<'playlists' | 'player'>('playlists');
  
  // Check if this is the callback page
  if (window.location.pathname === '/callback') {
    return <CallbackHandler />;
  }

  const {
    user,
    playlists,
    loading,
    error,
    fetchPlaylistTracks,
    isAuthenticated,
  } = useSpotify();

  const {
    playerState,
    setQueue,
    play,
    pause,
    nextTrack,
    previousTrack,
    setPreviewLength,
    setLoudnessThreshold,
    playTrack,
  } = usePlayer();

  const handlePlaylistSelect = (tracks: SpotifyTrack[]) => {
    setQueue(tracks);
    setCurrentView('player');
  };

  const handleTrackSelect = (track: SpotifyTrack, index: number) => {
    playTrack(track, index);
  };

  const handleBackToPlaylists = () => {
    pause();
    setCurrentView('playlists');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-green-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-gray-800/50 bg-gray-900/20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <motion.div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={handleBackToPlaylists}
                whileHover={{ scale: 1.02 }}
              >
                <div className="p-2 bg-gradient-to-r from-[#1DB954] to-[#1ed760] rounded-xl">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Drop Skimmer</h1>
                  <p className="text-xs text-gray-400">Power-skim your playlists</p>
                </div>
              </motion.div>

              <div className="flex items-center gap-4">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Github className="w-5 h-5" />
                </a>
                <AuthButton isAuthenticated={isAuthenticated} user={user} />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!isAuthenticated ? (
            /* Welcome Screen */
            <motion.div 
              className="text-center py-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                className="inline-flex p-4 bg-gradient-to-r from-[#1DB954]/20 to-purple-500/20 rounded-2xl mb-8"
                animate={{ 
                  boxShadow: [
                    '0 0 20px rgba(29, 185, 84, 0.3)',
                    '0 0 40px rgba(29, 185, 84, 0.1)',
                    '0 0 20px rgba(29, 185, 84, 0.3)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="w-16 h-16 text-[#1DB954]" />
              </motion.div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                Drop Skimmer
              </h1>
              
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Automatically find and play the most exciting parts of your Spotify playlists. 
                Skip to the drop, feel the energy, move to the next track.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12 text-left">
                <motion.div 
                  className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                >
                  <Music className="w-8 h-8 text-[#1DB954] mb-4" />
                  <h3 className="text-white font-semibold mb-2">Smart Detection</h3>
                  <p className="text-gray-400 text-sm">
                    Algorithmic analysis finds the perfect drop point in each track using Spotify's audio data
                  </p>
                </motion.div>
                
                <motion.div 
                  className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  <Zap className="w-8 h-8 text-purple-500 mb-4" />
                  <h3 className="text-white font-semibold mb-2">Auto-Skip</h3>
                  <p className="text-gray-400 text-sm">
                    Automatically moves to the next track after your chosen preview length
                  </p>
                </motion.div>
                
                <motion.div 
                  className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                >
                  <Music className="w-8 h-8 text-blue-500 mb-4" />
                  <h3 className="text-white font-semibold mb-2">Your Playlists</h3>
                  <p className="text-gray-400 text-sm">
                    Works with all your Spotify playlists - just connect and start skimming
                  </p>
                </motion.div>
              </div>
              
              <AuthButton isAuthenticated={isAuthenticated} user={user} />
            </motion.div>
          ) : (
            /* Authenticated Content */
            <AnimatePresence mode="wait">
              {currentView === 'playlists' ? (
                <motion.div
                  key="playlists"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <PlaylistSelector
                    playlists={playlists}
                    onPlaylistSelect={handlePlaylistSelect}
                    fetchPlaylistTracks={fetchPlaylistTracks}
                    loading={loading}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="player"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                  <div className="lg:col-span-2">
                    <Player
                      playerState={playerState}
                      onPlay={play}
                      onPause={pause}
                      onNext={nextTrack}
                      onPrevious={previousTrack}
                      onPreviewLengthChange={setPreviewLength}
                      onLoudnessThresholdChange={setLoudnessThreshold}
                    />
                  </div>
                  
                  <div>
                    <TrackQueue
                      tracks={playerState.queue}
                      currentTrackIndex={playerState.currentTrackIndex}
                      onTrackSelect={handleTrackSelect}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {error && (
            <motion.div
              className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              {error}
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;