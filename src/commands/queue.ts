import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BaseQueueCommand } from './baseCommand';
import { createQueueEmbed, formatVolume } from '../utils/formatters';
import { logger } from '../utils/logger';
import { LogContext } from '../utils/monitoring';
import { Queue } from '../types';

function getQueueStatus(queue: Queue): string {
  if (!queue.isPlaying) return 'Stopped';
  return queue.isPaused ? 'Paused' : 'Playing';
}

export class QueueCommand extends BaseQueueCommand {

  get data() {
    return new SlashCommandBuilder()
      .setName('queue')
      .setDescription('Show the current music queue');
  }

  protected async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const guildId = this.getGuildId(interaction);
      const queue = this.queueManager.getQueue(guildId);
      
      logger.info(LogContext.command('queue', guildId, interaction.user.username));

      if (queue.songs.length === 0) {
        logger.info(`Queue is empty for guild ${guildId}`);
        await this.replyError(interaction, 'The queue is empty.');
        return;
      }

      const embed = createQueueEmbed(queue.songs, queue.currentIndex)
        .addFields([
          {
            name: 'Total Songs',
            value: queue.songs.length.toString(),
            inline: true
          },
          {
            name: 'Status',
            value: getQueueStatus(queue),
            inline: true
          },
          {
            name: 'Volume',
            value: formatVolume(queue.volume),
            inline: true
          }
        ]);

      logger.info(`Displayed queue with ${queue.songs.length} songs for guild ${guildId}`);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await this.handleError(interaction, error as Error, 'queue');
    }
  }

}