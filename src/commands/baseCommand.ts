import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { ErrorHandler } from '../utils/errorHandler';
import { BaseCommand } from '../types';
import { MusicPlayer } from '../services/musicPlayer';
import { QueueManager } from '../services/queueManager';
import { logger } from '../utils/logger';
import { ErrorTracking, SentryLogger, LogContext } from '../utils/monitoring';

export abstract class BaseCommandClass implements BaseCommand {
  abstract get data(): SlashCommandBuilder;
  
  // Public execute method that wraps the actual implementation with tracing
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const commandName = this.data.name;
    const guildId = this.getGuildId(interaction);
    const userId = interaction.user.id;

    return ErrorTracking.traceCommand(commandName, guildId, userId, async () => {
      // Set user context for this command execution
      ErrorTracking.setUser(userId, interaction.user.username);
      ErrorTracking.addBreadcrumb(`Command executed: ${commandName}`, 'command', {
        guildId,
        commandName,
        channelId: interaction.channelId
      });
      
      return this.executeCommand(interaction);
    });
  }

  // Abstract method that subclasses implement - this is the actual command logic
  protected abstract executeCommand(interaction: ChatInputCommandInteraction): Promise<void>;

  protected getGuildId(interaction: ChatInputCommandInteraction): string {
    return interaction.guildId!;
  }

  protected async handleError(interaction: ChatInputCommandInteraction, error: Error, commandName: string): Promise<void> {
    await ErrorHandler.handleCommandError(interaction, error, commandName);
  }

  protected async sendReply(
    interaction: ChatInputCommandInteraction, 
    message: string, 
    isError: boolean = false
  ): Promise<void> {
    const replyType = isError ? 'error' : 'success';
    const commandName = `${replyType}-reply`;
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: message
        });
      } else if (interaction.isRepliable()) {
        await interaction.reply({
          content: message,
          ...(isError && { flags: [1 << 6] }) // MessageFlags.Ephemeral for errors only
        });
      } else {
        logger.warn('Interaction no longer repliable', { 
          commandName
        });
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 10062) {
        logger.warn(`Interaction expired - cannot send ${replyType} message`, {
          userId: interaction.user.id,
          guildId: interaction.guildId,
          commandName,
          message
        });
      } else {
        SentryLogger.error(`Failed to reply with ${replyType} message`, error as Error, {
          userId: interaction.user.id,
          guildId: interaction.guildId,
          commandName
        });
      }
    }
  }

  protected async replyError(interaction: ChatInputCommandInteraction, message: string): Promise<void> {
    await this.sendReply(interaction, message, true);
  }

  protected async replySuccess(interaction: ChatInputCommandInteraction, message: string): Promise<void> {
    await this.sendReply(interaction, message, false);
  }

  protected async executeBooleanOperation(
    interaction: ChatInputCommandInteraction,
    operation: () => boolean,
    successMessage: string,
    errorMessage: string,
    commandName: string
  ): Promise<void> {
    const guildId = this.getGuildId(interaction);
    logger.info(LogContext.command(commandName, guildId, interaction.user.username));
    
    // Defer the reply immediately to prevent timeout
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferReply();
      }
    } catch (deferError) {
      if (deferError && typeof deferError === 'object' && 'code' in deferError && (deferError as { code: number }).code === 10062) {
        logger.warn('Interaction already expired, cannot defer', {
          commandName,
          guildId,
          userId: interaction.user.id
        });
        return;
      }
      throw deferError;
    }
    
    try {
      const result = operation();
      
      if (result) {
        logger.info(`${commandName} command successful in guild ${guildId}`);
        await this.replySuccess(interaction, successMessage);
      } else {
        logger.info(`${commandName} command failed (no action taken) in guild ${guildId}`);
        await this.replyError(interaction, errorMessage);
      }
    } catch (error) {
      await this.handleError(interaction, error as Error, commandName);
    }
  }
}

export abstract class BaseMusicPlayerCommand extends BaseCommandClass {
  protected musicPlayer: MusicPlayer;

  constructor(musicPlayer: MusicPlayer) {
    super();
    this.musicPlayer = musicPlayer;
  }
}

export abstract class BaseQueueCommand extends BaseCommandClass {
  protected queueManager: QueueManager;

  constructor(queueManager: QueueManager) {
    super();
    this.queueManager = queueManager;
  }
}