import { CommandRegistry, Command } from '../../src/utils/commandRegistry';
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

describe('CommandRegistry', () => {
  let commandRegistry: CommandRegistry;
  let mockCommand: Command;
  let mockInteraction: jest.Mocked<ChatInputCommandInteraction>;

  beforeEach(() => {
    commandRegistry = new CommandRegistry();
    
    mockCommand = {
      data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test command'),
      execute: jest.fn()
    };

    mockInteraction = {
      commandName: 'test',
      reply: jest.fn()
    } as any;

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a command', () => {
      commandRegistry.register(mockCommand);
      
      const retrievedCommand = commandRegistry.get('test');
      expect(retrievedCommand).toBe(mockCommand);
    });
  });

  describe('registerMultiple', () => {
    it('should register multiple commands', () => {
      const mockCommand2: Command = {
        data: new SlashCommandBuilder()
          .setName('test2')
          .setDescription('Test command 2'),
        execute: jest.fn()
      };

      commandRegistry.registerMultiple([mockCommand, mockCommand2]);
      
      expect(commandRegistry.get('test')).toBe(mockCommand);
      expect(commandRegistry.get('test2')).toBe(mockCommand2);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent command', () => {
      const result = commandRegistry.get('nonexistent');
      
      expect(result).toBeUndefined();
    });

    it('should return the correct command', () => {
      commandRegistry.register(mockCommand);
      
      const result = commandRegistry.get('test');
      
      expect(result).toBe(mockCommand);
    });
  });

  describe('getAll', () => {
    it('should return all registered commands', () => {
      commandRegistry.register(mockCommand);
      
      const allCommands = commandRegistry.getAll();
      
      expect(allCommands.size).toBe(1);
      expect(allCommands.get('test')).toBe(mockCommand);
    });
  });

  describe('getCommandData', () => {
    it('should return command data for Discord API', () => {
      commandRegistry.register(mockCommand);
      
      const commandData = commandRegistry.getCommandData();
      
      expect(commandData).toHaveLength(1);
      expect(commandData[0]).toEqual(mockCommand.data.toJSON());
    });
  });

  describe('executeCommand', () => {
    beforeEach(() => {
      commandRegistry.register(mockCommand);
    });

    it('should execute the correct command', async () => {
      await commandRegistry.executeCommand(mockInteraction);
      
      expect(mockCommand.execute).toHaveBeenCalledWith(mockInteraction);
    });

    it('should reply with error for unknown command', async () => {
      mockInteraction.commandName = 'unknown';
      
      await commandRegistry.executeCommand(mockInteraction);
      
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Unknown command!',
        flags: [1 << 6] // MessageFlags.Ephemeral
      });
    });

    it('should handle command execution errors', async () => {
      const error = new Error('Command failed');
      mockCommand.execute = jest.fn().mockRejectedValue(error);
      
      mockInteraction.replied = false;
      mockInteraction.deferred = false;
      
      await commandRegistry.executeCommand(mockInteraction);
      
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'There was an error executing this command!',
        flags: [1 << 6] // MessageFlags.Ephemeral
      });
    });

    it('should use followUp if interaction already replied', async () => {
      const error = new Error('Command failed');
      mockCommand.execute = jest.fn().mockRejectedValue(error);
      
      mockInteraction.replied = true;
      mockInteraction.followUp = jest.fn();
      
      await commandRegistry.executeCommand(mockInteraction);
      
      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: 'There was an error executing this command!',
        flags: [1 << 6] // MessageFlags.Ephemeral
      });
    });

    it('should use followUp if interaction already deferred', async () => {
      const error = new Error('Command failed');
      mockCommand.execute = jest.fn().mockRejectedValue(error);
      
      mockInteraction.replied = false;
      mockInteraction.deferred = true;
      mockInteraction.followUp = jest.fn();
      
      await commandRegistry.executeCommand(mockInteraction);
      
      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: 'There was an error executing this command!',
        flags: [1 << 6] // MessageFlags.Ephemeral
      });
    });
  });
});