import { useState, useEffect, useCallback } from 'react';
import { SpotifyUser, SpotifyPlaylist, SpotifyTrack } from '../types';
import { spotifyApiCall, isAuthenticated } from '../utils/spotify';

export function useSpotify() {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!isAuthenticated()) return;
    
    try {
      setLoading(true);
      setError(null);
      const userData = await spotifyApiCall('/me');
      setUser(userData);
    } catch (err) {
      setError('Failed to fetch user data');
      console.error('Failed to fetch user:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlaylists = useCallback(async () => {
    if (!isAuthenticated()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch user's playlists with pagination
      let allPlaylists: SpotifyPlaylist[] = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;
      
      while (hasMore) {
        const response = await spotifyApiCall(`/me/playlists?limit=${limit}&offset=${offset}`);
        allPlaylists = [...allPlaylists, ...response.items];
        hasMore = response.items.length === limit;
        offset += limit;
      }
      
      setPlaylists(allPlaylists);
    } catch (err) {
      setError('Failed to fetch playlists');
      console.error('Failed to fetch playlists:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlaylistTracks = useCallback(async (playlistId: string): Promise<SpotifyTrack[]> => {
    if (!isAuthenticated()) throw new Error('Not authenticated');
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch playlist tracks with pagination
      let allTracks: SpotifyTrack[] = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;
      
      while (hasMore) {
        const response = await spotifyApiCall(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}&fields=items(track(id,name,artists,album,duration_ms,uri,preview_url))`);
        
        const tracks = response.items
          .filter((item: any) => item.track && item.track.id) // Filter out local tracks and nulls
          .map((item: any) => item.track);
          
        allTracks = [...allTracks, ...tracks];
        hasMore = response.items.length === limit;
        offset += limit;
      }
      
      return allTracks;
    } catch (err) {
      setError('Failed to fetch playlist tracks');
      console.error('Failed to fetch playlist tracks:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchTracks = useCallback(async (query: string, limit = 20): Promise<SpotifyTrack[]> => {
    if (!isAuthenticated()) throw new Error('Not authenticated');
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await spotifyApiCall(`/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`);
      return response.tracks.items;
    } catch (err) {
      setError('Failed to search tracks');
      console.error('Failed to search tracks:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated()) {
      fetchUser();
      fetchPlaylists();
    }
  }, [fetchUser, fetchPlaylists]);

  return {
    user,
    playlists,
    loading,
    error,
    fetchUser,
    fetchPlaylists,
    fetchPlaylistTracks,
    searchTracks,
    isAuthenticated: isAuthenticated(),
  };
}