# Architecture Documentation

## Overview

Amber follows a simple, modular architecture with clear separation of concerns. The bot is designed with maintainability in mind, using straightforward patterns and minimal complexity.

## Core Architecture

```mermaid
graph TB
    DC[Discord Client] 
    
    subgraph "Command Layer"
        PC[Play Command]
        QC[Queue Command] 
        VC[Volume Command]
        NC[NowPlaying Command]
        BC[BaseCommand]
    end
    
    subgraph "Service Layer"
        YS[YouTube Service]
        SS[Spotify Service]
        SCS[SoundCloud Service]
        BMS[BaseMusicService]
    end
    
    subgraph "Management Layer"
        QM[Queue Manager]
        MP[Music Player]
        SF[Service Factory]
        PS[Prebuffer Service]
    end
    
    subgraph "Utility Layer"
        L[Logger]
        EH[Error Handler]
        UV[URL Validator]
        C[Config]
        F[Formatters]
    end
    
    DC --> PC
    DC --> QC
    DC --> VC
    DC --> NC
    
    PC --> BC
    QC --> BC
    VC --> BC
    NC --> BC
    
    PC --> SF
    QC --> QM
    VC --> MP
    NC --> MP
    
    SF --> YS
    SF --> SS
    SF --> SCS
    
    YS --> BMS
    SS --> BMS
    SCS --> BMS
    
    QM --> MP
    MP --> PS
    MP --> L
    PS --> L
    
    YS --> L
    SS --> L
    SCS --> L
```

## Key Components

### 1. Main Application (index.ts)
- **Purpose**: Entry point for the Discord bot
- **Responsibilities**: 
  - Discord client initialization
  - Command registration
  - Event handling

### 2. Command Layer
- **Base Class**: `BaseCommand` - Simple shared functionality
- **Commands**: 9 total commands
  - `play.ts` - Play music from URL or search
  - `pause.ts` - Pause current playback
  - `resume.ts` - Resume paused playback
  - `stop.ts` - Stop playback and clear queue
  - `skip.ts` - Skip to next song
  - `volume.ts` - Adjust volume level
  - `queue.ts` - Display current queue
  - `nowplaying.ts` - Show current song info

### 3. Service Layer
- **Base Class**: `BaseMusicService` - Common service patterns
- **Services**: 
  - `youtubeService.ts` - YouTube integration
  - `spotifyService.ts` - Spotify integration
  - `soundcloudService.ts` - SoundCloud integration
- **Factory**: `ServiceFactory` - Simple service creation

### 4. Management Layer
- **QueueManager**: Basic queue operations
- **MusicPlayer**: Audio playback management
- **PrebufferService**: Background song preparation
- **ServiceFactory**: Service instance management

### 5. Utility Layer
- **Logger**: Basic logging functionality
- **ErrorHandler**: Simple error management
- **Config**: Environment configuration
- **URLValidator**: URL validation
- **Formatters**: String formatting utilities

## Design Patterns

### 1. Factory Pattern
```typescript
class ServiceFactory {
  private static youtubeService: YouTubeService;
  private static spotifyService: SpotifyService;
  private static soundcloudService: SoundCloudService;
  
  static getYouTubeService(): YouTubeService {
    if (!this.youtubeService) {
      this.youtubeService = new YouTubeService();
    }
    return this.youtubeService;
  }
}
```

### 2. Template Method Pattern
```typescript
abstract class BaseCommand {
  abstract get data(): SlashCommandBuilder;
  abstract execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
```

### 3. Strategy Pattern
- Platform-specific music service implementations
- Common interface for all music services
- Runtime service selection based on URL/platform

## Data Flow

### 1. Command Execution Flow
```mermaid
sequenceDiagram
    participant U as User
    participant D as Discord
    participant C as Command
    participant S as Service
    participant M as Music Player
    
    U->>D: /play command
    D->>C: Execute command
    C->>S: Search for song
    S-->>C: Return song data
    C->>M: Queue song
    M-->>D: Playback started
    D-->>U: Confirmation
```

### 2. Music Playback Flow
```mermaid
flowchart LR
    Q[Search Query] --> SF[Service Factory]
    SF --> PS[Platform Service]
    PS --> SD[Song Data]
    SD --> QM[Queue Manager]
    QM --> MP[Music Player]
    MP --> PBS[Prebuffer Service]
    PBS --> AO[Audio Output]
```

## File Structure

```
src/
├── commands/              # Discord slash commands (9 files)
│   ├── baseCommand.ts    # Base command class
│   ├── play.ts           # Play command
│   ├── pause.ts          # Pause command
│   ├── resume.ts         # Resume command
│   ├── stop.ts           # Stop command
│   ├── skip.ts           # Skip command
│   ├── volume.ts         # Volume command
│   ├── queue.ts          # Queue command
│   └── nowplaying.ts     # Now playing command
├── services/             # Music platform services
│   ├── baseMusicService.ts    # Base service class
│   ├── youtubeService.ts      # YouTube integration
│   ├── spotifyService.ts      # Spotify integration
│   ├── soundcloudService.ts   # SoundCloud integration
│   ├── musicPlayer.ts         # Audio playback
│   ├── queueManager.ts        # Queue management
│   ├── prebufferService.ts    # Prebuffering optimization
│   └── serviceFactory.ts      # Service creation
├── utils/                # Utility functions
│   ├── commandRegistry.ts     # Command registration
│   ├── config.ts             # Configuration
│   ├── errorHandler.ts       # Error handling
│   ├── logger.ts             # Logging
│   ├── urlValidator.ts       # URL validation
│   └── formatters.ts         # String formatting
├── types/                # TypeScript types
│   └── index.ts             # Type definitions
└── index.ts              # Main entry point
```

## Extension Points

### Adding New Music Platforms

1. **Create Service Class**:
```typescript
export class NewPlatformService extends BaseMusicService {
  async search(query: string): Promise<Song[]> {
    // Implementation
  }
  
  async getStreamUrl(song: Song): Promise<string> {
    // Implementation
  }
  
  validateUrl(url: string): boolean {
    // Implementation
  }
}
```

2. **Update Service Factory**:
```typescript
static getNewPlatformService(): NewPlatformService {
  if (!this.newPlatformService) {
    this.newPlatformService = new NewPlatformService();
  }
  return this.newPlatformService;
}
```

### Adding New Commands

1. **Create Command Class**:
```typescript
export class NewCommand extends BaseCommand {
  get data(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName('newcommand')
      .setDescription('Description');
  }
  
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Implementation
  }
}
```

2. **Register in CommandRegistry**:
```typescript
// Add to command registration system
```

## Configuration Management

### Environment Variables
```typescript
export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN!,
    clientId: process.env.DISCORD_CLIENT_ID!,
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY,
  },
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  },
  soundcloud: {
    clientId: process.env.SOUNDCLOUD_CLIENT_ID,
  },
  bot: {
    prefix: process.env.BOT_PREFIX || '!',
    maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE || '100'),
    defaultVolume: parseFloat(process.env.DEFAULT_VOLUME || '0.5'),
    autoLeaveTimeout: parseInt(process.env.AUTO_LEAVE_TIMEOUT || '300000'),
  }
};
```

## Performance Features

### 1. Prebuffering System
- **Smart Prebuffering**: Next 1-2 songs prepared in background
- **LRU Cache**: 50-song cache with automatic cleanup
- **Spotify Optimization**: Prioritizes expensive Spotify conversions

### 2. Search Optimization
- **Intelligent Search**: YouTube searches prioritize official channels
- **Parallel Processing**: Multiple search strategies run simultaneously
- **Timeout Protection**: 8-second timeout prevents hanging operations

### 3. Resource Management
- **Memory Limits**: Docker container limited to 512MB
- **CPU Limits**: 0.5 CPU cores maximum
- **Auto-cleanup**: Automatic cache cleanup and resource management

## Error Handling

### 1. Layered Error Handling
- **Command Level**: User-friendly error messages
- **Service Level**: Platform-specific error handling
- **Application Level**: Logging and monitoring

### 2. Recovery Mechanisms
- **Graceful Degradation**: Fallback between services
- **Retry Logic**: Handles temporary failures
- **User Notification**: Clear error messages to users

## Security Considerations

### 1. Input Validation
- URL validation before processing
- Command parameter validation
- User permission checking

### 2. Credential Management
- Environment variable storage
- No hardcoded secrets
- Secure API key handling

### 3. Container Security
- Non-root user in Docker
- Resource limits enforced
- No sensitive data in logs

This simple architecture provides a solid foundation for a maintainable Discord music bot while keeping complexity minimal and focusing on core functionality.