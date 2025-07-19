import { Song } from '../types';
import { ServiceFactory } from './serviceFactory';
import { logger } from '../utils/logger';

interface PrebufferedSong extends Song {
  youtubeUrl?: string;
  prebuffered: boolean;
  prebufferPromise?: Promise<string>;
}

export class PrebufferService {
  private readonly prebufferCache: Map<string, PrebufferedSong> = new Map();
  private readonly maxCacheSize = 50; // Limit cache size to prevent memory issues
  
  /**
   * Prebuffer the next 1-2 songs in the queue while current song is playing
   */
  async prebufferNextSongs(songs: Song[], currentIndex: number, guildId: string): Promise<void> {
    // Prebuffer next 2 songs for instant playback
    const songsToBuffer = songs.slice(currentIndex + 1, currentIndex + 3);
    
    logger.info(`Prebuffering check: ${songsToBuffer.length} songs to consider from index ${currentIndex + 1} in guild ${guildId}`);
    
    for (const song of songsToBuffer) {
      if (this.shouldPrebuffer(song)) {
        logger.info(`Starting prebuffer for: ${song.title} by ${song.artist} (${song.platform})`);
        this.prebufferSong(song, guildId);
      } else {
        logger.info(`Skipping prebuffer for: ${song.title} (${song.platform}) - not needed`);
      }
    }
  }

  /**
   * Get YouTube URL for a song (either from cache or fetch it)
   */
  async getYouTubeUrl(song: Song, guildId: string): Promise<string> {
    const cacheKey = this.getCacheKey(song);
    const cached = this.prebufferCache.get(cacheKey);
    
    // Return cached URL if available
    if (cached?.youtubeUrl) {
      logger.info(`Using prebuffered URL for ${song.title} in guild ${guildId}`);
      return cached.youtubeUrl;
    }
    
    // If prebuffer is in progress, wait for it
    if (cached?.prebufferPromise) {
      logger.info(`Waiting for prebuffer completion for ${song.title} in guild ${guildId}`);
      try {
        const url = await cached.prebufferPromise;
        return url;
      } catch (error) {
        logger.error(`Prebuffer failed for ${song.title}, fetching fresh:`, error);
        // Fall through to fresh fetch
      }
    }
    
    // Fetch fresh URL
    logger.info(`Fetching fresh YouTube URL for ${song.title} in guild ${guildId}`);
    return await this.fetchYouTubeUrl(song);
  }

  /**
   * Start prebuffering a song in the background
   */
  private prebufferSong(song: Song, guildId: string): void {
    const cacheKey = this.getCacheKey(song);
    
    // Skip if already prebuffered or in progress
    if (this.prebufferCache.has(cacheKey)) {
      return;
    }
    
    logger.info(`Starting prebuffer for ${song.title} in guild ${guildId}`);
    
    // Create cache entry with promise
    const prebufferPromise = this.fetchYouTubeUrl(song)
      .then(youtubeUrl => {
        // Update cache with successful result
        const cached = this.prebufferCache.get(cacheKey);
        if (cached) {
          cached.youtubeUrl = youtubeUrl;
          cached.prebuffered = true;
          cached.prebufferPromise = undefined;
        }
        logger.info(`Prebuffered ${song.title} successfully`);
        return youtubeUrl;
      })
      .catch(error => {
        // Remove failed entry from cache
        this.prebufferCache.delete(cacheKey);
        logger.error(`Failed to prebuffer ${song.title}:`, error);
        throw error;
      });

    // Add to cache
    this.prebufferCache.set(cacheKey, {
      ...song,
      prebuffered: false,
      prebufferPromise
    });
    
    // Clean up cache if it gets too large
    this.cleanupCache();
  }

  /**
   * Fetch YouTube URL for a song based on its platform
   */
  private async fetchYouTubeUrl(song: Song): Promise<string> {
    if (song.platform === 'youtube') {
      // YouTube songs already have the correct URL
      return song.url;
    }
    
    if (song.platform === 'spotify') {
      // Use Spotify service to find YouTube equivalent
      const spotifyService = ServiceFactory.getSpotifyService();
      return await spotifyService.getStreamUrl(song);
    }
    
    if (song.platform === 'soundcloud') {
      // SoundCloud songs can be played directly or converted
      return song.url;
    }
    
    throw new Error(`Unsupported platform for prebuffering: ${song.platform}`);
  }

  /**
   * Check if a song should be prebuffered
   */
  private shouldPrebuffer(song: Song): boolean {
    // Only prebuffer Spotify songs (most expensive to convert)
    if (song.platform !== 'spotify') {
      return false;
    }
    
    const cacheKey = this.getCacheKey(song);
    return !this.prebufferCache.has(cacheKey);
  }

  /**
   * Generate cache key for a song
   */
  private getCacheKey(song: Song): string {
    return `${song.platform}:${song.url}`;
  }

  /**
   * Clean up old cache entries to prevent memory leaks
   */
  private cleanupCache(): void {
    if (this.prebufferCache.size > this.maxCacheSize) {
      // Remove oldest entries (simple FIFO cleanup)
      const entries = Array.from(this.prebufferCache.entries());
      const toRemove = entries.slice(0, entries.length - this.maxCacheSize + 10);
      
      for (const [key] of toRemove) {
        this.prebufferCache.delete(key);
      }
      
      logger.info(`Cleaned up prebuffer cache, removed ${toRemove.length} entries`);
    }
  }

  /**
   * Clear cache for a specific guild (when bot leaves or stops)
   */
  clearGuildCache(guildId: string): void {
    // For now, we don't store guild-specific cache, but this could be extended
    logger.info(`Cleared prebuffer cache for guild ${guildId}`);
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; prebuffered: number; inProgress: number } {
    const entries = Array.from(this.prebufferCache.values());
    return {
      size: this.prebufferCache.size,
      prebuffered: entries.filter(e => e.prebuffered).length,
      inProgress: entries.filter(e => e.prebufferPromise && !e.prebuffered).length
    };
  }
}