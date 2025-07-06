import { Song } from '../types';
import { apiKeys } from '../utils/config';
import { logger } from '../utils/logger';
import { URLValidator } from '../utils/urlValidator';
import { BaseMusicService } from './baseMusicService';

export class SoundCloudService extends BaseMusicService {
  protected platform = 'SoundCloud';
  private clientId: string | null;

  constructor() {
    super();
    this.clientId = apiKeys.soundcloud?.clientId || null;
  }

  async search(query: string): Promise<Song[]> {
    if (!this.clientId) {
      logger.warn('SoundCloud client ID not configured, skipping search');
      return [];
    }

    try {
      const searchUrl = `https://api.soundcloud.com/tracks?q=${encodeURIComponent(query)}&client_id=${this.clientId}&limit=5`;
      
      const response = await fetch(searchUrl);
      const tracks = await response.json();

      if (!Array.isArray(tracks) || tracks.length === 0) {
        this.logNoResults(query);
        return [];
      }

      const songs: Song[] = tracks.map(track => this.createSong({
        title: track.title,
        artist: track.user.username,
        url: track.permalink_url,
        duration: Math.floor(track.duration / 1000),
        thumbnail: track.artwork_url,
        requestedBy: '',
        platform: 'soundcloud'
      }));

      this.logSearchResults(songs.length, query);
      return songs;
    } catch (error) {
      return this.handleSearchError(error as Error);
    }
  }

  async getStreamUrl(song: Song): Promise<string> {
    if (!this.clientId) {
      throw new Error('SoundCloud client ID not configured');
    }

    try {
      const trackId = this.extractTrackId(song.url);
      if (!trackId) {
        throw new Error('Invalid SoundCloud URL');
      }

      const streamUrl = `https://api.soundcloud.com/tracks/${trackId}/stream?client_id=${this.clientId}`;
      
      const response = await fetch(streamUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error('Failed to get stream URL');
      }

      return streamUrl;
    } catch (error) {
      logger.error(`Error getting stream URL for SoundCloud track ${song.title}:`, error);
      throw error;
    }
  }


  validateUrl(url: string): boolean {
    return URLValidator.validateSoundCloud(url);
  }

  async getSongFromUrl(url: string, requestedBy: string): Promise<Song | null> {
    if (!this.validateUrl(url) || !this.clientId) {
      return null;
    }

    try {
      const resolveUrl = `https://api.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${this.clientId}`;
      
      const response = await fetch(resolveUrl);
      const track = await response.json() as any;

      if (!track || track.kind !== 'track') {
        return null;
      }

      return this.createSong({
        title: track.title,
        artist: track.user?.username || 'Unknown Artist',
        url: url,
        duration: Math.floor(track.duration / 1000),
        thumbnail: track.artwork_url,
        requestedBy,
        platform: 'soundcloud'
      });
    } catch (error) {
      logger.error(`Error getting song from SoundCloud URL ${url}:`, error);
      return null;
    }
  }

  private extractTrackId(url: string): string | null {
    const match = url.match(/soundcloud\.com\/[^/]+\/([^/?]+)/);
    return match ? match[1] : null;
  }

  isConfigured(): boolean {
    return this.clientId !== null;
  }
}