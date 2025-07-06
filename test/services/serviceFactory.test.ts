import { ServiceFactory } from '../../src/services/serviceFactory';
import { YouTubeService } from '../../src/services/youtubeService';
import { SpotifyService } from '../../src/services/spotifyService';
import { SoundCloudService } from '../../src/services/soundcloudService';

// Mock the services
jest.mock('../../src/services/youtubeService');
jest.mock('../../src/services/spotifyService');
jest.mock('../../src/services/soundcloudService');

describe('ServiceFactory', () => {
  beforeEach(() => {
    // Reset the singleton instances before each test
    (ServiceFactory as any).youtubeService = undefined;
    (ServiceFactory as any).spotifyService = undefined;
    (ServiceFactory as any).soundcloudService = undefined;
    jest.clearAllMocks();
  });

  describe('getYouTubeService', () => {
    it('should create and return YouTube service instance', () => {
      const service = ServiceFactory.getYouTubeService();
      
      expect(service).toBeInstanceOf(YouTubeService);
      expect(YouTubeService).toHaveBeenCalledTimes(1);
    });

    it('should return the same instance on subsequent calls', () => {
      const service1 = ServiceFactory.getYouTubeService();
      const service2 = ServiceFactory.getYouTubeService();
      
      expect(service1).toBe(service2);
      expect(YouTubeService).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSpotifyService', () => {
    it('should create and return Spotify service instance', () => {
      const service = ServiceFactory.getSpotifyService();
      
      expect(service).toBeInstanceOf(SpotifyService);
      expect(SpotifyService).toHaveBeenCalledTimes(1);
    });

    it('should return the same instance on subsequent calls', () => {
      const service1 = ServiceFactory.getSpotifyService();
      const service2 = ServiceFactory.getSpotifyService();
      
      expect(service1).toBe(service2);
      expect(SpotifyService).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSoundCloudService', () => {
    it('should create and return SoundCloud service instance', () => {
      const service = ServiceFactory.getSoundCloudService();
      
      expect(service).toBeInstanceOf(SoundCloudService);
      expect(SoundCloudService).toHaveBeenCalledTimes(1);
    });

    it('should return the same instance on subsequent calls', () => {
      const service1 = ServiceFactory.getSoundCloudService();
      const service2 = ServiceFactory.getSoundCloudService();
      
      expect(service1).toBe(service2);
      expect(SoundCloudService).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllServices', () => {
    it('should return all service instances', () => {
      const services = ServiceFactory.getAllServices();
      
      expect(services).toHaveLength(3);
      expect(services[0]).toBeInstanceOf(YouTubeService);
      expect(services[1]).toBeInstanceOf(SpotifyService);
      expect(services[2]).toBeInstanceOf(SoundCloudService);
    });
  });

  describe('getServiceByPlatform', () => {
    it('should return YouTube service for youtube platform', () => {
      const service = ServiceFactory.getServiceByPlatform('youtube');
      
      expect(service).toBeInstanceOf(YouTubeService);
    });

    it('should return Spotify service for spotify platform', () => {
      const service = ServiceFactory.getServiceByPlatform('spotify');
      
      expect(service).toBeInstanceOf(SpotifyService);
    });

    it('should return SoundCloud service for soundcloud platform', () => {
      const service = ServiceFactory.getServiceByPlatform('soundcloud');
      
      expect(service).toBeInstanceOf(SoundCloudService);
    });

    it('should return null for unknown platform', () => {
      const service = ServiceFactory.getServiceByPlatform('unknown');
      
      expect(service).toBeNull();
    });
  });

  describe('handleServiceUrl', () => {
    let mockYouTubeService: any;
    let mockSpotifyService: any;
    let mockSoundCloudService: any;

    beforeEach(() => {
      mockYouTubeService = {
        validateUrl: jest.fn(),
        getSongFromUrl: jest.fn()
      };
      mockSpotifyService = {
        validateUrl: jest.fn(),
        getSongFromUrl: jest.fn()
      };
      mockSoundCloudService = {
        validateUrl: jest.fn(),
        getSongFromUrl: jest.fn()
      };

      (YouTubeService as any).mockImplementation(() => mockYouTubeService);
      (SpotifyService as any).mockImplementation(() => mockSpotifyService);
      (SoundCloudService as any).mockImplementation(() => mockSoundCloudService);
    });

    it('should return song from first matching service', async () => {
      const testSong = {
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://youtube.com/watch?v=123',
        duration: 180,
        thumbnail: 'test.jpg',
        requestedBy: 'TestUser',
        platform: 'youtube' as const
      };

      mockYouTubeService.validateUrl.mockReturnValue(true);
      mockYouTubeService.getSongFromUrl.mockResolvedValue(testSong);
      mockSpotifyService.validateUrl.mockReturnValue(false);
      mockSoundCloudService.validateUrl.mockReturnValue(false);

      const result = await ServiceFactory.handleServiceUrl('https://youtube.com/watch?v=123', 'TestUser');

      expect(result).toEqual([testSong]);
      expect(mockYouTubeService.validateUrl).toHaveBeenCalledWith('https://youtube.com/watch?v=123');
      expect(mockYouTubeService.getSongFromUrl).toHaveBeenCalledWith('https://youtube.com/watch?v=123', 'TestUser');
    });

    it('should return empty array when no service matches URL', async () => {
      mockYouTubeService.validateUrl.mockReturnValue(false);
      mockSpotifyService.validateUrl.mockReturnValue(false);
      mockSoundCloudService.validateUrl.mockReturnValue(false);

      const result = await ServiceFactory.handleServiceUrl('https://invalid-url.com', 'TestUser');

      expect(result).toEqual([]);
    });

    it('should return empty array when service returns null', async () => {
      mockYouTubeService.validateUrl.mockReturnValue(true);
      mockYouTubeService.getSongFromUrl.mockResolvedValue(null);

      const result = await ServiceFactory.handleServiceUrl('https://youtube.com/watch?v=123', 'TestUser');

      expect(result).toEqual([]);
    });

    it('should handle service errors gracefully', async () => {
      mockYouTubeService.validateUrl.mockReturnValue(true);
      mockYouTubeService.getSongFromUrl.mockRejectedValue(new Error('Service error'));

      const result = await ServiceFactory.handleServiceUrl('https://youtube.com/watch?v=123', 'TestUser');

      expect(result).toEqual([]);
    });

    it('should check all services until one matches', async () => {
      const testSong = {
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://soundcloud.com/track/123',
        duration: 180,
        thumbnail: 'test.jpg',
        requestedBy: 'TestUser',
        platform: 'soundcloud' as const
      };

      mockYouTubeService.validateUrl.mockReturnValue(false);
      mockSpotifyService.validateUrl.mockReturnValue(false);
      mockSoundCloudService.validateUrl.mockReturnValue(true);
      mockSoundCloudService.getSongFromUrl.mockResolvedValue(testSong);

      const result = await ServiceFactory.handleServiceUrl('https://soundcloud.com/track/123', 'TestUser');

      expect(result).toEqual([testSong]);
      expect(mockYouTubeService.validateUrl).toHaveBeenCalled();
      expect(mockSpotifyService.validateUrl).toHaveBeenCalled();
      expect(mockSoundCloudService.validateUrl).toHaveBeenCalled();
      expect(mockSoundCloudService.getSongFromUrl).toHaveBeenCalledWith('https://soundcloud.com/track/123', 'TestUser');
    });
  });

  describe('createSong', () => {
    it('should create a song object with all properties', () => {
      const songData = {
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://example.com/song',
        duration: 180,
        thumbnail: 'https://example.com/thumb.jpg',
        requestedBy: 'TestUser',
        platform: 'youtube' as const
      };

      const song = ServiceFactory.createSong(songData);

      expect(song).toEqual({
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://example.com/song',
        duration: 180,
        thumbnail: 'https://example.com/thumb.jpg',
        requestedBy: 'TestUser',
        platform: 'youtube'
      });
    });

    it('should create a song object without thumbnail', () => {
      const songData = {
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://example.com/song',
        duration: 180,
        requestedBy: 'TestUser',
        platform: 'spotify' as const
      };

      const song = ServiceFactory.createSong(songData);

      expect(song).toEqual({
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://example.com/song',
        duration: 180,
        thumbnail: undefined,
        requestedBy: 'TestUser',
        platform: 'spotify'
      });
    });
  });
});