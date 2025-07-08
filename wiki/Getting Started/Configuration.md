# Configuration Guide

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Your Discord bot token | `YOUR_BOT_TOKEN_HERE` |
| `DISCORD_CLIENT_ID` | Your Discord bot client ID | `YOUR_CLIENT_ID_HERE` |

### Music Service Integration

#### Spotify
```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

#### YouTube
```env
YOUTUBE_API_KEY=your_youtube_api_key
```

#### SoundCloud (Optional)
```env
SOUNDCLOUD_CLIENT_ID=your_soundcloud_client_id
```

### Optional Bot Configuration

| Variable | Description | Default |
|----------|-------------|----------|
| `NODE_ENV` | Environment mode | `production` |
| `LOG_LEVEL` | Logging level | `info` |
| `BOT_PREFIX` | Command prefix (legacy) | `!` |
| `MAX_QUEUE_SIZE` | Maximum songs in queue | `100` |
| `DEFAULT_VOLUME` | Default volume (0.0-1.0) | `0.5` |
| `AUTO_LEAVE_TIMEOUT` | Auto-leave timeout (ms) | `300000` |

## Complete .env Example

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

## Bot Permissions

Ensure your bot has the following permissions:

- **Text Permissions:**
  - Send Messages
  - Send Messages in Threads
  - Embed Links
  - Use Slash Commands
  - Use External Emojis
  - Read Message History

- **Voice Permissions:**
  - Connect
  - Speak
  - Use Voice Activity

## Performance Configuration

### Docker Resource Limits

The included `docker-compose.yml` provides optimized resource limits:

```yaml
mem_limit: 512m
cpus: 0.5
```

### Prebuffering Settings

Prebuffering is automatically configured with:
- **Cache Size**: 50 songs maximum
- **Prebuffer Count**: Next 1-2 songs
- **Cleanup**: Automatic LRU cache cleanup

## Troubleshooting

### Common Issues

1. **Bot not responding**: Check if the bot has proper permissions
2. **Music not playing**: Verify voice channel permissions
3. **API errors**: Verify service API keys
4. **Docker issues**: Check container logs with `docker-compose logs`

### Debug Mode

For verbose logging, set:
```env
LOG_LEVEL=debug
```

For more help, see [Troubleshooting](Troubleshooting).