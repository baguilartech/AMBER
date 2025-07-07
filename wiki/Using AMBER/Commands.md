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

### `/clear`
Clear the entire queue

### `/shuffle`
Shuffle the current queue

### `/move <from> <to>`
Move a song from one position to another in the queue

**Example:**
- `/move 3 1` - Move song at position 3 to position 1

### `/remove <position>`
Remove a song from the queue

**Example:**
- `/remove 5` - Remove song at position 5

## Loop Commands

### `/loop`
Toggle loop mode for the current song

### `/loop-queue`
Toggle loop mode for the entire queue

## Playback Control

### `/nowplaying`
Show information about the currently playing song

### `/seek <time>`
Seek to a specific time in the current song

**Examples:**
- `/seek 1:30` - Seek to 1 minute 30 seconds
- `/seek 90` - Seek to 90 seconds

### `/replay`
Restart the current song from the beginning

## Favorites

### `/favorites`
List your favorite songs

### `/favorites add <name>`
Add the current song to your favorites

### `/favorites remove <name>`
Remove a song from your favorites

### `/favorites play <name>`
Play a song from your favorites

## Bot Control

### `/disconnect`
Disconnect the bot from the voice channel

### `/connect`
Connect the bot to your current voice channel

## Configuration Commands

### `/config volume <value>`
Set the default volume for the server

### `/config auto-announce <true/false>`
Toggle automatic song announcements

### `/config queue-size <size>`
Set the number of songs displayed per queue page

## Information Commands

### `/help`
Show help information

### `/about`
Show information about the bot

### `/ping`
Check the bot's response time

## Advanced Commands

### `/fseek <time>`
Fast seek to a specific time (may cause brief audio interruption)

### `/unskip`
Return to the previous song (if available)

## Command Syntax

- `<required>` - Required parameter
- `[optional]` - Optional parameter
- `<option1|option2>` - Choose one of the options

## Permissions

Some commands may require specific permissions:
- **DJ Role**: Some servers may require a DJ role for queue management
- **Voice Channel**: You must be in a voice channel to use music commands
- **Same Channel**: You must be in the same voice channel as the bot

## Tips

- Use tab completion for command names
- Most commands work with URLs from supported platforms
- The bot remembers your volume preference
- Use `/queue` to see position numbers for `/move` and `/remove` commands
- Favorites are saved per user across all servers