import { Song, Queue } from '../types';
import { botConfig } from '../utils/config';
import { logger } from '../utils/logger';
import { SentryLogger } from '../utils/monitoring';

export class QueueManager {
  private readonly queues: Map<string, Queue> = new Map();

  getQueue(guildId: string): Queue {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, {
        songs: [],
        currentIndex: 0,
        isPlaying: false,
        isPaused: false,
        volume: botConfig.defaultVolume
      });
    }
    return this.queues.get(guildId)!;
  }

  addSong(guildId: string, song: Song): boolean {
    const queue = this.getQueue(guildId);
    
    if (queue.songs.length >= botConfig.maxQueueSize) {
      logger.warn(`Queue full for guild ${guildId}, cannot add song: ${song.title}`);
      return false;
    }
    
    if (!song.title || !song.artist) {
      SentryLogger.error(`Invalid song data for guild ${guildId}: title=${song.title}, artist=${song.artist}`, undefined, {
        guildId,
        songTitle: song.title,
        songArtist: song.artist,
        songPlatform: song.platform
      });
      return false;
    }

    queue.songs.push(song);
    
    // If nothing is playing and queue was empty, reset to start
    if (!queue.isPlaying && queue.songs.length === 1) {
      queue.currentIndex = 0;
    }
    
    logger.info(`Added song to queue: ${song.title} by ${song.artist}`);
    return true;
  }

  removeSong(guildId: string, index: number): Song | null {
    const queue = this.getQueue(guildId);
    
    if (index < 0 || index >= queue.songs.length) {
      return null;
    }

    const removedSong = queue.songs.splice(index, 1)[0];
    
    if (index < queue.currentIndex) {
      queue.currentIndex--;
    } else if (index === queue.currentIndex && queue.currentIndex >= queue.songs.length) {
      queue.currentIndex = 0;
    }

    logger.info(`Removed song from queue: ${removedSong.title}`);
    return removedSong;
  }

  getCurrentSong(guildId: string): Song | null {
    const queue = this.getQueue(guildId);
    return queue.songs[queue.currentIndex] || null;
  }

  getNextSong(guildId: string): Song | null {
    const queue = this.getQueue(guildId);
    const nextIndex = queue.currentIndex + 1;
    return queue.songs[nextIndex] || null;
  }

  skip(guildId: string): Song | null {
    const queue = this.getQueue(guildId);
    
    // Move to next song without removing current
    if (queue.songs.length > 0) {
      queue.currentIndex++;
      
      // If we're at the end, return null (no more songs)
      if (queue.currentIndex >= queue.songs.length) {
        return null;
      }
      
      return this.getCurrentSong(guildId);
    }
    
    return null;
  }

  advance(guildId: string): Song | null {
    const queue = this.getQueue(guildId);
    
    // Remove the current song and advance to the next
    if (queue.songs.length > 0 && queue.currentIndex < queue.songs.length) {
      queue.songs.splice(queue.currentIndex, 1);
      
      // If we're at the end or queue is empty, no more songs
      if (queue.currentIndex >= queue.songs.length) {
        queue.currentIndex = 0;
        return null;
      }
      
      return this.getCurrentSong(guildId);
    }
    
    return null;
  }

  previous(guildId: string): Song | null {
    const queue = this.getQueue(guildId);
    
    if (queue.currentIndex > 0) {
      queue.currentIndex--;
      return this.getCurrentSong(guildId);
    }
    
    return null;
  }

  shuffle(guildId: string): void {
    const queue = this.getQueue(guildId);
    
    if (queue.songs.length <= 1) {
      return; // Nothing to shuffle
    }
    
    const currentSong = queue.songs[queue.currentIndex];
    
    // Remove current song from shuffle
    const remainingSongs = queue.songs.filter((_, index) => index !== queue.currentIndex);
    
    // Shuffle remaining songs
    for (let i = remainingSongs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingSongs[i], remainingSongs[j]] = [remainingSongs[j], remainingSongs[i]];
    }
    
    // Atomically rebuild queue with current song at the beginning
    const newSongs = currentSong ? [currentSong, ...remainingSongs] : remainingSongs;
    const newCurrentIndex = 0;
    
    // Update queue state atomically
    queue.songs = newSongs;
    queue.currentIndex = newCurrentIndex;
    
    logger.info(`Shuffled queue for guild ${guildId}`);
  }

  clear(guildId: string): void {
    const queue = this.getQueue(guildId);
    queue.songs = [];
    queue.currentIndex = 0;
    queue.isPlaying = false;
    queue.isPaused = false;
    logger.info(`Cleared queue for guild ${guildId}`);
  }

  setVolume(guildId: string, volume: number): void {
    const queue = this.getQueue(guildId);
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    if (clampedVolume !== volume) {
      logger.warn(`Volume ${volume} clamped to ${clampedVolume} for guild ${guildId}`);
    }
    
    queue.volume = clampedVolume;
    logger.info(`Set volume to ${queue.volume} for guild ${guildId}`);
  }

  getQueueStatus(guildId: string): {
    currentSong: Song | null;
    queueLength: number;
    isPlaying: boolean;
    isPaused: boolean;
    volume: number;
  } {
    const queue = this.getQueue(guildId);
    return {
      currentSong: this.getCurrentSong(guildId),
      queueLength: queue.songs.length,
      isPlaying: queue.isPlaying,
      isPaused: queue.isPaused,
      volume: queue.volume
    };
  }
}