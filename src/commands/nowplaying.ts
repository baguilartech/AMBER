import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BaseQueueCommand } from './baseCommand';
import { createNowPlayingEmbed, formatVolume } from '../utils/formatters';

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

      if (!currentSong) {
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

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await this.handleError(interaction, error as Error, 'nowplaying');
    }
  }

}