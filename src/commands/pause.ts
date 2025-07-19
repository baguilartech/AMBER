import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BaseMusicPlayerCommand } from './baseCommand';

export class PauseCommand extends BaseMusicPlayerCommand {

  get data() {
    return new SlashCommandBuilder()
      .setName('pause')
      .setDescription('Pause the current song');
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = this.getGuildId(interaction);
    await this.executeBooleanOperation(
      interaction,
      () => this.musicPlayer.pause(guildId),
      'Paused the music.',
      'Nothing is currently playing.',
      'pause'
    );
  }
}