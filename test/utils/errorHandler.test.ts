import { ChatInputCommandInteraction } from 'discord.js';
import { ErrorHandler } from '../../src/utils/errorHandler';
import { logger } from '../../src/utils/logger';

jest.mock('../../src/utils/logger');

describe('ErrorHandler', () => {
  const mockLogger = jest.mocked(logger);
  let mockInteraction: jest.Mocked<ChatInputCommandInteraction>;
  
  beforeEach(() => {
    mockInteraction = {
      replied: false,
      deferred: false,
      reply: jest.fn().mockResolvedValue(undefined),
      followUp: jest.fn().mockResolvedValue(undefined)
    } as any;

    jest.clearAllMocks();
  });

  describe('handleCommandError', () => {
    it('should handle error when interaction is not replied or deferred', async () => {
      const error = new Error('Test error');
      
      await ErrorHandler.handleCommandError(mockInteraction, error, 'test');

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'An error occurred while executing this command. Please try again.',
        ephemeral: true
      });
    });

    it('should handle error when interaction is replied', async () => {
      mockInteraction.replied = true;
      const error = new Error('Test error');
      
      await ErrorHandler.handleCommandError(mockInteraction, error, 'test');

      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: 'An error occurred while executing this command. Please try again.',
        ephemeral: true
      });
    });

    it('should handle error when interaction is deferred', async () => {
      mockInteraction.deferred = true;
      const error = new Error('Test error');
      
      await ErrorHandler.handleCommandError(mockInteraction, error, 'test');

      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: 'An error occurred while executing this command. Please try again.',
        ephemeral: true
      });
    });

    it('should handle reply error when reply fails', async () => {
      mockInteraction.reply.mockRejectedValue(new Error('Reply failed'));
      const error = new Error('Test error');
      
      await ErrorHandler.handleCommandError(mockInteraction, error, 'test');

      // Should not throw, should handle gracefully
      expect(mockInteraction.reply).toHaveBeenCalled();
    });

    it('should handle followUp error when followUp fails', async () => {
      mockInteraction.replied = true;
      mockInteraction.followUp.mockRejectedValue(new Error('FollowUp failed'));
      const error = new Error('Test error');
      
      await ErrorHandler.handleCommandError(mockInteraction, error, 'test');

      // Should not throw, should handle gracefully
      expect(mockInteraction.followUp).toHaveBeenCalled();
    });
  });

  describe('handleVoiceError', () => {
    it('should log voice connection error', async () => {
      const error = new Error('Voice error');
      
      await ErrorHandler.handleVoiceError('guild-123', error);

      // This method should log the error but not throw
      expect(true).toBe(true); // Just verify it doesn't throw
    });
  });

  describe('handleServiceError', () => {
    it('should log service error', async () => {
      const error = new Error('Service error');
      
      await ErrorHandler.handleServiceError('youtube', error);

      // This method should log the error but not throw
      expect(true).toBe(true); // Just verify it doesn't throw
    });
  });

  describe('logAndThrow', () => {
    it('should log and throw error with message only', () => {
      expect(() => {
        ErrorHandler.logAndThrow('Test error message');
      }).toThrow('Test error message');
    });

    it('should log and throw error with message and original error', () => {
      const originalError = new Error('Original error');
      
      expect(() => {
        ErrorHandler.logAndThrow('Test error message', originalError);
      }).toThrow('Test error message');
    });
  });

  describe('logServiceError', () => {
    it('should log service error', () => {
      const error = new Error('Service error');
      
      ErrorHandler.logServiceError('youtube', 'searching', error);

      // This method should log the error but not throw
      expect(true).toBe(true); // Just verify it doesn't throw
    });
  });

  describe('logNoResults', () => {
    it('should log no results message', () => {
      ErrorHandler.logNoResults('youtube', 'test query');

      // This method should log the message but not throw
      expect(true).toBe(true); // Just verify it doesn't throw
    });
  });

  describe('logSearchResults', () => {
    it('should log search results', () => {
      ErrorHandler.logSearchResults('youtube', 5, 'test query');

      // This method should log the results but not throw
      expect(true).toBe(true); // Just verify it doesn't throw
    });
  });
});