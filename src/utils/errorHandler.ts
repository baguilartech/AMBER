import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from './logger';
import { ErrorTracking } from './monitoring';

export class ErrorHandler {
  static async handleCommandError(
    interaction: ChatInputCommandInteraction,
    error: Error,
    commandName: string
  ): Promise<void> {
    logger.error(`Error in command ${commandName}:`, error);
    
    // Send error to Sentry with context
    ErrorTracking.captureException(error, {
      command: commandName,
      guildId: interaction.guildId,
      userId: interaction.user.id,
      username: interaction.user.username,
      channelId: interaction.channelId,
      interactionId: interaction.id,
      interactionType: 'ChatInputCommand'
    });
    
    const errorMessage = {
      content: 'An error occurred while executing this command. Please try again.',
      ephemeral: true
    };

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    } catch (replyError) {
      logger.error('Failed to send error message:', replyError);
      // Also capture reply errors
      ErrorTracking.captureException(replyError as Error, {
        command: commandName,
        guildId: interaction.guildId,
        userId: interaction.user.id,
        originalError: error.message,
        errorType: 'reply_failed'
      });
    }
  }

  static async handleVoiceError(guildId: string, error: Error): Promise<void> {
    logger.error(`Voice connection error in guild ${guildId}:`, error);
    ErrorTracking.captureException(error, {
      errorType: 'voice_connection',
      guildId: guildId
    });
  }

  static async handleServiceError(service: string, error: Error): Promise<void> {
    logger.error(`Service error in ${service}:`, error);
    ErrorTracking.captureException(error, {
      errorType: 'service_error',
      service: service
    });
  }

  static logAndThrow(message: string, error?: Error): never {
    logger.error(message, error);
    throw new Error(message);
  }

  static logServiceError(platform: string, operation: string, error: Error): void {
    logger.error(`Error ${operation} ${platform}:`, error);
    ErrorTracking.captureException(error, {
      platform: platform,
      operation: operation,
      errorType: 'service_error'
    });
  }

  static logNoResults(platform: string, query: string): void {
    logger.warn(`No ${platform} results found for query: ${query}`);
  }

  static logSearchResults(platform: string, count: number, query: string): void {
    logger.info(`Found ${count} ${platform} results for query: ${query}`);
  }
}