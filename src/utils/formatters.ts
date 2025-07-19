import { EmbedBuilder } from 'discord.js';
import { Song } from '../types';

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatVolume(volume: number): string {
  return `${Math.round(volume * 100)}%`;
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function joinArtistNames(artists: Array<{ name: string }>): string {
  return artists.map(artist => artist.name).join(', ');
}

export function createMusicEmbed(title: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(title)
    .setColor('#0099ff')
    .setTimestamp();
}

export function createNowPlayingEmbed(song: Song): EmbedBuilder {
  const embed = createMusicEmbed('🎵 Now Playing');
  return embed
    .setDescription(`**${song.title}** by ${song.artist}`)
    .addFields(
      { name: 'Duration', value: formatDuration(song.duration), inline: true },
      { name: 'Platform', value: capitalizeFirst(song.platform), inline: true },
      { name: 'Requested by', value: song.requestedBy, inline: true }
    )
    .setThumbnail(song.thumbnail ?? null);
}

export function createQueueEmbed(songs: Song[], currentIndex: number): EmbedBuilder {
  const embed = createMusicEmbed('📋 Music Queue');
  
  if (songs.length === 0) {
    return embed.setDescription('The queue is empty.');
  }
  
  const queueList = songs.map((song, index) => {
    const prefix = index === currentIndex ? '▶️' : `${index + 1}.`;
    return `${prefix} **${song.title}** by ${song.artist} (${formatDuration(song.duration)})`;
  }).slice(0, 10);
  
  embed.setDescription(queueList.join('\n'));
  
  if (songs.length > 10) {
    embed.setFooter({ text: `... and ${songs.length - 10} more songs` });
  }
  
  return embed;
}