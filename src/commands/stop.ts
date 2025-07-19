import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BaseMusicPlayerCommand } from './baseCommand';
import { logger } from '../utils/logger';

export class StopCommand extends BaseMusicPlayerCommand {

  get data() {
    return new SlashCommandBuilder()
      .setName('stop')
      .setDescription('Stop the music and clear the queue');
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = this.getGuildId(interaction);
    
    logger.info(`Stop command executed by ${interaction.user.username} in guild ${guildId}`);
    
    try {
      this.musicPlayer.stop(guildId);
      logger.info(`Music stopped and queue cleared for guild ${guildId}`);
      await this.replySuccess(interaction, 'Stopped the music and cleared the queue.');
    } catch (error) {
      await this.handleError(interaction, error as Error, 'stop');
    }
  }
}