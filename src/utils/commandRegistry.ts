import { Collection, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, ChatInputCommandInteraction } from 'discord.js';
import { logger } from './logger';
import { ErrorTracking } from './monitoring';

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export class CommandRegistry {
  private readonly commands: Collection<string, Command> = new Collection();

  register(command: Command): void {
    this.commands.set(command.data.name, command);
    logger.debug(`Registered command: ${command.data.name}`);
  }

  registerMultiple(commands: Command[]): void {
    for (const command of commands) {
      this.register(command);
    }
    logger.info(`Registered ${commands.length} commands`);
  }

  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  getAll(): Collection<string, Command> {
    return this.commands;
  }

  getCommandData(): object[] {
    return Array.from(this.commands.values()).map(command => command.data.toJSON());
  }

  async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = this.get(interaction.commandName);
    
    if (!command) {
      logger.warn(`Unknown command: ${interaction.commandName}`);
      await interaction.reply({
        content: 'Unknown command!',
        flags: [1 << 6] // MessageFlags.Ephemeral
      });
      return;
    }

    try {
      await command.execute(interaction);
      logger.debug(`Executed command: ${interaction.commandName}`);
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}:`, error);
      
      // Capture error in Sentry with interaction context
      ErrorTracking.captureException(error as Error, {
        command: interaction.commandName,
        guildId: interaction.guildId,
        userId: interaction.user.id,
        username: interaction.user.username,
        channelId: interaction.channelId,
        interactionId: interaction.id,
        interactionType: 'ChatInputCommand',
        isDeferred: interaction.deferred,
        isReplied: interaction.replied
      });
      
      const errorMessage = {
        content: 'There was an error executing this command!',
        flags: [1 << 6] // MessageFlags.Ephemeral
      };

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      } catch (replyError) {
        // If we can't reply, just log it - don't send to Sentry again
        logger.error(`Failed to send error message to user:`, replyError);
      }
    }
  }
}