import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BaseMusicPlayerCommand } from './baseCommand';
import { logger } from '../utils/logger';

export class SkipCommand extends BaseMusicPlayerCommand {

  get data() {
    return new SlashCommandBuilder()
      .setName('skip')
      .setDescription('Skip the current song');
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = this.getGuildId(interaction);
    
    logger.info(`Skip command executed by ${interaction.user.username} in guild ${guildId}`);
    await interaction.deferReply();
    
    try {
      const nextSong = await this.musicPlayer.skip(guildId);
      
      if (nextSong) {
        logger.info(`Skipped to next song: ${nextSong.title} by ${nextSong.artist} in guild ${guildId}`);
        await interaction.editReply({
          content: `Skipped! Now playing: **${nextSong.title}** by **${nextSong.artist}**`
        });
      } else {
        logger.info(`Skipped song, no more songs in queue for guild ${guildId}`);
        await interaction.editReply({
          content: 'Skipped! No more songs in the queue.'
        });
      }
    } catch (error) {
      await this.handleError(interaction, error as Error, 'skip');
    }
  }
}