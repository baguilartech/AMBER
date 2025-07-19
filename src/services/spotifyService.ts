import SpotifyWebApi from 'spotify-web-api-node';
import { Song } from '../types';
import { apiKeys } from '../utils/config';
import { logger } from '../utils/logger';
import { URLValidator } from '../utils/urlValidator';
import { joinArtistNames } from '../utils/formatters';
import { BaseMusicService } from './baseMusicService';
import { ServiceFactory } from './serviceFactory';

export class SpotifyService extends BaseMusicService {
  protected platform = 'Spotify';
  private readonly spotify: SpotifyWebApi;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    super();
    this.spotify = new SpotifyWebApi({
      clientId: apiKeys.spotify.clientId,
      clientSecret: apiKeys.spotify.clientSecret
    });
  }

  private async ensureAccessToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return;
    }

    try {
      const data = await this.spotify.clientCredentialsGrant();
      this.accessToken = data.body['access_token'];
      this.tokenExpiry = Date.now() + (data.body['expires_in'] * 1000);
      this.spotify.setAccessToken(this.accessToken);
      logger.info('Spotify access token refreshed');
    } catch (error) {
      this.logServiceError('getting access token', error as Error);
      throw error;
    }
  }

  async search(query: string): Promise<Song[]> {
    try {
      await this.ensureAccessToken();
      
      const results = await this.spotify.searchTracks(query, { limit: 5 });
      const tracks = results.body.tracks?.items || [];
      
      if (tracks.length === 0) {
        this.logNoResults(query);
        return [];
      }

      const songs: Song[] = [];
      
      for (const track of tracks) {
        const artists = joinArtistNames(track.artists);
        
        songs.push(this.createSong({
          title: track.name,
          artist: artists,
          url: track.external_urls.spotify,
          duration: Math.floor(track.duration_ms / 1000),
          thumbnail: track.album.images[0]?.url,
          requestedBy: '',
          platform: 'spotify'
        }));
      }

      this.logSearchResults(songs.length, query);
      return songs;
    } catch (error) {
      return this.handleSearchError(error as Error);
    }
  }

  async getStreamUrl(song: Song): Promise<string> {
    try {
      const youtubeService = ServiceFactory.getYouTubeService();
      const primaryArtist = this.getPrimaryArtist(song.artist);
      
      // Run multiple search strategies in parallel for speed
      const searchPromises = [
        // Strategy 1: Quoted search with primary artist (most accurate)
        youtubeService.search(`"${song.title}" "${primaryArtist}"`),
        // Strategy 2: Primary artist without quotes (fast fallback)
        youtubeService.search(`${song.title} ${primaryArtist}`),
        // Strategy 3: With "official" keyword (for official tracks)
        youtubeService.search(`${song.title} ${primaryArtist} official`)
      ];
      
      const startTime = Date.now();
      // Add 8-second timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search timeout')), 8000)
      );
      
      const results = await Promise.race([
        Promise.allSettled(searchPromises),
        timeoutPromise
      ]) as PromiseSettledResult<Song[]>[];
      
      const searchTime = Date.now() - startTime;
      
      // Find first successful result with songs
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'fulfilled') {
          const songs = (results[i] as PromiseFulfilledResult<Song[]>).value;
          if (songs.length > 0) {
            const bestMatch = songs[0];
            logger.info(`YouTube search completed in ${searchTime}ms using strategy ${i + 1}. Selected: ${bestMatch.title} by ${bestMatch.artist}`);
            return bestMatch.url;
          }
        }
      }
      
      // Fallback: try full artist name if parallel searches failed
      logger.info(`Parallel searches failed, trying fallback with full artist name`);
      const fallbackSongs = await youtubeService.search(`${song.title} ${song.artist}`);
      if (fallbackSongs.length > 0) {
        const bestMatch = fallbackSongs[0];
        logger.info(`Fallback search successful: ${bestMatch.title} by ${bestMatch.artist}`);
        return bestMatch.url;
      }
      
      // Last resort: title only
      logger.info(`Fallback failed, trying title-only search`);
      const titleOnlySongs = await youtubeService.search(song.title);
      if (titleOnlySongs.length > 0) {
        const bestMatch = titleOnlySongs[0];
        logger.info(`Title-only search successful: ${bestMatch.title} by ${bestMatch.artist}`);
        return bestMatch.url;
      }
      
      throw new Error(`No YouTube equivalent found for Spotify track: ${song.title} by ${song.artist}`);
    } catch (error) {
      logger.error(`Error getting stream URL for Spotify track ${song.title}:`, error);
      throw error;
    }
  }


  validateUrl(url: string): boolean {
    return URLValidator.validateSpotify(url);
  }

  isConfigured(): boolean {
    return !!(apiKeys.spotify.clientId && apiKeys.spotify.clientSecret);
  }

  async getSongFromUrl(url: string, requestedBy: string): Promise<Song | null> {
    if (!this.validateUrl(url)) {
      return null;
    }

    try {
      await this.ensureAccessToken();
      
      const trackId = this.extractTrackId(url);
      if (!trackId) {
        return null;
      }

      const track = await this.spotify.getTrack(trackId);
      const trackData = track.body;
      const artists = joinArtistNames(trackData.artists);
      
      return {
        title: trackData.name,
        artist: artists,
        url: url,
        duration: Math.floor(trackData.duration_ms / 1000),
        thumbnail: trackData.album.images[0]?.url,
        requestedBy,
        platform: 'spotify'
      };
    } catch (error) {
      logger.error(`Error getting song from Spotify URL ${url}:`, error);
      return null;
    }
  }

  async getPlaylistSongs(url: string, requestedBy: string): Promise<Song[]> {
    if (!url.includes('playlist')) {
      return [];
    }

    try {
      await this.ensureAccessToken();
      
      const playlistId = this.extractPlaylistId(url);
      if (!playlistId) {
        return [];
      }

      const playlist = await this.spotify.getPlaylist(playlistId);
      const tracks = playlist.body.tracks.items;
      
      const songs: Song[] = [];
      
      for (const item of tracks) {
        if (item.track && item.track.type === 'track') {
          const track = item.track;
          const artists = joinArtistNames(track.artists);
          
          songs.push(this.createSong({
            title: track.name,
            artist: artists,
            url: track.external_urls.spotify,
            duration: Math.floor(track.duration_ms / 1000),
            thumbnail: track.album.images[0]?.url,
            requestedBy,
            platform: 'spotify'
          }));
        }
      }

      logger.info(`Extracted ${songs.length} songs from Spotify playlist`);
      return songs;
    } catch (error) {
      logger.error(`Error getting playlist songs from ${url}:`, error);
      return [];
    }
  }

  private extractTrackId(url: string): string | null {
    const regex = /track\/([a-zA-Z0-9]+)/;
    const match = regex.exec(url);
    return match ? match[1] : null;
  }

  private extractPlaylistId(url: string): string | null {
    const regex = /playlist\/([a-zA-Z0-9]+)/;
    const match = regex.exec(url);
    return match ? match[1] : null;
  }

  private getPrimaryArtist(artist: string): string {
    // For multiple artists separated by commas, take the first one or two
    const artists = artist.split(',').map(a => a.trim());
    
    // If there are multiple artists, prioritize the main ones
    if (artists.length > 1) {
      // Take first two artists max for better search results
      return artists.slice(0, 2).join(', ');
    }
    
    return artist;
  }
}