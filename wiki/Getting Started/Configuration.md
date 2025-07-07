# Configuration Guide

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Your Discord bot token | `YOUR_BOT_TOKEN_HERE` |
| `DATABASE_URL` | Database connection string | `postgresql://user:pass@localhost:5432/amber` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `NODE_ENV` | Environment mode | `production` |
| `LOG_LEVEL` | Logging level | `info` |
| `DEFAULT_VOLUME` | Default playback volume | `50` |
| `QUEUE_PAGE_SIZE` | Items per queue page | `10` |

## Music Service Integration

### Spotify

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

### YouTube

```env
YOUTUBE_API_KEY=your_youtube_api_key
```

### SoundCloud

```env
SOUNDCLOUD_CLIENT_ID=your_soundcloud_client_id
```

## Database Configuration

### PostgreSQL (Recommended)

```env
DATABASE_URL=postgresql://username:password@localhost:5432/amber
```

### SQLite (Development)

```env
DATABASE_URL=file:./amber.db
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

## Advanced Configuration

### Custom Prefix

```env
BOT_PREFIX=!
```

### Auto-leave Settings

```env
AUTO_LEAVE_TIMEOUT=300000  # 5 minutes in milliseconds
LEAVE_ON_EMPTY=true
```

### Quality Settings

```env
AUDIO_QUALITY=high  # low, medium, high
BITRATE=128000     # Audio bitrate
```

## Guild-specific Settings

Amber supports per-server configuration through slash commands:

- `/config volume <value>` - Set default volume
- `/config prefix <prefix>` - Set command prefix
- `/config auto-announce <true/false>` - Auto-announce next song
- `/config queue-size <size>` - Set queue page size

## Troubleshooting

### Common Issues

1. **Bot not responding**: Check if the bot has proper permissions
2. **Music not playing**: Verify voice channel permissions
3. **Database errors**: Check database connection string
4. **API errors**: Verify service API keys

For more help, see [Troubleshooting](Troubleshooting).