import { ResumeCommand } from '../../src/commands/resume';
import { MusicPlayer } from '../../src/services/musicPlayer';

// Mock dependencies
jest.mock('../../src/services/musicPlayer');

describe('ResumeCommand', () => {
  let resumeCommand: ResumeCommand;
  let mockMusicPlayer: jest.Mocked<MusicPlayer>;
  let mockInteraction: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MusicPlayer
    mockMusicPlayer = {
      resume: jest.fn()
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
      deferReply: jest.fn().mockImplementation(() => { 
        mockInteraction.deferred = true;
        return Promise.resolve();
      }),
      isRepliable: jest.fn().mockReturnValue(true),
      replied: false,
      deferred: false
    };

    resumeCommand = new ResumeCommand(mockMusicPlayer);
  });

  describe('constructor', () => {
    it('should initialize with music player', () => {
      expect(resumeCommand).toBeInstanceOf(ResumeCommand);
    });
  });

  describe('data', () => {
    it('should return correct slash command data', () => {
      const data = resumeCommand.data;
      expect(data.name).toBe('resume');
      expect(data.description).toBe('Resume the paused song');
    });
  });

  describe('execute', () => {
    it('should resume playback successfully', async () => {
      mockMusicPlayer.resume.mockReturnValue(true);

      await resumeCommand.execute(mockInteraction);

      expect(mockMusicPlayer.resume).toHaveBeenCalledWith('guild-123');
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Resumed the music.'
      });
    });

    it('should handle when no music is paused', async () => {
      mockMusicPlayer.resume.mockReturnValue(false);

      await resumeCommand.execute(mockInteraction);

      expect(mockMusicPlayer.resume).toHaveBeenCalledWith('guild-123');
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Nothing is currently paused.'
      });
    });
  });
}); 