import { ChatInputCommandInteraction } from 'discord.js';
import { ErrorHandler } from '../../src/utils/errorHandler';
import { logger } from '../../src/utils/logger';

jest.mock('../../src/utils/logger');

describe('ErrorHandler', () => {
  const mockLogger = jest.mocked(logger);
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleCommandError', () => {
    it('should handle error when interaction is not replied or deferred', async () => {
      const mockInteraction = {
        replied: false,
        deferred: false,
        reply: jest.fn().mockResolvedValue(undefined)
      } as any as ChatInputCommandInteraction;
      
      const error = new Error('Test error');
      
      await ErrorHandler.handleCommandError(mockInteraction, error, 'test-command');
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error in command test-command:', error);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'An error occurred while executing this command. Please try again.',
        ephemeral: true
      });
    });

    it('should handle error when interaction is replied', async () => {
      const mockInteraction = {
        replied: true,
        deferred: false,
        followUp: jest.fn().mockResolvedValue(undefined)
      } as any as ChatInputCommandInteraction;
      
      const error = new Error('Test error');
      
      await ErrorHandler.handleCommandError(mockInteraction, error, 'test-command');
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error in command test-command:', error);
      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: 'An error occurred while executing this command. Please try again.',
        ephemeral: true
      });
    });

    it('should handle error when interaction is deferred', async () => {
      const mockInteraction = {
        replied: false,
        deferred: true,
        followUp: jest.fn().mockResolvedValue(undefined)
      } as any as ChatInputCommandInteraction;
      
      const error = new Error('Test error');
      
      await ErrorHandler.handleCommandError(mockInteraction, error, 'test-command');
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error in command test-command:', error);
      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: 'An error occurred while executing this command. Please try again.',
        ephemeral: true
      });
    });

    it('should handle reply error when reply fails', async () => {
      const mockInteraction = {
        replied: false,
        deferred: false,
        reply: jest.fn().mockRejectedValue(new Error('Reply failed'))
      } as any as ChatInputCommandInteraction;
      
      const error = new Error('Test error');
      
      await ErrorHandler.handleCommandError(mockInteraction, error, 'test-command');
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error in command test-command:', error);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to send error message:', expect.any(Error));
    });

    it('should handle followUp error when followUp fails', async () => {
      const mockInteraction = {
        replied: true,
        deferred: false,
        followUp: jest.fn().mockRejectedValue(new Error('FollowUp failed'))
      } as any as ChatInputCommandInteraction;
      
      const error = new Error('Test error');
      
      await ErrorHandler.handleCommandError(mockInteraction, error, 'test-command');
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error in command test-command:', error);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to send error message:', expect.any(Error));
    });
  });

  describe('handleVoiceError', () => {
    it('should log voice connection error', async () => {
      const error = new Error('Voice connection failed');
      const guildId = 'test-guild-id';
      
      await ErrorHandler.handleVoiceError(guildId, error);
      
      expect(mockLogger.error).toHaveBeenCalledWith(`Voice connection error in guild ${guildId}:`, error);
    });
  });

  describe('handleServiceError', () => {
    it('should log service error', async () => {
      const error = new Error('Service failed');
      const service = 'youtube';
      
      await ErrorHandler.handleServiceError(service, error);
      
      expect(mockLogger.error).toHaveBeenCalledWith(`Service error in ${service}:`, error);
    });
  });

  describe('logAndThrow', () => {
    it('should log and throw error with message only', () => {
      const message = 'Test error message';
      
      expect(() => ErrorHandler.logAndThrow(message)).toThrow(message);
      expect(mockLogger.error).toHaveBeenCalledWith(message, undefined);
    });

    it('should log and throw error with message and original error', () => {
      const message = 'Test error message';
      const originalError = new Error('Original error');
      
      expect(() => ErrorHandler.logAndThrow(message, originalError)).toThrow(message);
      expect(mockLogger.error).toHaveBeenCalledWith(message, originalError);
    });
  });
});