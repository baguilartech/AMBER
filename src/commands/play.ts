import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import { BaseCommandClass } from './baseCommand';
import { QueueManager } from '../services/queueManager';
import { MusicPlayer } from '../services/musicPlayer';
import { ServiceFactory } from '../services/serviceFactory';
import { capitalizeFirst } from '../utils/formatters';

export class PlayCommand extends BaseCommandClass {
  private queueManager: QueueManager;
  private musicPlayer: MusicPlayer;

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

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const query = interaction.options.getString('query', true);
    const member = interaction.member as GuildMember;
    const guildId = this.getGuildId(interaction);

    if (!member.voice.channel) {
      await this.replyError(interaction, 'You need to be in a voice channel to play music!');
      return;
    }

    await interaction.deferReply();

    try {
      const songs = await this.searchSongs(query, member.user.username);
      
      if (songs.length === 0) {
        await interaction.editReply('No songs found for your query.');
        return;
      }

      const song = songs[0];
      const added = this.queueManager.addSong(guildId, song);
      
      if (!added) {
        await interaction.editReply('Queue is full! Please try again later.');
        return;
      }

      const queue = this.queueManager.getQueue(guildId);
      
      if (!queue.isPlaying) {
        const connection = joinVoiceChannel({
          channelId: member.voice.channel.id,
          guildId: guildId,
          adapterCreator: interaction.guild!.voiceAdapterCreator as any
        });

        await this.musicPlayer.waitForConnection(connection);
        await this.musicPlayer.play(guildId, connection);
        
        await interaction.editReply({
          content: `Now playing: **${song.title}** by **${song.artist}** (${capitalizeFirst(song.platform)})`
        });
      } else {
        const queuePosition = queue.songs.length;
        await interaction.editReply({
          content: `Added to queue: **${song.title}** by **${song.artist}** (Position: ${queuePosition})`
        });
      }
    } catch (error) {
      await this.handleError(interaction, error as Error, 'play');
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