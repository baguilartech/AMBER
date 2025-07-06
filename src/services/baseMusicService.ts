import { MusicService, Song } from '../types';
import { ErrorHandler } from '../utils/errorHandler';
import { URLValidator } from '../utils/urlValidator';
import { ServiceFactory } from './serviceFactory';

export abstract class BaseMusicService implements MusicService {
  protected abstract platform: string;

  abstract search(query: string): Promise<Song[]>;
  abstract getStreamUrl(song: Song): Promise<string>;
  abstract validateUrl(url: string): boolean;

  protected logNoResults(query: string): void {
    ErrorHandler.logNoResults(this.platform, query);
  }

  protected logSearchResults(count: number, query: string): void {
    ErrorHandler.logSearchResults(this.platform, count, query);
  }

  protected logServiceError(operation: string, error: Error): void {
    ErrorHandler.logServiceError(this.platform, operation, error);
  }

  protected createSong(data: {
    title: string;
    artist: string;
    url: string;
    duration: number;
    thumbnail?: string;
    requestedBy: string;
    platform: Song['platform'];
  }): Song {
    return ServiceFactory.createSong(data);
  }

  protected async handleSearchError(error: Error): Promise<Song[]> {
    this.logServiceError('searching', error);
    return [];
  }

  async getSongFromUrl?(url: string, requestedBy: string): Promise<Song | null> {
    // Default implementation - can be overridden by services
    return null;
  }

  abstract isConfigured(): boolean;
}