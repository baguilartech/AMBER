import { MusicService, Song } from '../types';
import { YouTubeService } from './youtubeService';
import { SpotifyService } from './spotifyService';
import { SoundCloudService } from './soundcloudService';
import { logger } from '../utils/logger';
import { ErrorTracking } from '../utils/monitoring';

export class ServiceFactory {
  private static youtubeService: YouTubeService;
  private static spotifyService: SpotifyService;
  private static soundcloudService: SoundCloudService;

  static getYouTubeService(): YouTubeService {
    if (!this.youtubeService) {
      this.youtubeService = new YouTubeService();
      logger.debug('Created YouTube service instance');
    }
    return this.youtubeService;
  }

  static getSpotifyService(): SpotifyService {
    if (!this.spotifyService) {
      this.spotifyService = new SpotifyService();
      logger.debug('Created Spotify service instance');
    }
    return this.spotifyService;
  }

  static getSoundCloudService(): SoundCloudService {
    if (!this.soundcloudService) {
      this.soundcloudService = new SoundCloudService();
      logger.debug('Created SoundCloud service instance');
    }
    return this.soundcloudService;
  }

  static getAllServices(): MusicService[] {
    return [
      this.getYouTubeService(),
      this.getSpotifyService(),
      this.getSoundCloudService()
    ];
  }

  static getServiceByPlatform(platform: string): MusicService | null {
    switch (platform) {
      case 'youtube':
        return this.getYouTubeService();
      case 'spotify':
        return this.getSpotifyService();
      case 'soundcloud':
        return this.getSoundCloudService();
      default:
        return null;
    }
  }

  static async handleServiceUrl(query: string, requestedBy: string): Promise<Song[]> {
    const services = this.getAllServices();
    
    for (const service of services) {
      if (service.validateUrl(query)) {
        try {
          const song = await service.getSongFromUrl?.(query, requestedBy);
          return song ? [song] : [];
        } catch (error) {
          logger.error(`Error getting song from URL with service:`, error);
          ErrorTracking.captureException(error as Error, {
            errorType: 'service_url_error',
            service: service.constructor.name,
            url: query
          });
          return [];
        }
      }
    }
    
    return [];
  }

  static createSong(data: {
    title: string;
    artist: string;
    url: string;
    duration: number;
    thumbnail?: string;
    requestedBy: string;
    platform: Song['platform'];
  }): Song {
    return {
      title: data.title,
      artist: data.artist,
      url: data.url,
      duration: data.duration,
      thumbnail: data.thumbnail,
      requestedBy: data.requestedBy,
      platform: data.platform
    };
  }
}