# 🎵 Drop Skimmer

A production-ready web application that intelligently "power-skims" Spotify playlists by automatically detecting and playing the most exciting parts (drops) of each track.

## ✨ Features

- **🔐 Spotify Authentication**: Secure OAuth2 PKCE flow integration
- **🎯 Smart Drop Detection**: Advanced audio analysis using Spotify's Audio Analysis API
- **▶️ YouTube Playback**: Seamless playback using YouTube Data API v3 and YouTube IFrame Player API
- **⚡ Auto-Skip**: Customizable preview lengths with automatic track progression
- **💾 Intelligent Caching**: IndexedDB storage for analysis results to avoid re-processing
- **🎚️ Adjustable Settings**: Fine-tune loudness thresholds and preview durations
- **📱 Responsive Design**: Beautiful, mobile-first UI with smooth animations
- **🌊 Real-time Progress**: Visual feedback with progress indicators and waveform hints

## 🚀 Quick Start

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd drop-skimmer
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Add your Spotify App credentials:
   ```env
   VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/callback
   ```

3. **Configure Spotify App**:
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app or use existing one
   - Add `http://localhost:5173/callback` to Redirect URIs
   - Copy Client ID to `.env` file

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Open in browser**: Visit `http://localhost:5173`

## 🔧 How It Works

### Drop Detection Algorithm

The app uses a sophisticated multi-layered approach to find the perfect "drop" moment in each track:

1. **Sections Analysis**: Examines Spotify's audio sections for tempo and loudness patterns
2. **Segments Analysis**: Analyzes individual segments for sudden energy spikes
3. **Heuristic Scoring**: Combines multiple factors:
   - Loudness jumps and peaks
   - Tempo confidence scores
   - Track position (typically 20-50% into the song)
   - Timbral characteristics (brightness, energy)

### Caching Strategy

- Analysis results are cached locally using IndexedDB
- Cache expires after 7 days to balance performance and freshness
- Reduces API calls and improves user experience

### Playback Strategy

- Primary: YouTube Data API v3, YouTube IFrame Player API
- Fallback: Spotify Web Playback SDK for premium users (when available)
- Automatic video search using artist and track name

## 🎮 Usage

1. **Connect Spotify**: Click "Connect Spotify" and authorize the app
2. **Select Playlist**: Choose from your Spotify playlists
3. **Auto-Play**: The app automatically analyzes tracks and starts playing from detected drops
4. **Customize**: Adjust preview length (10-45s) and drop sensitivity
5. **Enjoy**: Sit back and experience your playlist's best moments

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Framer Motion** for smooth animations
- **Tailwind CSS** for responsive styling
- **Custom Hooks** for state management

### APIs & Services
- **Spotify Web API** for playlist and audio analysis data
- **YouTube Data API v3 + YouTube IFrame Player API** for audio playback
- **IndexedDB** for local caching

### Key Components
- `useSpotify` - Handles authentication and API calls
- `usePlayer` - Manages playback state and controls
- `dropDetection` - Core algorithm for finding optimal play points
- `youtube` - YouTube player integration

## 🔐 Privacy & Compliance

- **No Audio Storage**: Only metadata and analysis results are cached
- **Spotify ToS Compliant**: Uses official APIs within rate limits
- **YouTube ToS Compliant**: Leverages IFrame Player API as intended
- **Minimal Permissions**: Only requests necessary Spotify scopes

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── components/         # React components
├── hooks/             # Custom React hooks  
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
│   ├── spotify.ts     # Spotify API integration
│   ├── dropDetection.ts # Drop detection algorithm
│   └── youtube.ts     # YouTube player integration
└── App.tsx           # Main application component
```

## 🚀 Deployment

The app is designed for easy deployment to modern hosting platforms:

- **Vercel/Netlify**: Deploy directly from Git repository
- **Environment Variables**: Configure Spotify credentials in platform settings
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Production Considerations

1. **Update Redirect URI**: Change to your production domain
2. **Enable HTTPS**: Required for Spotify OAuth
3. **Rate Limiting**: Implement API rate limiting for production scale
4. **Error Monitoring**: Add error tracking (Sentry, etc.)

## 📊 Performance

- **Fast Initial Load**: Lazy loading and code splitting
- **Efficient Caching**: Reduces redundant API calls
- **Smooth Animations**: 60fps animations with Framer Motion
- **Responsive Design**: Optimized for all device sizes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Resources

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api/)
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
- [Spotify Audio Analysis](https://developer.spotify.com/documentation/web-api/reference/#/operations/get-audio-analysis)

---

Built with ❤️ using React, TypeScript, and the power of music data.
