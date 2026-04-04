import { Rating } from '../types';

export class RatingService {
  static async getRating(platform: string, name: string): Promise<Rating> {
    return (await window.api.getRating(platform, name)) as Rating;
  }
}
