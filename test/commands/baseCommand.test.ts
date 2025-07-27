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

    protected async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
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
    } as any;

    testCommand = new TestCommand();
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should call executeCommand with proper tracing and context', async () => {
      const ErrorTracking = require('../../src/utils/monitoring').ErrorTracking;
      const traceCommandSpy = jest.spyOn(ErrorTracking, 'traceCommand').mockImplementation((_name, _guildId, _userId, callback) => (callback as () => Promise<void>)());
      const setUserSpy = jest.spyOn(ErrorTracking, 'setUser');
      const addBreadcrumbSpy = jest.spyOn(ErrorTracking, 'addBreadcrumb');
      
      mockInteraction.channelId = 'test-channel-id';
      // Set the interaction to deferred state since replySuccess calls editReply
      mockInteraction.deferred = true;

      await testCommand.execute(mockInteraction);

      expect(traceCommandSpy).toHaveBeenCalledWith('test', 'test-guild-id', 'test-user-id', expect.any(Function));
      expect(setUserSpy).toHaveBeenCalledWith('test-user-id', 'testuser');
      expect(addBreadcrumbSpy).toHaveBeenCalledWith('Command executed: test', 'command', {
        guildId: 'test-guild-id',
        commandName: 'test',
        channelId: 'test-channel-id'
      });
      expect(mockInteraction.editReply).toHaveBeenCalledWith({ content: 'Test executed' });

      traceCommandSpy.mockRestore();
      setUserSpy.mockRestore();
      addBreadcrumbSpy.mockRestore();
    });
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
        flags: [1 << 6] // MessageFlags.Ephemeral
      });
      // Explicitly verify flags property IS included for error messages
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: expect.arrayContaining([64]) // 1 << 6 = 64
        })
      );
    });

    it('should handle reply errors gracefully', async () => {
      const message = 'Error message';
      const error = new Error('Interaction expired');
      (error as any).code = 10062;
      const loggerSpy = jest.spyOn(require('../../src/utils/logger').logger, 'warn');
      mockInteraction.reply.mockRejectedValue(error);

      await testCommand.testReplyError(mockInteraction, message);

      expect(loggerSpy).toHaveBeenCalledWith('Interaction expired - cannot send error message', expect.any(Object));
    });

    it('should handle non-repliable interaction in replyError', async () => {
      const message = 'Error message';
      mockInteraction.isRepliable.mockReturnValue(false);
      const loggerSpy = jest.spyOn(require('../../src/utils/logger').logger, 'warn');

      await testCommand.testReplyError(mockInteraction, message);

      expect(loggerSpy).toHaveBeenCalledWith('Interaction no longer repliable', expect.any(Object));
    });

    it('should handle non-10062 reply errors gracefully', async () => {
      const message = 'Error message';
      const error = new Error('Some other error');
      const loggerSpy = jest.spyOn(require('../../src/utils/monitoring').SentryLogger, 'error');
      mockInteraction.reply.mockRejectedValue(error);

      await testCommand.testReplyError(mockInteraction, message);

      expect(loggerSpy).toHaveBeenCalledWith('Failed to reply with error message', error, expect.any(Object));
    });
  });

  describe('replySuccess', () => {
    it('should reply with success message without ephemeral flag', async () => {
      const message = 'Success message';

      await testCommand.testReplySuccess(mockInteraction, message);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: message
      });
      // Explicitly verify no flags property is added for success messages
      expect(mockInteraction.reply).not.toHaveBeenCalledWith(
        expect.objectContaining({
          flags: expect.any(Array)
        })
      );
    });

    it('should use editReply when interaction is deferred', async () => {
      const message = 'Success message';
      mockInteraction.deferred = true;

      await testCommand.testReplySuccess(mockInteraction, message);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: message
      });
      expect(mockInteraction.reply).not.toHaveBeenCalled();
    });

    it('should handle explicit false parameter in sendReply', async () => {
      // Create a test class that exposes the protected sendReply method
      class TestCommandWithSendReply extends TestCommand {
        public async testSendReply(interaction: ChatInputCommandInteraction, message: string, isError?: boolean): Promise<void> {
          return this.sendReply(interaction, message, isError);
        }
      }
      
      const testCommandWithSendReply = new TestCommandWithSendReply();
      const message = 'Test message';
      
      // Explicitly pass false to cover the branch
      await testCommandWithSendReply.testSendReply(mockInteraction, message, false);
      
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: message
      });
      // Verify no flags are added when explicitly passing false
      expect(mockInteraction.reply).not.toHaveBeenCalledWith(
        expect.objectContaining({
          flags: expect.any(Array)
        })
      );
    });

    it('should use default false parameter when isError not provided to sendReply', async () => {
      // Create a test class that calls sendReply without the third parameter
      class TestCommandWithDefaultParam extends TestCommand {
        public async testSendReplyWithDefault(interaction: ChatInputCommandInteraction, message: string): Promise<void> {
          // Call sendReply with only 2 parameters to trigger default parameter branch
          return this.sendReply(interaction, message);
        }
      }
      
      const testCommandWithDefault = new TestCommandWithDefaultParam();
      const message = 'Default param test';
      
      // Call without isError parameter to use default value
      await testCommandWithDefault.testSendReplyWithDefault(mockInteraction, message);
      
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: message
      });
      // Verify no flags are added when using default false
      expect(mockInteraction.reply).not.toHaveBeenCalledWith(
        expect.objectContaining({
          flags: expect.any(Array)
        })
      );
    });

    it('should handle reply errors gracefully', async () => {
      const message = 'Success message';
      const error = new Error('Interaction expired');
      (error as any).code = 10062;
      const loggerSpy = jest.spyOn(require('../../src/utils/logger').logger, 'warn');
      mockInteraction.reply.mockRejectedValue(error);

      await testCommand.testReplySuccess(mockInteraction, message);

      expect(loggerSpy).toHaveBeenCalledWith('Interaction expired - cannot send success message', expect.any(Object));
    });

    it('should handle non-repliable interaction in replySuccess', async () => {
      const message = 'Success message';
      mockInteraction.isRepliable.mockReturnValue(false);
      const loggerSpy = jest.spyOn(require('../../src/utils/logger').logger, 'warn');

      await testCommand.testReplySuccess(mockInteraction, message);

      expect(loggerSpy).toHaveBeenCalledWith('Interaction no longer repliable', expect.any(Object));
    });

    it('should handle non-10062 reply errors gracefully', async () => {
      const message = 'Success message';
      const error = new Error('Some other error');
      const loggerSpy = jest.spyOn(require('../../src/utils/monitoring').SentryLogger, 'error');
      mockInteraction.reply.mockRejectedValue(error);

      await testCommand.testReplySuccess(mockInteraction, message);

      expect(loggerSpy).toHaveBeenCalledWith('Failed to reply with success message', error, expect.any(Object));
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
      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
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
      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: errorMessage
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

    it('should handle defer errors in executeBooleanOperation', async () => {
      const deferError = new Error('Defer failed');
      (deferError as any).code = 10062;
      mockInteraction.deferReply.mockRejectedValue(deferError);
      const operation = jest.fn().mockReturnValue(true);
      const loggerSpy = jest.spyOn(require('../../src/utils/logger').logger, 'warn');

      await testCommand.testExecuteBooleanOperation(
        mockInteraction,
        operation,
        'Success',
        'Error',
        'test'
      );

      expect(loggerSpy).toHaveBeenCalledWith('Interaction already expired, cannot defer', expect.any(Object));
      expect(operation).not.toHaveBeenCalled();
    });

    it('should throw non-10062 defer errors in executeBooleanOperation', async () => {
      const deferError = new Error('Some other defer error');
      mockInteraction.deferReply.mockRejectedValue(deferError);
      const operation = jest.fn().mockReturnValue(true);

      await expect(testCommand.testExecuteBooleanOperation(
        mockInteraction,
        operation,
        'Success',
        'Error',
        'test'
      )).rejects.toThrow('Some other defer error');
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

    protected async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
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

    protected async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
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