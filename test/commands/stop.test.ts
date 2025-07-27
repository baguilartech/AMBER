import { StopCommand } from '../../src/commands/stop';
import { MusicPlayer } from '../../src/services/musicPlayer';

// Mock dependencies
jest.mock('../../src/services/musicPlayer');

describe('StopCommand', () => {
  let stopCommand: StopCommand;
  let mockMusicPlayer: jest.Mocked<MusicPlayer>;
  let mockInteraction: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MusicPlayer
    mockMusicPlayer = {
      stop: jest.fn()
    } as any;

    // Mock Discord interaction
    mockInteraction = {
      guildId: 'guild-123',
      user: {
        id: 'test-user-id',
        username: 'testuser'
      },
      reply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
      isRepliable: jest.fn().mockReturnValue(true),
      replied: false,
      deferred: false
    };

    stopCommand = new StopCommand(mockMusicPlayer);
  });

  describe('constructor', () => {
    it('should initialize with music player', () => {
      expect(stopCommand).toBeInstanceOf(StopCommand);
    });
  });

  describe('data', () => {
    it('should return correct slash command data', () => {
      const data = stopCommand.data;
      expect(data.name).toBe('stop');
      expect(data.description).toBe('Stop the music and clear the queue');
    });
  });

  describe('execute', () => {
    it('should stop playback successfully', async () => {
      // Mock that interaction hasn't been replied/deferred yet
      mockInteraction.replied = false;
      mockInteraction.deferred = false;
      mockInteraction.isRepliable.mockReturnValue(true);
      
      await stopCommand.execute(mockInteraction);

      expect(mockMusicPlayer.stop).toHaveBeenCalledWith('guild-123');
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Stopped the music and cleared the queue.'
      });
    });

    it('should handle errors gracefully', async () => {
      mockMusicPlayer.stop.mockImplementation(() => {
        throw new Error('Test error');
      });

      // Mock the handleError method
      const handleErrorSpy = jest.spyOn(stopCommand as any, 'handleError').mockImplementation();

      await stopCommand.execute(mockInteraction);

      expect(handleErrorSpy).toHaveBeenCalledWith(mockInteraction, expect.any(Error), 'stop');
      handleErrorSpy.mockRestore();
    });
  });
}); 