import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { validateConfig, apiKeys } from './utils/config';
import { logger } from './utils/logger';
import { CommandRegistry } from './utils/commandRegistry';
import { QueueManager } from './services/queueManager';
import { MusicPlayer } from './services/musicPlayer';
import { PlayCommand } from './commands/play';
import { QueueCommand } from './commands/queue';
import { SkipCommand } from './commands/skip';
import { StopCommand } from './commands/stop';
import { PauseCommand } from './commands/pause';
import { ResumeCommand } from './commands/resume';
import { VolumeCommand } from './commands/volume';
import { NowPlayingCommand } from './commands/nowplaying';

class AmberBot {
  private client: Client;
  private queueManager: QueueManager;
  private musicPlayer: MusicPlayer;
  private commandRegistry: CommandRegistry;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
      ]
    });

    this.queueManager = new QueueManager();
    this.musicPlayer = new MusicPlayer(this.queueManager);
    this.commandRegistry = new CommandRegistry();

    this.setupCommands();
    this.setupEventHandlers();
  }

  private setupCommands(): void {
    const commands = [
      new PlayCommand(this.queueManager, this.musicPlayer),
      new QueueCommand(this.queueManager),
      new SkipCommand(this.musicPlayer),
      new StopCommand(this.musicPlayer),
      new PauseCommand(this.musicPlayer),
      new ResumeCommand(this.musicPlayer),
      new VolumeCommand(this.musicPlayer),
      new NowPlayingCommand(this.queueManager)
    ];

    this.commandRegistry.registerMultiple(commands);
  }

  private setupEventHandlers(): void {
    this.client.once('ready', async () => {
      logger.info(`Logged in as ${this.client.user?.tag}`);
      await this.registerCommands();
      
      const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${this.client.user?.id}&scope=bot%20applications.commands&permissions=36700160`;
      logger.infoWithLink('Bot is ready! Invite me to your server:', inviteUrl);
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      await this.commandRegistry.executeCommand(interaction);
    });

    this.client.on('voiceStateUpdate', (oldState, newState) => {
      if (newState.member?.user.bot) return;

      const guildId = newState.guild.id;
      const botVoiceChannel = newState.guild.members.me?.voice.channel;

      if (botVoiceChannel && oldState.channel === botVoiceChannel) {
        const remainingMembers = botVoiceChannel.members.filter(member => !member.user.bot);
        
        if (remainingMembers.size === 0) {
          logger.info(`All users left voice channel in guild ${guildId}, disconnecting bot`);
          this.musicPlayer.disconnect(guildId);
        }
      }
    });

    this.client.on('error', (error) => {
      logger.error('Discord client error:', error);
    });

    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      this.client.destroy();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      this.client.destroy();
      process.exit(0);
    });
  }

  private async registerCommands(): Promise<void> {
    const rest = new REST({ version: '10' }).setToken(apiKeys.discord.token);
    
    try {
      const commandData = this.commandRegistry.getCommandData();
      
      logger.info('Started refreshing application (/) commands.');
      
      await rest.put(
        Routes.applicationCommands(apiKeys.discord.clientId),
        { body: commandData }
      );
      
      logger.info('Successfully reloaded application (/) commands.');
    } catch (error) {
      logger.error('Error registering commands:', error);
    }
  }

  async start(): Promise<void> {
    try {
      validateConfig();
      await this.client.login(apiKeys.discord.token);
    } catch (error) {
      logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  }
}

const bot = new AmberBot();
bot.start().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});