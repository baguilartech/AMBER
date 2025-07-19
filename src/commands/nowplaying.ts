import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BaseQueueCommand } from './baseCommand';
import { createNowPlayingEmbed, formatVolume } from '../utils/formatters';
import { logger } from '../utils/logger';

export class NowPlayingCommand extends BaseQueueCommand {

  get data() {
    return new SlashCommandBuilder()
      .setName('nowplaying')
      .setDescription('Show the currently playing song');
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const guildId = this.getGuildId(interaction);
      const currentSong = this.queueManager.getCurrentSong(guildId);
      const queue = this.queueManager.getQueue(guildId);
      
      logger.info(`Now playing command executed by ${interaction.user.username} in guild ${guildId}`);

      if (!currentSong) {
        logger.info(`No song currently playing for guild ${guildId}`);
        await this.replyError(interaction, 'Nothing is currently playing.');
        return;
      }

      const embed = createNowPlayingEmbed(currentSong)
        .addFields([
          {
            name: 'Volume',
            value: formatVolume(queue.volume),
            inline: true
          },
          {
            name: 'Status',
            value: queue.isPaused ? 'Paused' : 'Playing',
            inline: true
          }
        ]);

      logger.info(`Displayed now playing: ${currentSong.title} by ${currentSong.artist} for guild ${guildId}`);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await this.handleError(interaction, error as Error, 'nowplaying');
    }
  }

}