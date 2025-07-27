import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BaseMusicPlayerCommand } from './baseCommand';
import { logger } from '../utils/logger';
import { LogContext } from '../utils/monitoring';

export class StopCommand extends BaseMusicPlayerCommand {

  get data() {
    return new SlashCommandBuilder()
      .setName('stop')
      .setDescription('Stop the music and clear the queue');
  }

  protected async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = this.getGuildId(interaction);
    
    logger.info(LogContext.command('stop', guildId, interaction.user.username));
    
    try {
      this.musicPlayer.stop(guildId);
      logger.info(`Music stopped and queue cleared for guild ${guildId}`);
      await this.replySuccess(interaction, 'Stopped the music and cleared the queue.');
    } catch (error) {
      await this.handleError(interaction, error as Error, 'stop');
    }
  }
}