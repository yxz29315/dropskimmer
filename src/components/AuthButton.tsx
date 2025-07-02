import React from 'react';
import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import { getSpotifyAuthUrl, logout } from '../utils/spotify';

interface AuthButtonProps {
  isAuthenticated: boolean;
  user?: any;
}

export function AuthButton({ isAuthenticated, user }: AuthButtonProps) {
  const handleLogin = async () => {
    try {
      const authUrl = await getSpotifyAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get auth URL:', error);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  if (isAuthenticated && user) {
    return (
      <motion.div 
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          {user.images?.[0]?.url && (
            <img 
              src={user.images[0].url} 
              alt={user.display_name}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-white font-medium">{user.display_name}</span>
        </div>
        <motion.button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Logout
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.button
      onClick={handleLogin}
      className="flex items-center gap-2 px-6 py-3 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-full font-semibold transition-colors shadow-lg"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Music className="w-5 h-5" />
      Connect Spotify
    </motion.button>
  );
}