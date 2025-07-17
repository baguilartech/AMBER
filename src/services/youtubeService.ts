import { Song } from '../types';
import { apiKeys } from '../utils/config';
import { logger } from '../utils/logger';
import { URLValidator } from '../utils/urlValidator';
import { BaseMusicService } from './baseMusicService';
import ytdl from '@distube/ytdl-core';

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: { 
    title: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails?: { medium?: { url: string } };
  };
}

export class YouTubeService extends BaseMusicService {
  protected platform = 'YouTube';
  private apiKey: string;

  constructor() {
    super();
    this.apiKey = apiKeys.youtube.apiKey;
  }

  async search(query: string): Promise<Song[]> {
    try {
      // Optimize for speed: fewer results but faster processing
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${this.apiKey}&maxResults=5&order=relevance&videoCategoryId=10`;
      
      const response = await fetch(searchUrl);
      const data = await response.json() as {
        items?: YouTubeSearchItem[];
      };

      if (!data.items || data.items.length === 0) {
        this.logNoResults(query);
        return [];
      }

      const songs: Song[] = [];
      
      // Sort results to prioritize official channels and better matches
      const sortedItems = this.sortYouTubeResults(data.items, query);
      
      // Process only the top 3 results for speed, get detailed info in parallel
      const topItems = sortedItems.slice(0, 3);
      const videoInfoPromises = topItems.map(async (item) => {
        const videoId = item.id?.videoId;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        try {
          const videoInfo = await ytdl.getInfo(videoUrl);
          const videoDetails = videoInfo.videoDetails;
          
          return this.createSong({
            title: videoDetails.title,
            artist: videoDetails.author.name,
            url: videoUrl,
            duration: parseInt(videoDetails.lengthSeconds),
            thumbnail: videoDetails.thumbnails[0]?.url,
            requestedBy: '',
            platform: 'youtube'
          });
        } catch (error) {
          this.logServiceError(`getting video info for ${videoId}`, error as Error);
          return null;
        }
      });
      
      const videoResults = await Promise.allSettled(videoInfoPromises);
      
      // Add successful results
      for (const result of videoResults) {
        if (result.status === 'fulfilled' && result.value) {
          songs.push(result.value);
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
      logger.info(`Getting stream info for: ${song.title} - ${song.url}`);
      const info = await ytdl.getInfo(song.url);
      
      logger.info(`Available formats: ${info.formats.length}`);
      // Try to get the best audio format available
      let format = ytdl.chooseFormat(info.formats, {
        quality: 'highestaudio',
        filter: 'audioonly'
      });
      
      // Fallback to any audio-only format
      if (!format) {
        format = ytdl.chooseFormat(info.formats, {
          quality: 'highestaudio',
          filter: 'audioonly'
        });
      }
      
      // Last resort: any audio format
      if (!format) {
        format = ytdl.chooseFormat(info.formats, {
          quality: 'highestaudio'
        });
      }
      
      if (!format) {
        logger.error(`No suitable audio format found for ${song.title}. Available formats: ${info.formats.map(f => `${f.itag}:${f.container}:${f.hasAudio}:${f.hasVideo}`).join(', ')}`);
        throw new Error('No suitable audio format found');
      }
      
      logger.info(`Selected format for ${song.title}: ${format.itag} - ${format.container} - ${format.contentLength} bytes`);
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

  private sortYouTubeResults(items: YouTubeSearchItem[], query: string): YouTubeSearchItem[] {
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