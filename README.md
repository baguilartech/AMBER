# Amber Discord Music Bot

A self-hosted Discord music bot with multi-platform streaming support. Stream music from YouTube, Spotify, and SoundCloud with a containerized deployment.

## Features

- 🎵 **Multi-Platform Support**: YouTube, Spotify, and SoundCloud
- 🐳 **Docker Ready**: Easy containerized deployment
- 🎛️ **Queue Management**: Full queue control with skip, pause, resume
- 🔊 **Volume Control**: Adjustable volume levels
- 🌐 **Self-Hosted**: Complete control over your bot instance
- 📊 **Rich Embeds**: Beautiful song information displays
- 🎯 **Slash Commands**: Modern Discord slash command interface
- 🔄 **Auto-Disconnect**: Automatically leaves empty voice channels
- 🎨 **TypeScript**: Full TypeScript support with strict typing

## Quick Start

### Prerequisites

- Node.js 20.18.1+ (for local development)
- Docker & Docker Compose (for containerized deployment)
- Discord Bot Token
- YouTube Data API v3 Key
- Spotify API Credentials

### Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Fill in your API credentials in `.env`:
```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here

# YouTube API Configuration
YOUTUBE_API_KEY=your_youtube_api_key_here

# Spotify API Configuration
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# SoundCloud Configuration (Optional)
SOUNDCLOUD_CLIENT_ID=your_soundcloud_client_id_here

# Bot Configuration
BOT_PREFIX=!
MAX_QUEUE_SIZE=100
DEFAULT_VOLUME=0.5
AUTO_LEAVE_TIMEOUT=300000

# Development
NODE_ENV=production
LOG_LEVEL=info
```

### Docker Deployment (Recommended)

1. Build and start the container:
```bash
docker-compose up -d
```

2. View logs:
```bash
docker-compose logs -f
```

3. Stop the bot:
```bash
docker-compose down
```

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Start the bot:
```bash
npm start
```

For development with hot reload:
```bash
npm run dev
```

## API Setup Guide

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the token and client ID
5. Enable required intents: Server Members Intent, Message Content Intent
6. Generate invite link with permissions: `Send Messages`, `Use Slash Commands`, `Connect`, `Speak`

### YouTube API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable YouTube Data API v3
4. Create credentials (API Key)
5. Restrict the API key to YouTube Data API v3 (recommended)

### Spotify API Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Copy Client ID and Client Secret
4. No redirect URI needed for this bot

### SoundCloud API Setup (Optional)

1. Go to [SoundCloud Developers](https://developers.soundcloud.com/)
2. Register your application
3. Copy the Client ID

## Commands

| Command | Description |
|---------|-------------|
| `/play <query>` | Play a song or add to queue |
| `/queue` | Show current queue |
| `/skip` | Skip current song |
| `/stop` | Stop music and clear queue |
| `/pause` | Pause current song |
| `/resume` | Resume paused song |
| `/volume <0-100>` | Set volume level |
| `/nowplaying` | Show current song info |

### Command Features

- **Play Command**: Supports URLs from YouTube, Spotify, and SoundCloud
- **Queue Management**: Automatic queue advancement and shuffle support
- **Volume Control**: Real-time volume adjustment (0-100%)
- **Rich Embeds**: Beautiful song information with thumbnails and metadata

## Configuration

The bot can be configured through environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `BOT_PREFIX` | `!` | Command prefix (legacy) |
| `MAX_QUEUE_SIZE` | `100` | Maximum songs in queue |
| `DEFAULT_VOLUME` | `0.5` | Default volume (0.0-1.0) |
| `AUTO_LEAVE_TIMEOUT` | `300000` | Auto-leave timeout (ms) |
| `LOG_LEVEL` | `info` | Logging level (error, warn, info, debug) |
| `NODE_ENV` | `production` | Environment mode |

## Docker Configuration

The included `docker-compose.yml` provides:

- Resource limits (512MB RAM, 0.5 CPU)
- Volume persistence for data and logs
- Automatic restart policy
- Health checks
- Non-root user security

### Customizing Docker Deployment

Edit `docker-compose.yml` to adjust:

- Resource limits
- Volume mounts
- Network configuration
- Environment variables

## Architecture

```
src/
├── commands/        # Slash commands
│   ├── baseCommand.ts
│   ├── play.ts
│   ├── queue.ts
│   ├── skip.ts
│   ├── stop.ts
│   ├── pause.ts
│   ├── resume.ts
│   ├── volume.ts
│   └── nowplaying.ts
├── services/        # Core services
│   ├── baseMusicService.ts
│   ├── musicPlayer.ts
│   ├── queueManager.ts
│   ├── serviceFactory.ts
│   ├── youtubeService.ts
│   ├── spotifyService.ts
│   └── soundcloudService.ts
├── utils/          # Utilities
│   ├── commandRegistry.ts
│   ├── config.ts
│   ├── errorHandler.ts
│   ├── formatters.ts
│   ├── logger.ts
│   └── urlValidator.ts
├── types/          # TypeScript types
│   └── index.ts
└── index.ts        # Main bot file
```

## Development

### Available Scripts

- `npm run build` - Build the TypeScript project
- `npm start` - Start the production bot
- `npm run dev` - Start with hot reload for development
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Testing

The project includes comprehensive tests for all components:
- Command tests
- Service tests
- Utility tests
- Type tests

Run tests with:
```bash
npm test
```

## Troubleshooting

### Common Issues

1. **Bot not responding**: Check bot permissions in Discord server
2. **No audio**: Ensure bot has voice channel permissions
3. **API errors**: Verify API keys and quotas
4. **Docker issues**: Check container logs with `docker-compose logs`
5. **TypeScript errors**: Run `npm run build` to check for compilation issues

### Debug Mode

Set `LOG_LEVEL=debug` in your `.env` file for verbose logging.

### Health Checks

The Docker container includes health checks. Monitor with:
```bash
docker-compose ps
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with `npm test`
5. Ensure code passes linting with `npm run lint`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review Docker logs
- Verify API credentials and permissions
- Ensure all required environment variables are set
- Check the test suite for usage examples

## Performance Notes

- The bot automatically disconnects when voice channels are empty
- Queues are limited to prevent memory issues
- Audio streams are optimized for quality and performance
- Resource usage is monitored and limited in Docker
- TypeScript compilation optimizes runtime performance

## Security

- API keys are stored as environment variables
- Docker container runs as non-root user
- No sensitive data is logged
- All external API calls are validated
- Input validation on all user commands
- Error handling prevents information leakage