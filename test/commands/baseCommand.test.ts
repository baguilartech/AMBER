import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BaseCommandClass, BaseMusicPlayerCommand, BaseQueueCommand } from '../../src/commands/baseCommand';
import { ErrorHandler } from '../../src/utils/errorHandler';
import { MusicPlayer } from '../../src/services/musicPlayer';
import { QueueManager } from '../../src/services/queueManager';

// Mock dependencies
jest.mock('../../src/utils/errorHandler');
jest.mock('../../src/services/musicPlayer');
jest.mock('../../src/services/queueManager');

describe('BaseCommandClass', () => {
  let mockInteraction: jest.Mocked<ChatInputCommandInteraction>;
  let testCommand: TestCommand;

  // Create a concrete test class that exposes protected methods for testing
  class TestCommand extends BaseCommandClass {
    get data(): SlashCommandBuilder {
      return new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test command');
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
      await this.replySuccess(interaction, 'Test executed');
    }

    // Public methods to test protected functionality
    public testGetGuildId(interaction: ChatInputCommandInteraction): string {
      return this.getGuildId(interaction);
    }

    public async testHandleError(interaction: ChatInputCommandInteraction, error: Error, commandName: string): Promise<void> {
      await this.handleError(interaction, error, commandName);
    }

    public async testReplyError(interaction: ChatInputCommandInteraction, message: string): Promise<void> {
      await this.replyError(interaction, message);
    }

    public async testReplySuccess(interaction: ChatInputCommandInteraction, message: string): Promise<void> {
      await this.replySuccess(interaction, message);
    }

    public async testExecuteBooleanOperation(
      interaction: ChatInputCommandInteraction,
      operation: () => boolean,
      successMessage: string,
      errorMessage: string,
      commandName: string
    ): Promise<void> {
      await this.executeBooleanOperation(interaction, operation, successMessage, errorMessage, commandName);
    }
  }

  beforeEach(() => {
    mockInteraction = {
      guildId: 'test-guild-id',
      user: {
        username: 'testuser'
      },
      reply: jest.fn().mockResolvedValue(undefined)
    } as any;

    testCommand = new TestCommand();
    jest.clearAllMocks();
  });

  describe('getGuildId', () => {
    it('should return the guild ID from interaction', () => {
      const guildId = testCommand.testGetGuildId(mockInteraction);
      expect(guildId).toBe('test-guild-id');
    });
  });

  describe('handleError', () => {
    it('should call ErrorHandler.handleCommandError', async () => {
      const error = new Error('Test error');
      const commandName = 'test';

      await testCommand.testHandleError(mockInteraction, error, commandName);

      expect(ErrorHandler.handleCommandError).toHaveBeenCalledWith(mockInteraction, error, commandName);
    });
  });

  describe('replyError', () => {
    it('should reply with error message as ephemeral', async () => {
      const message = 'Error message';

      await testCommand.testReplyError(mockInteraction, message);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: message,
        ephemeral: true
      });
    });
  });

  describe('replySuccess', () => {
    it('should reply with success message', async () => {
      const message = 'Success message';

      await testCommand.testReplySuccess(mockInteraction, message);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: message
      });
    });
  });

  describe('executeBooleanOperation', () => {
    it('should reply with success message when operation returns true', async () => {
      const operation = jest.fn().mockReturnValue(true);
      const successMessage = 'Operation succeeded';
      const errorMessage = 'Operation failed';
      const commandName = 'test';

      await testCommand.testExecuteBooleanOperation(
        mockInteraction,
        operation,
        successMessage,
        errorMessage,
        commandName
      );

      expect(operation).toHaveBeenCalled();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: successMessage
      });
    });

    it('should reply with error message when operation returns false', async () => {
      const operation = jest.fn().mockReturnValue(false);
      const successMessage = 'Operation succeeded';
      const errorMessage = 'Operation failed';
      const commandName = 'test';

      await testCommand.testExecuteBooleanOperation(
        mockInteraction,
        operation,
        successMessage,
        errorMessage,
        commandName
      );

      expect(operation).toHaveBeenCalled();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: errorMessage,
        ephemeral: true
      });
    });

    it('should handle errors during operation execution', async () => {
      const error = new Error('Operation error');
      const operation = jest.fn().mockImplementation(() => {
        throw error;
      });
      const successMessage = 'Operation succeeded';
      const errorMessage = 'Operation failed';
      const commandName = 'test';

      await testCommand.testExecuteBooleanOperation(
        mockInteraction,
        operation,
        successMessage,
        errorMessage,
        commandName
      );

      expect(operation).toHaveBeenCalled();
      expect(ErrorHandler.handleCommandError).toHaveBeenCalledWith(mockInteraction, error, commandName);
    });
  });
});

describe('BaseMusicPlayerCommand', () => {
  let mockMusicPlayer: jest.Mocked<MusicPlayer>;
  let testCommand: TestMusicPlayerCommand;

  class TestMusicPlayerCommand extends BaseMusicPlayerCommand {
    get data(): SlashCommandBuilder {
      return new SlashCommandBuilder()
        .setName('test-music')
        .setDescription('Test music command');
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
      await this.replySuccess(interaction, 'Music command executed');
    }

    public getMusicPlayer(): MusicPlayer {
      return this.musicPlayer;
    }
  }

  beforeEach(() => {
    mockMusicPlayer = {} as any;
    testCommand = new TestMusicPlayerCommand(mockMusicPlayer);
    jest.clearAllMocks();
  });

  it('should initialize with music player', () => {
    expect(testCommand.getMusicPlayer()).toBe(mockMusicPlayer);
  });

  it('should extend BaseCommandClass', () => {
    expect(testCommand instanceof BaseCommandClass).toBe(true);
  });
});

describe('BaseQueueCommand', () => {
  let mockQueueManager: jest.Mocked<QueueManager>;
  let testCommand: TestQueueCommand;

  class TestQueueCommand extends BaseQueueCommand {
    get data(): SlashCommandBuilder {
      return new SlashCommandBuilder()
        .setName('test-queue')
        .setDescription('Test queue command');
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
      await this.replySuccess(interaction, 'Queue command executed');
    }

    public getQueueManager(): QueueManager {
      return this.queueManager;
    }
  }

  beforeEach(() => {
    mockQueueManager = {} as any;
    testCommand = new TestQueueCommand(mockQueueManager);
    jest.clearAllMocks();
  });

  it('should initialize with queue manager', () => {
    expect(testCommand.getQueueManager()).toBe(mockQueueManager);
  });

  it('should extend BaseCommandClass', () => {
    expect(testCommand instanceof BaseCommandClass).toBe(true);
  });
});