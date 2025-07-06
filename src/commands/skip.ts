import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BaseMusicPlayerCommand } from './baseCommand';

export class SkipCommand extends BaseMusicPlayerCommand {

  get data() {
    return new SlashCommandBuilder()
      .setName('skip')
      .setDescription('Skip the current song');
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = this.getGuildId(interaction);
    
    await interaction.deferReply();
    
    try {
      const nextSong = await this.musicPlayer.skip(guildId);
      
      if (nextSong) {
        await interaction.editReply({
          content: `Skipped! Now playing: **${nextSong.title}** by **${nextSong.artist}**`
        });
      } else {
        await interaction.editReply({
          content: 'Skipped! No more songs in the queue.'
        });
      }
    } catch (error) {
      await this.handleError(interaction, error as Error, 'skip');
    }
  }
}