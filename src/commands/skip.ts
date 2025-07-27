import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BaseMusicPlayerCommand } from './baseCommand';
import { logger } from '../utils/logger';
import { LogContext } from '../utils/monitoring';

export class SkipCommand extends BaseMusicPlayerCommand {

  get data() {
    return new SlashCommandBuilder()
      .setName('skip')
      .setDescription('Skip the current song');
  }

  protected async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = this.getGuildId(interaction);
    
    logger.info(LogContext.command('skip', guildId, interaction.user.username));
    
    // Check if interaction is still valid before deferring
    if (!interaction.isRepliable()) {
      logger.warn('Skip command interaction no longer repliable', {
        guildId
      });
      return;
    }
    
    // Defer the reply with error handling
    try {
      await interaction.deferReply();
    } catch (deferError) {
      if (deferError && typeof deferError === 'object' && 'code' in deferError && (deferError as { code: number }).code === 10062) {
        logger.warn('Skip command interaction already expired', {
          guildId,
          userId: interaction.user.id
        });
        return;
      }
      // Re-throw other errors
      throw deferError;
    }
    
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