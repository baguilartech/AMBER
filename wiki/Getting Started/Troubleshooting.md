# Troubleshooting Guide

## Common Issues

### Bot Not Responding

**Symptoms:**
- Bot is online but doesn't respond to commands
- Slash commands don't appear

**Solutions:**
1. Check bot permissions:
   - Ensure bot has "Send Messages" permission
   - Verify "Use Slash Commands" permission
   - Check if bot is muted or restricted

2. Re-invite the bot with updated permissions:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_ID&permissions=8&scope=bot%20applications.commands
   ```

3. Check bot token:
   - Verify `DISCORD_TOKEN` is correct
   - Ensure token hasn't been regenerated

### Music Not Playing

**Symptoms:**
- Bot joins voice channel but no audio
- Songs appear to play but no sound

**Solutions:**
1. Check voice permissions:
   - Bot needs "Connect" permission
   - Bot needs "Speak" permission
   - Verify "Use Voice Activity" permission

2. Check voice channel:
   - Ensure you're in the same voice channel as the bot
   - Try moving to a different voice channel

3. Check audio settings:
   - Verify volume is not set to 0
   - Check if the bot is server muted
   - Ensure your Discord audio settings are correct

### Database Connection Issues

**Symptoms:**
- Bot crashes on startup
- "Database connection failed" errors

**Solutions:**
1. Check database URL:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

2. Verify database is running:
   ```bash
   # For PostgreSQL
   pg_isready -h localhost -p 5432
   ```

3. Check database permissions:
   - Ensure user has CREATE/ALTER privileges
   - Verify database exists

4. Run migrations:
   ```bash
   npm run migrate
   ```

### API Integration Issues

#### Spotify Not Working

**Solutions:**
1. Check Spotify credentials:
   ```env
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   ```

2. Verify Spotify App settings:
   - Ensure redirect URIs are configured
   - Check if app is in development mode

#### YouTube Errors

**Solutions:**
1. Check YouTube API key:
   ```env
   YOUTUBE_API_KEY=your_api_key
   ```

2. Verify API quota:
   - Check Google Cloud Console for quota limits
   - Monitor daily usage

### Performance Issues

**Symptoms:**
- Bot is slow to respond
- Audio cuts out or stutters
- High CPU/memory usage
- Slow song transitions

**Solutions:**
1. Check system resources:
   ```bash
   # Monitor bot process
   top -p $(pgrep node)
   ```

2. Optimize configuration:
   ```env
   # Enable debug logging to monitor prebuffering
   LOG_LEVEL=info
   
   # Optimize queue and volume settings
   MAX_QUEUE_SIZE=50
   DEFAULT_VOLUME=0.5
   ```

3. Check prebuffering performance:
   - Look for "Prebuffer cache" logs in console
   - Monitor "Using prebuffered URL" vs "Fetching fresh YouTube URL" messages
   - Prebuffering should significantly reduce song transition times

4. Update dependencies:
   ```bash
   npm update
   ```

**Performance Features (New in v1.1.1):**
- **Prebuffering**: Next songs prepared in background for instant playback
- **Parallel Search**: 3x faster YouTube search with simultaneous strategies
- **Smart Caching**: LRU cache with automatic cleanup prevents memory bloat

### Queue Issues

**Symptoms:**
- Songs don't advance automatically
- Queue appears empty when it shouldn't

**Solutions:**
1. Check database integrity:
   ```bash
   npm run migrate:status
   ```

2. Clear corrupted queue:
   ```bash
   # Use the /clear command in Discord
   ```

3. Restart the bot:
   ```bash
   npm restart
   ```

## Debug Mode

Enable debug logging for more detailed information:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

## Log Analysis

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ENOTFOUND` | DNS resolution failed | Check internet connection |
| `ECONNREFUSED` | Connection refused | Verify service is running |
| `Invalid token` | Bot token is incorrect | Check Discord token |
| `Missing permissions` | Insufficient bot permissions | Update bot permissions |
| `Voice connection timeout` | Voice channel issues | Check voice permissions |

### Log Locations

- **Docker**: `docker logs amber`
- **PM2**: `pm2 logs amber`
- **Console**: Check terminal output
- **File**: Check `logs/` directory if configured

## Getting Help

1. **Check the logs** for specific error messages
2. **Search existing issues** on GitHub/GitLab
3. **Join our community** discussions
4. **Create a new issue** with:
   - Error message
   - Steps to reproduce
   - Environment information
   - Relevant configuration (without tokens)

## Environment Information

When reporting issues, include:

```bash
# System information
node --version
npm --version

# Bot information
cat package.json | grep version

# Environment
echo $NODE_ENV
```

## Emergency Recovery

### Reset Bot Configuration

1. Stop the bot
2. Clear database (if needed):
   ```bash
   npm run migrate:reset
   ```
3. Restart with clean configuration

### Factory Reset

1. Stop the bot
2. Remove `node_modules`:
   ```bash
   rm -rf node_modules
   ```
3. Reinstall dependencies:
   ```bash
   npm install
   ```
4. Reset database:
   ```bash
   npm run migrate:reset
   ```
5. Restart the bot