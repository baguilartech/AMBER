import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BaseMusicPlayerCommand } from './baseCommand';

export class VolumeCommand extends BaseMusicPlayerCommand {

  get data(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName('volume')
      .setDescription('Set the music volume')
      .addIntegerOption(option =>
        option.setName('level')
          .setDescription('Volume level (0-100)')
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(100)
      ) as SlashCommandBuilder;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = this.getGuildId(interaction);
    const volumeLevel = interaction.options.getInteger('level', true);
    const volume = volumeLevel / 100;
    
    await this.executeBooleanOperation(
      interaction,
      () => this.musicPlayer.setVolume(guildId, volume),
      `Volume set to ${volumeLevel}%`,
      'Nothing is currently playing.',
      'volume'
    );
  }
}