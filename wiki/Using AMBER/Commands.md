# Commands Reference

## Music Commands

### `/play <song>`
Play a song from various sources (YouTube, Spotify, SoundCloud)

**Examples:**
- `/play Never Gonna Give You Up`
- `/play https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `/play https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8`

### `/pause`
Pause the current song

### `/resume`
Resume the paused song

### `/stop`
Stop playback and clear the queue

### `/skip`
Skip to the next song in the queue

### `/volume <level>`
Set the playback volume (0-100)

**Example:**
- `/volume 50`

## Queue Management

### `/queue`
Display the current queue

### `/nowplaying`
Show information about the currently playing song

## Command Syntax

- `<required>` - Required parameter
- `[optional]` - Optional parameter
- `<option1|option2>` - Choose one of the options

## Permissions

Some commands may require specific permissions:
- **Voice Channel**: You must be in a voice channel to use music commands
- **Same Channel**: You must be in the same voice channel as the bot

## Tips

- Use tab completion for command names
- Most commands work with URLs from supported platforms
- The bot remembers your volume preference
- The bot automatically disconnects when voice channels are empty
- Smart prebuffering ensures seamless playback between songs

## Performance Features

- **Prebuffering**: Next songs are prepared in the background for instant playback
- **Intelligent Search**: YouTube searches prioritize official channels and verified artists
- **Multi-platform Support**: Seamless integration with YouTube, Spotify, and SoundCloud