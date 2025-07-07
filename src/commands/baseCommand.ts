import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { ErrorHandler } from '../utils/errorHandler';
import { BaseCommand } from '../types';
import { MusicPlayer } from '../services/musicPlayer';
import { QueueManager } from '../services/queueManager';
import { logger } from '../utils/logger';

export abstract class BaseCommandClass implements BaseCommand {
  abstract get data(): SlashCommandBuilder;
  abstract execute(interaction: ChatInputCommandInteraction): Promise<void>;

  protected getGuildId(interaction: ChatInputCommandInteraction): string {
    return interaction.guildId!;
  }

  protected async handleError(interaction: ChatInputCommandInteraction, error: Error, commandName: string): Promise<void> {
    await ErrorHandler.handleCommandError(interaction, error, commandName);
  }

  protected async replyError(interaction: ChatInputCommandInteraction, message: string): Promise<void> {
    await interaction.reply({
      content: message,
      ephemeral: true
    });
  }

  protected async replySuccess(interaction: ChatInputCommandInteraction, message: string): Promise<void> {
    await interaction.reply({
      content: message
    });
  }

  protected async executeBooleanOperation(
    interaction: ChatInputCommandInteraction,
    operation: () => boolean,
    successMessage: string,
    errorMessage: string,
    commandName: string
  ): Promise<void> {
    const guildId = this.getGuildId(interaction);
    logger.info(`${commandName} command executed by ${interaction.user.username} in guild ${guildId}`);
    
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