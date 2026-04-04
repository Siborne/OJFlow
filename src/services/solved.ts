import { SolvedNum } from '../types';

export class SolvedNumService {
  static async getSolvedNum(platform: string, name: string): Promise<SolvedNum> {
    return (await window.api.getSolvedNum(platform, name)) as SolvedNum;
  }
}
