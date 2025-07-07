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
- 🔍 **Intelligent Search**: Enhanced YouTube search with official channel prioritization
- 🛡️ **Security**: Automated vulnerability scanning and dependency management
- 🧪 **100% Test Coverage**: Comprehensive test suite with perfect coverage

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
5. Generate invite link with permissions: `Send Messages`, `Use Slash Commands`, `Connect`, `Speak`

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

- **Play Command**: Supports URLs from YouTube, Spotify, and SoundCloud with intelligent search
- **Queue Management**: Automatic queue advancement and shuffle support
- **Volume Control**: Real-time volume adjustment (0-100%)
- **Rich Embeds**: Beautiful song information with thumbnails and metadata
- **Enhanced Search**: YouTube searches prioritize official channels (VEVO, major labels)
- **Cross-Platform Fallback**: Automatic fallback between streaming services

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

Amber follows a modular, layered architecture with clear separation of concerns:

```
src/
├── commands/        # Discord slash commands
│   ├── baseCommand.ts      # Base command class with common functionality
│   ├── play.ts            # Play music from URL or search
│   ├── queue.ts           # Display and manage queue
│   ├── skip.ts            # Skip current song
│   ├── stop.ts            # Stop playback and clear queue
│   ├── pause.ts           # Pause current playback
│   ├── resume.ts          # Resume paused playback
│   ├── volume.ts          # Adjust volume level
│   └── nowplaying.ts      # Show current song info
├── services/        # Core music services
│   ├── baseMusicService.ts    # Base service with common patterns
│   ├── musicPlayer.ts         # Audio playback management
│   ├── queueManager.ts        # Queue state management
│   ├── serviceFactory.ts      # Service singleton management
│   ├── youtubeService.ts      # YouTube search and streaming
│   ├── spotifyService.ts      # Spotify search integration
│   └── soundcloudService.ts   # SoundCloud integration
├── utils/          # Shared utilities
│   ├── commandRegistry.ts     # Command registration system
│   ├── config.ts             # Configuration management
│   ├── errorHandler.ts       # Centralized error handling
│   ├── formatters.ts         # String and duration formatting
│   ├── logger.ts             # Logging system
│   └── urlValidator.ts       # URL validation and parsing
├── types/          # TypeScript type definitions
│   └── index.ts             # Shared type definitions
└── index.ts        # Main bot entry point
```

### Key Design Patterns
- **Factory Pattern**: Service creation and management
- **Template Method**: Base classes for commands and services
- **Strategy Pattern**: Platform-specific music service implementations
- **Dependency Injection**: Clean separation of concerns

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

The project maintains **100% test coverage** across all metrics:
- **60+ test cases** covering all functionality
- **Command tests** with mock Discord interactions
- **Service tests** with comprehensive integration testing
- **Utility tests** with edge case coverage
- **Base class tests** ensuring architectural integrity

Run tests with:
```bash
npm test
```

Coverage reports are generated in multiple formats:
- HTML: `coverage/lcov-report/index.html`
- Cobertura XML: `coverage/cobertura-coverage.xml`
- LCOV: `coverage/lcov.info`

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

We welcome contributions! Please see our comprehensive [development documentation](wiki/) for detailed guides:

### Quick Start for Contributors
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with `npm test`
5. Ensure code passes linting with `npm run lint`
6. Submit a pull request

### Development Resources
- 📖 **[Development Guide](wiki/Development/Guides/Developing.md)** - Setup and development workflow
- 🏗️ **[Architecture Overview](wiki/Development/Architecture.md)** - System design and patterns
- 🎼 **[Adding Music Services](wiki/Development/How%20To%20Contribute/Adding%20Music%20Services.md)** - Integrate new platforms
- ⚡ **[Creating Commands](wiki/Development/How%20To%20Contribute/Creating%20Commands.md)** - Build Discord commands
- 🎮 **[Adding Features](wiki/Development/How%20To%20Contribute/Adding%20Features%20and%20Games.md)** - Extend functionality
- 🧪 **[Testing Guide](wiki/Development/Guides/Testing.md)** - Testing strategies

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

- **API Security**: All API keys stored as environment variables
- **Container Security**: Docker runs as non-root user with resource limits
- **Data Protection**: No sensitive data logged or exposed
- **Input Validation**: All user commands validated and sanitized
- **Error Handling**: Secure error messages prevent information leakage
- **Dependency Security**: Automated vulnerability scanning with npm audit
- **CI/CD Security**: Security scanning integrated into GitLab pipeline