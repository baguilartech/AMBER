import { VolumeCommand } from '../../src/commands/volume';
import { MusicPlayer } from '../../src/services/musicPlayer';

// Mock dependencies
jest.mock('../../src/services/musicPlayer');

describe('VolumeCommand', () => {
  let volumeCommand: VolumeCommand;
  let mockMusicPlayer: jest.Mocked<MusicPlayer>;
  let mockInteraction: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MusicPlayer
    mockMusicPlayer = {
      setVolume: jest.fn()
    } as any;

    // Mock Discord interaction
    mockInteraction = {
      guildId: 'guild-123',
      user: {
        username: 'testuser'
      },
      options: {
        getInteger: jest.fn()
      },
      reply: jest.fn().mockResolvedValue(undefined)
    };

    volumeCommand = new VolumeCommand(mockMusicPlayer);
  });

  describe('constructor', () => {
    it('should initialize with music player', () => {
      expect(volumeCommand).toBeInstanceOf(VolumeCommand);
    });
  });

  describe('data', () => {
    it('should return correct slash command data', () => {
      const data = volumeCommand.data;
      expect(data.name).toBe('volume');
      expect(data.description).toBe('Set the music volume');
    });
  });

  describe('execute', () => {
    it('should set volume successfully', async () => {
      mockInteraction.options.getInteger.mockReturnValue(75);
      mockMusicPlayer.setVolume.mockReturnValue(true);

      await volumeCommand.execute(mockInteraction);

      expect(mockMusicPlayer.setVolume).toHaveBeenCalledWith('guild-123', 0.75);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Volume set to 75%'
      });
    });

    it('should handle when no music is playing', async () => {
      mockInteraction.options.getInteger.mockReturnValue(50);
      mockMusicPlayer.setVolume.mockReturnValue(false);

      await volumeCommand.execute(mockInteraction);

      expect(mockMusicPlayer.setVolume).toHaveBeenCalledWith('guild-123', 0.5);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Nothing is currently playing.',
        ephemeral: true
      });
    });

    it('should handle high volume values', async () => {
      mockInteraction.options.getInteger.mockReturnValue(150);
      mockMusicPlayer.setVolume.mockReturnValue(true);

      await volumeCommand.execute(mockInteraction);

      expect(mockMusicPlayer.setVolume).toHaveBeenCalledWith('guild-123', 1.5);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Volume set to 150%'
      });
    });

    it('should handle negative volume', async () => {
      mockInteraction.options.getInteger.mockReturnValue(-10);
      mockMusicPlayer.setVolume.mockReturnValue(true);

      await volumeCommand.execute(mockInteraction);

      expect(mockMusicPlayer.setVolume).toHaveBeenCalledWith('guild-123', -0.1);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Volume set to -10%'
      });
    });
  });
}); 