# Installation Guide

## Prerequisites

- Node.js 20 or higher (latest LTS recommended)
- npm or yarn
- Discord Bot Token
- Music Service API Keys:
  - YouTube Data API v3 Key
  - Spotify Client ID & Secret
  - SoundCloud Client ID (optional)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd amber
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your configuration:
   ```env
   # Discord Bot Configuration
   DISCORD_TOKEN=your_discord_bot_token
   DISCORD_CLIENT_ID=your_discord_client_id
   
   # YouTube API Configuration
   YOUTUBE_API_KEY=your_youtube_api_key
   
   # Spotify API Configuration
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   
   # SoundCloud Configuration (Optional)
   SOUNDCLOUD_CLIENT_ID=your_soundcloud_client_id
   
   # Bot Configuration
   MAX_QUEUE_SIZE=100
   DEFAULT_VOLUME=0.5
   AUTO_LEAVE_TIMEOUT=300000
   LOG_LEVEL=info
   
   # Monitoring & Observability (Optional)
   PROMETHEUS_PORT=5150
   SENTRY_DSN=your_sentry_dsn_here
   SENTRY_ENVIRONMENT=production
   ELK_HOST=your_elk_host
   ELK_PORT=8080
   ```

### 4. Build the Bot

```bash
npm run build
```

### 5. Start the Bot

```bash
npm start
```

## Docker Installation

### Using Docker Compose

```bash
docker-compose up -d
```

### Manual Docker Build

```bash
docker build -t amber .
docker run -d --env-file .env amber
```

## Kubernetes Installation

### Prerequisites
- Kubernetes cluster (1.19+)
- kubectl configured
- Required environment variables set

### Deploy to Kubernetes

```bash
cd k8s
./deploy.sh
```

For detailed Kubernetes deployment instructions, see [Kubernetes Deployment Guide](Kubernetes).

## Creating a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section
4. Create a bot and copy the token

## Inviting the Bot

1. Go to the "OAuth2" > "URL Generator" section
2. Select "bot" and "applications.commands" scopes
3. Select the required permissions:
   - Send Messages
   - Use Slash Commands
   - Connect
   - Speak
   - Use Voice Activity
4. Use the generated URL to invite the bot to your server

## Next Steps

- Configure your bot settings in [Configuration](Configuration)
- Learn about available commands in [Commands Reference](WCommands)
- Set up music service integrations for YouTube, Spotify, and SoundCloud

## Performance & Monitoring Features

Amber includes several performance optimizations and monitoring capabilities:

### Performance Optimizations
- **Prebuffering System**: Automatically prepares next songs for instant playback
- **Parallel Search**: Multiple search strategies run simultaneously for faster results
- **Smart Caching**: LRU cache with automatic cleanup for optimal memory usage
- **Queue Optimization**: 95% improvement in song transition times

### Monitoring & Observability
- **Prometheus Metrics**: Real-time performance metrics at `/metrics` endpoint
- **Sentry Integration**: Automatic error tracking with 100% transaction capture
- **ELK Stack Support**: Available via Filebeat sidecar in Kubernetes deployments
- **Health Endpoints**: `/health` endpoint for container health checks