import { BaseMusicService } from '../../src/services/baseMusicService';
import { Song } from '../../src/types';
import { ErrorHandler } from '../../src/utils/errorHandler';
import { ServiceFactory } from '../../src/services/serviceFactory';

// Mock dependencies
jest.mock('../../src/utils/errorHandler');
jest.mock('../../src/services/serviceFactory');

describe('BaseMusicService', () => {
  let testService: TestMusicService;

  // Create a concrete test class
  class TestMusicService extends BaseMusicService {
    protected platform = 'test';

    async search(query: string): Promise<Song[]> {
      return [];
    }

    async getStreamUrl(song: Song): Promise<string> {
      return 'https://test.stream';
    }

    validateUrl(url: string): boolean {
      return url.includes('test.com');
    }

    isConfigured(): boolean {
      return true;
    }

    // Expose protected methods for testing
    public testLogNoResults(query: string): void {
      this.logNoResults(query);
    }

    public testLogSearchResults(count: number, query: string): void {
      this.logSearchResults(count, query);
    }

    public testLogServiceError(operation: string, error: Error): void {
      this.logServiceError(operation, error);
    }

    public testCreateSong(data: {
      title: string;
      artist: string;
      url: string;
      duration: number;
      thumbnail?: string;
      requestedBy: string;
      platform: Song['platform'];
    }): Song {
      return this.createSong(data);
    }

    public async testHandleSearchError(error: Error): Promise<Song[]> {
      return this.handleSearchError(error);
    }
  }

  beforeEach(() => {
    testService = new TestMusicService();
    jest.clearAllMocks();
  });

  describe('logNoResults', () => {
    it('should call ErrorHandler.logNoResults', () => {
      testService.testLogNoResults('test query');
      
      expect(ErrorHandler.logNoResults).toHaveBeenCalledWith('test', 'test query');
    });
  });

  describe('logSearchResults', () => {
    it('should call ErrorHandler.logSearchResults', () => {
      testService.testLogSearchResults(5, 'test query');
      
      expect(ErrorHandler.logSearchResults).toHaveBeenCalledWith('test', 5, 'test query');
    });
  });

  describe('logServiceError', () => {
    it('should call ErrorHandler.logServiceError', () => {
      const error = new Error('Test error');
      testService.testLogServiceError('testing', error);
      
      expect(ErrorHandler.logServiceError).toHaveBeenCalledWith('test', 'testing', error);
    });
  });

  describe('createSong', () => {
    it('should call ServiceFactory.createSong', () => {
      const songData = {
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://test.com/song',
        duration: 180,
        thumbnail: 'https://test.com/thumb.jpg',
        requestedBy: 'TestUser',
        platform: 'youtube' as const
      };

      const mockSong = { ...songData };
      (ServiceFactory.createSong as jest.Mock).mockReturnValue(mockSong);

      const result = testService.testCreateSong(songData);

      expect(ServiceFactory.createSong).toHaveBeenCalledWith(songData);
      expect(result).toBe(mockSong);
    });
  });

  describe('handleSearchError', () => {
    it('should log error and return empty array', async () => {
      const error = new Error('Search error');
      
      const result = await testService.testHandleSearchError(error);
      
      expect(ErrorHandler.logServiceError).toHaveBeenCalledWith('test', 'searching', error);
      expect(result).toEqual([]);
    });
  });

  describe('getSongFromUrl', () => {
    it('should return null by default', async () => {
      const result = await testService.getSongFromUrl?.('https://test.com/song', 'TestUser');
      
      expect(result).toBeNull();
    });
  });
});