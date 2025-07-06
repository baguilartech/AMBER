import { 
  AudioPlayer, 
  AudioPlayerStatus, 
  createAudioPlayer, 
  createAudioResource, 
  entersState, 
  VoiceConnection, 
  VoiceConnectionStatus 
} from '@discordjs/voice';
import { Song } from '../types';
import { logger } from '../utils/logger';
import { QueueManager } from './queueManager';
import { ServiceFactory } from './serviceFactory';
import { ErrorHandler } from '../utils/errorHandler';

export class MusicPlayer {
  private players: Map<string, AudioPlayer> = new Map();
  private connections: Map<string, VoiceConnection> = new Map();
  private queueManager: QueueManager;

  constructor(queueManager: QueueManager) {
    this.queueManager = queueManager;
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
      
      const streamUrl = await this.getStreamUrl(currentSong);
      const resource = createAudioResource(streamUrl, {
        inlineVolume: true
      });

      const queue = this.queueManager.getQueue(guildId);
      resource.volume?.setVolume(queue.volume);
      
      player.play(resource);
      connection.subscribe(player);

      queue.isPlaying = true;
      queue.isPaused = false;

      logger.info(`Now playing: ${currentSong.title} by ${currentSong.artist} in guild ${guildId}`);
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
    
    // Stop current playback first to avoid race conditions
    if (player) {
      player.stop();
    }
    
    const nextSong = this.queueManager.skip(guildId);
    
    if (nextSong) {
      const connection = this.connections.get(guildId);
      if (connection) {
        await this.play(guildId, connection);
      }
    } else {
      this.stop(guildId);
    }
    
    return nextSong;
  }

  async previous(guildId: string): Promise<Song | null> {
    const player = this.players.get(guildId);
    
    // Stop current playback first to avoid race conditions
    if (player) {
      player.stop();
    }
    
    const prevSong = this.queueManager.previous(guildId);
    
    if (prevSong) {
      const connection = this.connections.get(guildId);
      if (connection) {
        await this.play(guildId, connection);
      }
    }
    
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
    const queue = this.queueManager.getQueue(guildId);
    
    if (player) {
      player.stop();
      queue.isPlaying = false;
      queue.isPaused = false;
      logger.info(`Stopped playback in guild ${guildId}`);
    }
  }

  setVolume(guildId: string, volume: number): boolean {
    const player = this.players.get(guildId);
    
    if (player && player.state.status === AudioPlayerStatus.Playing) {
      const resource = player.state.resource;
      if (resource.volume) {
        resource.volume.setVolume(volume);
        this.queueManager.setVolume(guildId, volume);
        logger.info(`Set volume to ${volume} in guild ${guildId}`);
        return true;
      }
    }
    
    return false;
  }

  disconnect(guildId: string): void {
    const connection = this.connections.get(guildId);
    const player = this.players.get(guildId);
    
    if (connection) {
      connection.destroy();
      this.connections.delete(guildId);
    }
    
    if (player) {
      player.stop();
      this.players.delete(guildId);
    }
    
    this.queueManager.clear(guildId);
    logger.info(`Disconnected from guild ${guildId}`);
  }

  private getOrCreatePlayer(guildId: string): AudioPlayer {
    if (!this.players.has(guildId)) {
      const player = createAudioPlayer();
      
      player.on('stateChange', (oldState, newState) => {
        logger.debug(`Player state changed from ${oldState.status} to ${newState.status} in guild ${guildId}`);
      });
      
      player.on(AudioPlayerStatus.Idle, async () => {
        const queue = this.queueManager.getQueue(guildId);
        if (queue.isPlaying) {
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
      
      player.on('error', (error) => {
        logger.error(`Audio player error in guild ${guildId}:`, error);
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
}