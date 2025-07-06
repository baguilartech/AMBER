import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BaseQueueCommand } from './baseCommand';
import { createQueueEmbed, formatVolume } from '../utils/formatters';

export class QueueCommand extends BaseQueueCommand {

  get data() {
    return new SlashCommandBuilder()
      .setName('queue')
      .setDescription('Show the current music queue');
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const guildId = this.getGuildId(interaction);
      const queue = this.queueManager.getQueue(guildId);

      if (queue.songs.length === 0) {
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
            value: queue.isPlaying ? (queue.isPaused ? 'Paused' : 'Playing') : 'Stopped',
            inline: true
          },
          {
            name: 'Volume',
            value: formatVolume(queue.volume),
            inline: true
          }
        ]);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await this.handleError(interaction, error as Error, 'queue');
    }
  }

}