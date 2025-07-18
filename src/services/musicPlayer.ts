import { 
  AudioPlayer, 
  AudioPlayerStatus, 
  createAudioPlayer, 
  createAudioResource, 
  entersState, 
  StreamType,
  VoiceConnection, 
  VoiceConnectionStatus 
} from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';
import { Song } from '../types';
import { logger } from '../utils/logger';
import { QueueManager } from './queueManager';
import { ServiceFactory } from './serviceFactory';
import { ErrorHandler } from '../utils/errorHandler';
import { PrebufferService } from './prebufferService';

export class MusicPlayer {
  private players: Map<string, AudioPlayer> = new Map();
  private connections: Map<string, VoiceConnection> = new Map();
  private queueManager: QueueManager;
  private readonly prebufferService: PrebufferService;
  private readonly skipInProgress: Map<string, boolean> = new Map();

  constructor(queueManager: QueueManager) {
    this.queueManager = queueManager;
    this.prebufferService = new PrebufferService();
  }

  async play(guildId: string, connection: VoiceConnection): Promise<void> {
    const currentSong = this.queueManager.getCurrentSong(guildId);
    
    if (!currentSong) {
      logger.info(`No song to play in guild ${guildId}`);
      return;
    }

    try {
      const player = this.getOrCreatePlayer(guildId);
      this.connections.set(guildId, connection);
      
      logger.info(`Song platform: ${currentSong.platform}, URL: ${currentSong.url}`);
      
      let resource;
      
      if (currentSong.url.includes('youtube.com') || currentSong.url.includes('youtu.be')) {
        // For YouTube, stream directly to avoid URL expiration issues
        logger.info(`Creating direct stream for YouTube: ${currentSong.title}`);
        const stream = ytdl(currentSong.url, {
          filter: 'audioonly',
          quality: 'highestaudio',
          highWaterMark: 1 << 25
        });
        
        resource = createAudioResource(stream, {
          inlineVolume: true,
          inputType: StreamType.Arbitrary
        });
      } else {
        // For other platforms, use prebuffered URL or fetch fresh
        const streamUrl = await this.prebufferService.getYouTubeUrl(currentSong, guildId);
        logger.info(`Stream URL for ${currentSong.title}: ${streamUrl?.substring(0, 100)}...`);
        
        // Create stream directly from YouTube URL instead of passing URL string
        const stream = ytdl(streamUrl, {
          filter: 'audioonly',
          quality: 'highestaudio',
          highWaterMark: 1 << 25
        });
        
        resource = createAudioResource(stream, {
          inlineVolume: true,
          inputType: StreamType.Arbitrary
        });
      }

      // Add resource error handling
      resource.playStream.on('error', (error) => {
        logger.error(`Stream error for ${currentSong.title}:`, error);
      });

      const queue = this.queueManager.getQueue(guildId);
      resource.volume?.setVolume(queue.volume);
      
      player.play(resource);
      connection.subscribe(player);

      queue.isPlaying = true;
      queue.isPaused = false;

      logger.info(`Now playing: ${currentSong.title} by ${currentSong.artist} in guild ${guildId}`);
      
      // Start prebuffering next songs in the background
      this.startPrebuffering(guildId);
    } catch (error) {
      await ErrorHandler.handleVoiceError(guildId, error as Error);
      await this.skip(guildId);
    }
  }

  async skip(guildId: string): Promise<Song | null> {
    const player = this.players.get(guildId);
    const queue = this.queueManager.getQueue(guildId);
        
    // Validate that there's something to skip
    if (!queue.isPlaying || queue.songs.length === 0) {
      return null;
    }
    
    // Set skip flag to prevent idle handler interference
    this.skipInProgress.set(guildId, true);
    
    // Stop current playback first to avoid race conditions
    if (player) {
      player.stop();
    }
    
    // Remove current song and get next
    const nextSong = this.queueManager.advance(guildId);
    
    if (nextSong) {
      const connection = this.connections.get(guildId);
      if (connection) {
        try {
          await this.play(guildId, connection);
        } catch (error) {
          logger.error(`Error playing next song after skip in guild ${guildId}:`, error);
          // Continue with next song or stop
          await this.skip(guildId);
        }
      } else {
        logger.error(`No voice connection found for guild ${guildId} during skip`);
      }
    } else {
      // No more songs - stop everything
      this.stop(guildId);
    }
    
    // Clear skip flag
    this.skipInProgress.delete(guildId);
    
    return nextSong;
  }

  async previous(guildId: string): Promise<Song | null> {
    const player = this.players.get(guildId);
    const queue = this.queueManager.getQueue(guildId);
    
    // Validate that there's something to go back to
    if (!queue.isPlaying) {
      return null;
    }
    
    // Set skip flag to prevent idle handler interference
    this.skipInProgress.set(guildId, true);
    
    // Stop current playback first to avoid race conditions
    if (player) {
      player.stop();
    }
    
    const prevSong = this.queueManager.previous(guildId);
    
    if (prevSong) {
      const connection = this.connections.get(guildId);
      if (connection) {
        try {
          await this.play(guildId, connection);
        } catch (error) {
          logger.error(`Error playing previous song in guild ${guildId}:`, error);
          // Try to continue with current or next song
          this.skipInProgress.delete(guildId);
          return null;
        }
      } else {
        logger.error(`No voice connection found for guild ${guildId} during previous`);
      }
    }
    
    // Clear skip flag
    this.skipInProgress.delete(guildId);
    
    return prevSong;
  }

  pause(guildId: string): boolean {
    const player = this.players.get(guildId);
    const queue = this.queueManager.getQueue(guildId);
    
    if (player && queue.isPlaying && !queue.isPaused) {
      player.pause();
      queue.isPaused = true;
      logger.info(`Paused playback in guild ${guildId}`);
      return true;
    }
    
    return false;
  }

  resume(guildId: string): boolean {
    const player = this.players.get(guildId);
    const queue = this.queueManager.getQueue(guildId);
    
    if (player && queue.isPlaying && queue.isPaused) {
      player.unpause();
      queue.isPaused = false;
      logger.info(`Resumed playback in guild ${guildId}`);
      return true;
    }
    
    return false;
  }

  stop(guildId: string): void {
    const player = this.players.get(guildId);
    
    if (player) {
      // Clear queue first to prevent race conditions with idle handler
      this.queueManager.clear(guildId);
      player.stop();
      logger.info(`Stopped playback in guild ${guildId}`);
    }
  }

  setVolume(guildId: string, volume: number): boolean {
    const player = this.players.get(guildId);
    
    if (player && player.state.status === AudioPlayerStatus.Playing) {
      const resource = player.state.resource;
      if (resource.volume) {
        try {
          resource.volume.setVolume(volume);
          this.queueManager.setVolume(guildId, volume);
          logger.info(`Set volume to ${volume} in guild ${guildId}`);
          return true;
        } catch (error) {
          logger.error(`Error setting volume to ${volume} in guild ${guildId}:`, error);
          return false;
        }
      } else {
        logger.error(`No volume control available for player in guild ${guildId}`);
      }
    } else {
      logger.warn(`Cannot set volume in guild ${guildId}: player not playing (status: ${player?.state.status || 'no player'})`);
    }
    
    return false;
  }

  disconnect(guildId: string): void {
    const connection = this.connections.get(guildId);
    const player = this.players.get(guildId);
    
    // Clear queue and stop player first to prevent idle handler interference
    this.queueManager.clear(guildId);
    this.skipInProgress.delete(guildId);
    
    // Clear prebuffer cache for this guild
    this.prebufferService.clearGuildCache(guildId);
    
    if (player) {
      player.stop();
      this.players.delete(guildId);
    }
    
    if (connection) {
      connection.destroy();
      this.connections.delete(guildId);
    }
    
    logger.info(`Disconnected from guild ${guildId}`);
  }

  private getOrCreatePlayer(guildId: string): AudioPlayer {
    if (!this.players.has(guildId)) {
      const player = createAudioPlayer();
      
      player.on('stateChange', (oldState, newState) => {
        logger.info(`Player state changed from ${oldState.status} to ${newState.status} in guild ${guildId}`);
        if (newState.status === AudioPlayerStatus.Playing) {
          logger.info(`Successfully started playing in guild ${guildId}`);
        }
      });
      
      player.on(AudioPlayerStatus.Idle, async () => {
        const queue = this.queueManager.getQueue(guildId);
        const skipInProgress = this.skipInProgress.get(guildId) || false;
        
        logger.info(`Player idle - queue.isPlaying: ${queue.isPlaying}, songs: ${queue.songs.length}, skipInProgress: ${skipInProgress}`);
        
        // Don't auto-advance if a skip is in progress
        if (queue.isPlaying && !skipInProgress) {
          // Remove finished song and advance to next
          const nextSong = this.queueManager.advance(guildId);
          if (nextSong) {
            const connection = this.connections.get(guildId);
            if (connection) {
              await this.play(guildId, connection);
            }
          } else {
            queue.isPlaying = false;
            logger.info(`Playback finished in guild ${guildId}`);
          }
        }
      });
      
      player.on('error', async (error) => {
        logger.error(`Audio player error in guild ${guildId}:`, error);
        // Try to skip to next song on error
        await this.skip(guildId);
      });
      
      this.players.set(guildId, player);
    }
    
    return this.players.get(guildId)!;
  }

  private async getStreamUrl(song: Song): Promise<string> {
    const service = ServiceFactory.getServiceByPlatform(song.platform);
    
    if (!service) {
      throw new Error(`Unsupported platform: ${song.platform}`);
    }
    
    return await service.getStreamUrl(song);
  }

  async waitForConnection(connection: VoiceConnection): Promise<void> {
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    } catch (error) {
      logger.error('Failed to establish voice connection:', error);
      throw error;
    }
  }

  private startPrebuffering(guildId: string): void {
    try {
      const queue = this.queueManager.getQueue(guildId);
      
      // Start prebuffering next songs in background (don't await)
      this.prebufferService.prebufferNextSongs(queue.songs, queue.currentIndex, guildId)
        .catch(error => {
          logger.error(`Error during prebuffering for guild ${guildId}:`, error);
        });
        
      // Log cache stats periodically
      const stats = this.prebufferService.getCacheStats();
      if (stats.size > 0) {
        logger.info(`Prebuffer cache: ${stats.prebuffered} ready, ${stats.inProgress} in progress, ${stats.size} total`);
      }
    } catch (error) {
      logger.error(`Failed to start prebuffering for guild ${guildId}:`, error);
    }
  }

  triggerPrebuffering(guildId: string): void {
    this.startPrebuffering(guildId);
  }
}