import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import { BaseCommandClass } from './baseCommand';
import { QueueManager } from '../services/queueManager';
import { MusicPlayer } from '../services/musicPlayer';
import { ServiceFactory } from '../services/serviceFactory';
import { capitalizeFirst } from '../utils/formatters';
import { logger } from '../utils/logger';
import { LogContext } from '../utils/monitoring';

export class PlayCommand extends BaseCommandClass {
  private readonly queueManager: QueueManager;
  private readonly musicPlayer: MusicPlayer;
  private readonly commandInProgress: Map<string, boolean> = new Map();

  constructor(queueManager: QueueManager, musicPlayer: MusicPlayer) {
    super();
    this.queueManager = queueManager;
    this.musicPlayer = musicPlayer;
  }

  get data(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName('play')
      .setDescription('Play a song or add it to the queue')
      .addStringOption(option =>
        option.setName('query')
          .setDescription('Song title, artist, or URL')
          .setRequired(true)
      ) as SlashCommandBuilder;
  }

  protected async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    // Defer immediately to prevent timeout on slow operations
    try {
      await interaction.deferReply();
    } catch (deferError) {
      if (deferError && typeof deferError === 'object' && 'code' in deferError && (deferError as { code: number }).code === 10062) {
        logger.warn('Play command interaction already expired', {
          userId: interaction.user.id,
          guildId: interaction.guildId
        });
        return;
      }
      throw deferError;
    }

    const query = interaction.options.getString('query', true);
    const member = interaction.member as GuildMember;
    const guildId = this.getGuildId(interaction);
    const userId = interaction.user.id;
    const commandKey = `${guildId}-${userId}-${query}`;
    
    logger.info(LogContext.command('play', guildId, member.user.username) + ` with query: ${query}`);

    // Prevent duplicate command execution
    if (this.commandInProgress.get(commandKey)) {
      logger.warn(`Play command already in progress for ${member.user.username} in guild ${guildId} with query: ${query}`);
      await interaction.editReply('A play command with this query is already being processed. Please wait...');
      return;
    }

    if (!member.voice.channel) {
      await interaction.editReply('You need to be in a voice channel to play music!');
      return;
    }

    this.commandInProgress.set(commandKey, true);

    try {
      const songs = await this.searchSongs(query, member.user.username);
      
      if (songs.length === 0) {
        logger.info(`No songs found for query: ${query}`);
        await interaction.editReply('No songs found for your query.');
        return;
      }

      const song = songs[0];
      const added = this.queueManager.addSong(guildId, song);
      
      if (!added) {
        logger.info(`Queue full for guild ${guildId}, could not add song: ${song.title}`);
        await interaction.editReply('Queue is full! Please try again later.');
        return;
      }

      const queue = this.queueManager.getQueue(guildId);
      
      if (!queue.isPlaying) {
        const connection = joinVoiceChannel({
          channelId: member.voice.channel.id,
          guildId: guildId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          adapterCreator: interaction.guild!.voiceAdapterCreator as any
        });

        await this.musicPlayer.waitForConnection(connection);
        await this.musicPlayer.play(guildId, connection);
        
        logger.info(`Started playing: ${song.title} by ${song.artist} in guild ${guildId}`);
        await interaction.editReply({
          content: `Now playing: **${song.title}** by **${song.artist}** (${capitalizeFirst(song.platform)})`
        });
      } else {
        const queuePosition = queue.songs.length;
        logger.info(`Added to queue: ${song.title} by ${song.artist} at position ${queuePosition} in guild ${guildId}`);
        
        // Trigger prebuffering for newly added songs if something is already playing
        if (queue.isPlaying) {
          // Use a longer delay to avoid impacting the audio stream
          // This gives the audio pipeline time to stabilize before starting network operations
          setTimeout(() => {
            this.musicPlayer.triggerPrebuffering(guildId);
          }, 2000); // 2 second delay instead of 100ms
        }
        
        await interaction.editReply({
          content: `Added to queue: **${song.title}** by **${song.artist}** (Position: ${queuePosition})`
        });
      }
    } catch (error) {
      await this.handleError(interaction, error as Error, 'play');
    } finally {
      this.commandInProgress.delete(commandKey);
    }
  }

  private async searchSongs(query: string, requestedBy: string) {
    // Check if it's a URL first
    const urlSongs = await ServiceFactory.handleServiceUrl(query, requestedBy);
    if (urlSongs.length > 0) {
      return urlSongs;
    }

    // Handle Spotify playlists specially
    const spotifyService = ServiceFactory.getSpotifyService();
    if (spotifyService.validateUrl(query) && query.includes('playlist')) {
      return await spotifyService.getPlaylistSongs(query, requestedBy);
    }

    // Search all services for general queries
    const services = ServiceFactory.getAllServices();
    const soundcloudService = ServiceFactory.getSoundCloudService();
    
    const searchPromises = services.map(service => {
      if (service === soundcloudService && !soundcloudService.isConfigured()) {
        return Promise.resolve([]);
      }
      return service.search(query);
    });

    const results = await Promise.all(searchPromises);
    return results.flat();
  }
}