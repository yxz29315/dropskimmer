// Spotify Web API utilities with PKCE authentication

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Generate code verifier and challenge for PKCE
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\//g, '_')
    .replace(/\+/g, '-')
    .replace(/=/g, '');
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
    .replace(/\//g, '_')
    .replace(/\+/g, '-')
    .replace(/=/g, '');
}

export async function getSpotifyAuthUrl(): Promise<string> {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
  const scope = 'playlist-read-private playlist-read-collaborative user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state';
  
  if (!clientId || !redirectUri) {
    throw new Error('Spotify client ID or redirect URI not configured');
  }
  
  const codeVerifier = generateCodeVerifier();
  sessionStorage.setItem('spotify_code_verifier', codeVerifier);
  
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scope,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state: generateCodeVerifier().substring(0, 16)
  });
  
  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<any> {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
  const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
  
  if (!codeVerifier) {
    throw new Error('Code verifier not found');
  }
  
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Token exchange failed:', errorData);
    throw new Error(`Failed to exchange code for token: ${response.status}`);
  }
  
  const tokenData = await response.json();
  
  // Store tokens
  localStorage.setItem('spotify_access_token', tokenData.access_token);
  if (tokenData.refresh_token) {
    localStorage.setItem('spotify_refresh_token', tokenData.refresh_token);
  }
  localStorage.setItem('spotify_token_expires', (Date.now() + tokenData.expires_in * 1000).toString());
  
  // Clear the code verifier
  sessionStorage.removeItem('spotify_code_verifier');
  
  return tokenData;
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });
  
  if (!response.ok) {
    console.error('Failed to refresh token, clearing stored tokens');
    logout();
    throw new Error('Failed to refresh token');
  }
  
  const tokenData = await response.json();
  
  localStorage.setItem('spotify_access_token', tokenData.access_token);
  localStorage.setItem('spotify_token_expires', (Date.now() + tokenData.expires_in * 1000).toString());
  
  // Update refresh token if provided
  if (tokenData.refresh_token) {
    localStorage.setItem('spotify_refresh_token', tokenData.refresh_token);
  }
  
  return tokenData.access_token;
}

export async function getValidAccessToken(): Promise<string> {
  const accessToken = localStorage.getItem('spotify_access_token');
  const tokenExpires = localStorage.getItem('spotify_token_expires');
  
  if (!accessToken || !tokenExpires) {
    throw new Error('No access token available');
  }
  
  if (Date.now() >= parseInt(tokenExpires)) {
    return await refreshAccessToken();
  }
  
  return accessToken;
}

export async function spotifyApiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
  try {
    const accessToken = await getValidAccessToken();
    
    const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh
        try {
          const newToken = await refreshAccessToken();
          const retryResponse = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
            ...options,
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json',
              ...options.headers,
            },
          });
          
          if (!retryResponse.ok) {
            throw new Error(`Spotify API error: ${retryResponse.status}`);
          }
          
          return await retryResponse.json();
        } catch (refreshError) {
          logout();
          throw new Error('Authentication failed. Please log in again.');
        }
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Spotify API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Spotify API call failed:', error);
    throw error;
  }
}

export function isAuthenticated(): boolean {
  const accessToken = localStorage.getItem('spotify_access_token');
  const tokenExpires = localStorage.getItem('spotify_token_expires');
  
  return !!(accessToken && tokenExpires && Date.now() < parseInt(tokenExpires));
}

export function logout(): void {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expires');
  sessionStorage.removeItem('spotify_code_verifier');
}