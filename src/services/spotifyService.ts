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
  private spotify: SpotifyWebApi;
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
      
      // Try quoted search first (most accurate)
      let searchQuery = `"${song.title}" "${song.artist}"`;
      let youtubeSongs = await youtubeService.search(searchQuery);
      
      // Fallback: try without quotes if no results
      if (youtubeSongs.length === 0) {
        logger.warn(`No results for quoted search, trying fallback for: ${song.title} by ${song.artist}`);
        searchQuery = `${song.title} ${song.artist}`;
        youtubeSongs = await youtubeService.search(searchQuery);
      }
      
      // Fallback: try with "official" added
      if (youtubeSongs.length === 0) {
        logger.warn(`No results for basic search, trying with "official" for: ${song.title} by ${song.artist}`);
        searchQuery = `${song.title} ${song.artist} official`;
        youtubeSongs = await youtubeService.search(searchQuery);
      }
      
      if (youtubeSongs.length === 0) {
        throw new Error(`No YouTube equivalent found for Spotify track: ${song.title} by ${song.artist}`);
      }
      
      const bestMatch = youtubeSongs[0];
      return await youtubeService.getStreamUrl(bestMatch);
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
    const match = url.match(/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  private extractPlaylistId(url: string): string | null {
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }
}