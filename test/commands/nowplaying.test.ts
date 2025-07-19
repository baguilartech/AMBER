import { NowPlayingCommand } from '../../src/commands/nowplaying';
import { QueueManager } from '../../src/services/queueManager';
import { Song } from '../../src/types';

// Mock dependencies
jest.mock('../../src/services/queueManager');
jest.mock('../../src/utils/formatters', () => ({
  formatDuration: jest.fn((duration) => `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`),
  formatVolume: jest.fn((volume) => `${Math.round(volume * 100)}%`),
  capitalizeFirst: jest.fn((str) => str.charAt(0).toUpperCase() + str.slice(1)),
  createNowPlayingEmbed: jest.fn(() => ({
    addFields: jest.fn().mockReturnThis()
  }))
}));

describe('NowPlayingCommand', () => {
  let nowPlayingCommand: NowPlayingCommand;
  let mockQueueManager: jest.Mocked<QueueManager>;
  let mockInteraction: any;

  const mockSong: Song = {
    title: 'Test Song',
    artist: 'Test Artist',
    url: 'https://test.com/song',
    duration: 180,
    requestedBy: 'testuser',
    platform: 'youtube'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock QueueManager
    mockQueueManager = {
      getCurrentSong: jest.fn(),
      getQueue: jest.fn()
    } as any;

    // Mock Discord interaction
    mockInteraction = {
      guildId: 'guild-123',
      user: {
        username: 'testuser'
      },
      reply: jest.fn().mockResolvedValue(undefined)
    };

    nowPlayingCommand = new NowPlayingCommand(mockQueueManager);
  });

  describe('constructor', () => {
    it('should initialize with queue manager', () => {
      expect(nowPlayingCommand).toBeInstanceOf(NowPlayingCommand);
    });
  });

  describe('data', () => {
    it('should return correct slash command data', () => {
      const data = nowPlayingCommand.data;
      expect(data.name).toBe('nowplaying');
      expect(data.description).toBe('Show the currently playing song');
    });
  });

  describe('execute', () => {
    it('should handle no current song', async () => {
      mockQueueManager.getCurrentSong.mockReturnValue(null);

      await nowPlayingCommand.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Nothing is currently playing.',
        flags: [1 << 6] // MessageFlags.Ephemeral
      });
    });

    it('should show current song information', async () => {
      mockQueueManager.getCurrentSong.mockReturnValue(mockSong);
      mockQueueManager.getQueue.mockReturnValue({
        songs: [mockSong],
        currentIndex: 0,
        isPlaying: true,
        isPaused: false,
        volume: 0.5
      });

      await nowPlayingCommand.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        embeds: [expect.any(Object)]
      });
    });

    it('should show paused status when song is paused', async () => {
      mockQueueManager.getCurrentSong.mockReturnValue(mockSong);
      mockQueueManager.getQueue.mockReturnValue({
        songs: [mockSong],
        currentIndex: 0,
        isPlaying: true,
        isPaused: true,
        volume: 0.5
      });

      await nowPlayingCommand.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        embeds: [expect.any(Object)]
      });
    });

    it('should handle errors gracefully', async () => {
      mockQueueManager.getCurrentSong.mockImplementation(() => {
        throw new Error('Test error');
      });

      // Mock the handleError method to avoid issues with the protected method
      const handleErrorSpy = jest.spyOn(nowPlayingCommand as any, 'handleError').mockImplementation();

      await nowPlayingCommand.execute(mockInteraction);

      expect(handleErrorSpy).toHaveBeenCalledWith(mockInteraction, expect.any(Error), 'nowplaying');
      handleErrorSpy.mockRestore();
    });
  });
}); 