import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BaseMusicPlayerCommand } from './baseCommand';

export class StopCommand extends BaseMusicPlayerCommand {

  get data() {
    return new SlashCommandBuilder()
      .setName('stop')
      .setDescription('Stop the music and clear the queue');
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = this.getGuildId(interaction);
    
    try {
      this.musicPlayer.stop(guildId);
      await this.replySuccess(interaction, 'Stopped the music and cleared the queue.');
    } catch (error) {
      await this.handleError(interaction, error as Error, 'stop');
    }
  }
}