import { Song } from '../types';
import { apiKeys } from '../utils/config';
import { logger } from '../utils/logger';
import { URLValidator } from '../utils/urlValidator';
import { BaseMusicService } from './baseMusicService';
import ytdl from '@distube/ytdl-core';

export class YouTubeService extends BaseMusicService {
  protected platform = 'YouTube';
  private apiKey: string;

  constructor() {
    super();
    this.apiKey = apiKeys.youtube.apiKey;
  }

  async search(query: string): Promise<Song[]> {
    try {
      // Increase results for better filtering, add order by relevance
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${this.apiKey}&maxResults=10&order=relevance&videoCategoryId=10`;
      
      const response = await fetch(searchUrl);
      const data = await response.json() as any;

      if (!data.items || data.items.length === 0) {
        this.logNoResults(query);
        return [];
      }

      const songs: Song[] = [];
      
      // Sort results to prioritize official channels and better matches
      const sortedItems = this.sortYouTubeResults(data.items, query);
      
      for (const item of sortedItems) {
        const videoId = item.id?.videoId;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        try {
          const videoInfo = await ytdl.getInfo(videoUrl);
          const videoDetails = videoInfo.videoDetails;
          
          songs.push(this.createSong({
            title: videoDetails.title,
            artist: videoDetails.author.name,
            url: videoUrl,
            duration: parseInt(videoDetails.lengthSeconds),
            thumbnail: videoDetails.thumbnails[0]?.url,
            requestedBy: '',
            platform: 'youtube'
          }));
        } catch (error) {
          this.logServiceError(`getting video info for ${videoId}`, error as Error);
          continue;
        }
      }

      this.logSearchResults(songs.length, query);
      return songs;
    } catch (error) {
      return this.handleSearchError(error as Error);
    }
  }

  async getStreamUrl(song: Song): Promise<string> {
    try {
      const info = await ytdl.getInfo(song.url);
      const format = ytdl.chooseFormat(info.formats, {
        quality: 'highestaudio',
        filter: 'audioonly'
      });
      
      if (!format) {
        throw new Error('No suitable audio format found');
      }
      
      return format.url;
    } catch (error) {
      logger.error(`Error getting stream URL for ${song.title}:`, error);
      throw error;
    }
  }


  validateUrl(url: string): boolean {
    return URLValidator.validateYoutube(url);
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async getSongFromUrl(url: string, requestedBy: string): Promise<Song | null> {
    if (!this.validateUrl(url)) {
      return null;
    }

    try {
      const info = await ytdl.getInfo(url);
      const videoDetails = info.videoDetails;
      
      return this.createSong({
        title: videoDetails.title,
        artist: videoDetails.author.name,
        url: url,
        duration: parseInt(videoDetails.lengthSeconds),
        thumbnail: videoDetails.thumbnails[0]?.url,
        requestedBy,
        platform: 'youtube'
      });
    } catch (error) {
      this.logServiceError(`getting song from URL ${url}`, error as Error);
      return null;
    }
  }

  private sortYouTubeResults(items: any[], query: string): any[] {
    return items.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Boost official channels (VEVO, Records, official artist channels)
      const channelA = a.snippet.channelTitle.toLowerCase();
      const channelB = b.snippet.channelTitle.toLowerCase();
      
      if (this.isOfficialChannel(channelA)) scoreA += 5;
      if (this.isOfficialChannel(channelB)) scoreB += 5;

      // Boost if title contains "official", "music video", etc.
      const titleA = a.snippet.title.toLowerCase();
      const titleB = b.snippet.title.toLowerCase();
      
      if (this.isOfficialVideo(titleA)) scoreA += 3;
      if (this.isOfficialVideo(titleB)) scoreB += 3;

      // Penalize live versions, covers, remixes for original track searches
      if (this.isLiveOrCover(titleA)) scoreA -= 2;
      if (this.isLiveOrCover(titleB)) scoreB -= 2;

      // Boost exact title matches
      const queryLower = query.toLowerCase().replace(/"/g, '');
      if (titleA.includes(queryLower)) scoreA += 2;
      if (titleB.includes(queryLower)) scoreB += 2;

      return scoreB - scoreA; // Sort by score descending
    });
  }

  private isOfficialChannel(channelTitle: string): boolean {
    const officialKeywords = [
      'vevo', 'records', 'music', 'official', 'entertainment',
      'sony', 'universal', 'warner', 'capitol', 'atlantic',
      'columbia', 'rca', 'interscope', 'def jam', 'republic'
    ];
    return officialKeywords.some(keyword => channelTitle.includes(keyword));
  }

  private isOfficialVideo(title: string): boolean {
    const officialKeywords = [
      'official video', 'official music video', 'official audio',
      'official lyric video', 'official', '(official)'
    ];
    return officialKeywords.some(keyword => title.includes(keyword));
  }

  private isLiveOrCover(title: string): boolean {
    const liveKeywords = [
      'live', 'cover', 'remix', 'acoustic', 'karaoke',
      'instrumental', 'reaction', 'tutorial', 'piano version'
    ];
    return liveKeywords.some(keyword => title.includes(keyword));
  }
}