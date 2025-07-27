import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BaseMusicPlayerCommand } from './baseCommand';

export class ResumeCommand extends BaseMusicPlayerCommand {

  get data() {
    return new SlashCommandBuilder()
      .setName('resume')
      .setDescription('Resume the paused song');
  }

  protected async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = this.getGuildId(interaction);
    await this.executeBooleanOperation(
      interaction,
      () => this.musicPlayer.resume(guildId),
      'Resumed the music.',
      'Nothing is currently paused.',
      'resume'
    );
  }
}