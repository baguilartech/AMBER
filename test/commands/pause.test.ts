import { PauseCommand } from '../../src/commands/pause';
import { MusicPlayer } from '../../src/services/musicPlayer';

// Mock dependencies
jest.mock('../../src/services/musicPlayer');

describe('PauseCommand', () => {
  let pauseCommand: PauseCommand;
  let mockMusicPlayer: jest.Mocked<MusicPlayer>;
  let mockInteraction: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MusicPlayer
    mockMusicPlayer = {
      pause: jest.fn()
    } as any;

    // Mock Discord interaction
    mockInteraction = {
      guildId: 'guild-123',
      user: {
        username: 'testuser'
      },
      reply: jest.fn().mockResolvedValue(undefined)
    };

    pauseCommand = new PauseCommand(mockMusicPlayer);
  });

  describe('constructor', () => {
    it('should initialize with music player', () => {
      expect(pauseCommand).toBeInstanceOf(PauseCommand);
    });
  });

  describe('data', () => {
    it('should return correct slash command data', () => {
      const data = pauseCommand.data;
      expect(data.name).toBe('pause');
      expect(data.description).toBe('Pause the current song');
    });
  });

  describe('execute', () => {
    it('should pause playback successfully', async () => {
      mockMusicPlayer.pause.mockReturnValue(true);

      await pauseCommand.execute(mockInteraction);

      expect(mockMusicPlayer.pause).toHaveBeenCalledWith('guild-123');
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Paused the music.'
      });
    });

    it('should handle when no music is playing', async () => {
      mockMusicPlayer.pause.mockReturnValue(false);

      await pauseCommand.execute(mockInteraction);

      expect(mockMusicPlayer.pause).toHaveBeenCalledWith('guild-123');
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Nothing is currently playing.',
        flags: [1 << 6] // MessageFlags.Ephemeral
      });
    });
  });
}); 