export class URLValidator {
  private static readonly YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)[a-zA-Z0-9_-]{11}(&.*)?$/;
  private static readonly SPOTIFY_REGEX = /^https?:\/\/(open\.)?spotify\.com\/(track|album|playlist)\/[a-zA-Z0-9]+(\?.*)?$/;
  private static readonly SOUNDCLOUD_REGEX = /^https?:\/\/(www\.)?soundcloud\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/;

  static validateYoutube(url: string): boolean {
    return this.YOUTUBE_REGEX.test(url);
  }

  static validateSpotify(url: string): boolean {
    return this.SPOTIFY_REGEX.test(url);
  }

  static validateSoundCloud(url: string): boolean {
    return this.SOUNDCLOUD_REGEX.test(url);
  }

  static validateAnyMusicUrl(url: string): boolean {
    return this.validateYoutube(url) || 
           this.validateSpotify(url) || 
           this.validateSoundCloud(url);
  }

  static getPlatformFromUrl(url: string): 'youtube' | 'spotify' | 'soundcloud' | null {
    if (this.validateYoutube(url)) return 'youtube';
    if (this.validateSpotify(url)) return 'spotify';
    if (this.validateSoundCloud(url)) return 'soundcloud';
    return null;
  }
}