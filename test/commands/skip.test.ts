import { SkipCommand } from '../../src/commands/skip';
import { MusicPlayer } from '../../src/services/musicPlayer';
import { Song } from '../../src/types';

// Mock dependencies
jest.mock('../../src/services/musicPlayer');

describe('SkipCommand', () => {
  let skipCommand: SkipCommand;
  let mockMusicPlayer: jest.Mocked<MusicPlayer>;
  let mockInteraction: any;

  const mockSong: Song = {
    title: 'Next Song',
    artist: 'Next Artist',
    url: 'https://test.com/next-song',
    duration: 200,
    requestedBy: 'testuser',
    platform: 'youtube'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MusicPlayer
    mockMusicPlayer = {
      skip: jest.fn()
    } as any;

    // Mock Discord interaction
    mockInteraction = {
      guildId: 'guild-123',
      user: {
        id: 'test-user-id',
        username: 'testuser'
      },
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
      reply: jest.fn().mockResolvedValue(undefined),
      isRepliable: jest.fn().mockReturnValue(true),
      replied: false,
      deferred: false
    };

    skipCommand = new SkipCommand(mockMusicPlayer);
  });

  describe('constructor', () => {
    it('should initialize with music player', () => {
      expect(skipCommand).toBeInstanceOf(SkipCommand);
    });
  });

  describe('data', () => {
    it('should return correct slash command data', () => {
      const data = skipCommand.data;
      expect(data.name).toBe('skip');
      expect(data.description).toBe('Skip the current song');
    });
  });

  describe('execute', () => {
    it('should skip to next song successfully', async () => {
      mockMusicPlayer.skip.mockResolvedValue(mockSong);

      await skipCommand.execute(mockInteraction);

      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockMusicPlayer.skip).toHaveBeenCalledWith('guild-123');
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: `Skipped! Now playing: **${mockSong.title}** by **${mockSong.artist}**`
      });
    });

    it('should handle when no next song available', async () => {
      mockMusicPlayer.skip.mockResolvedValue(null);

      await skipCommand.execute(mockInteraction);

      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockMusicPlayer.skip).toHaveBeenCalledWith('guild-123');
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Skipped! No more songs in the queue.'
      });
    });

    it('should handle errors gracefully', async () => {
      mockMusicPlayer.skip.mockRejectedValue(new Error('Test error'));

      // Mock the handleError method
      const handleErrorSpy = jest.spyOn(skipCommand as any, 'handleError').mockImplementation();

      await skipCommand.execute(mockInteraction);

      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(handleErrorSpy).toHaveBeenCalledWith(mockInteraction, expect.any(Error), 'skip');
      handleErrorSpy.mockRestore();
    });

    it('should handle non-repliable interaction', async () => {
      mockInteraction.isRepliable.mockReturnValue(false);
      const loggerSpy = jest.spyOn(require('../../src/utils/logger').logger, 'warn');

      await skipCommand.execute(mockInteraction);

      expect(loggerSpy).toHaveBeenCalledWith('Skip command interaction no longer repliable', expect.any(Object));
      expect(mockInteraction.deferReply).not.toHaveBeenCalled();
    });

    it('should handle defer errors with code 10062', async () => {
      const deferError = new Error('Interaction expired');
      (deferError as any).code = 10062;
      mockInteraction.deferReply.mockRejectedValue(deferError);
      const loggerSpy = jest.spyOn(require('../../src/utils/logger').logger, 'warn');

      await skipCommand.execute(mockInteraction);

      expect(loggerSpy).toHaveBeenCalledWith('Skip command interaction already expired', expect.any(Object));
      expect(mockMusicPlayer.skip).not.toHaveBeenCalled();
    });

    it('should re-throw non-10062 defer errors', async () => {
      const deferError = new Error('Some other defer error');
      mockInteraction.deferReply.mockRejectedValue(deferError);

      await expect(skipCommand.execute(mockInteraction)).rejects.toThrow('Some other defer error');
    });
  });
}); 