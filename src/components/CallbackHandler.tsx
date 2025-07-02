import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { exchangeCodeForToken } from '../utils/spotify';

export function CallbackHandler() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state');

        if (error) {
          console.error('Spotify auth error:', error);
          setStatus('error');
          setError(`Authentication failed: ${error}`);
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
          return;
        }

        if (!code) {
          setStatus('error');
          setError('No authorization code received');
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
          return;
        }

        setStatus('loading');
        await exchangeCodeForToken(code);
        setStatus('success');
        
        // Redirect to home page after successful authentication
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
        
      } catch (err) {
        console.error('Token exchange failed:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
      <motion.div 
        className="text-center max-w-md mx-auto px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Connecting to Spotify</h2>
            <p className="text-gray-400">Please wait while we authenticate your account...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <motion.div
              className="w-16 h-16 bg-[#1DB954] rounded-full flex items-center justify-center mx-auto mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">Successfully Connected!</h2>
            <p className="text-gray-400">Redirecting you to the app...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <motion.div
              className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">Authentication Failed</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <p className="text-sm text-gray-500">Redirecting you back to the home page...</p>
          </>
        )}
      </motion.div>
    </div>
  );
}