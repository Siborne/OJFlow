import type { CodeforcesReport } from '../../shared/types';

export class ReportService {
  static getCodeforcesReport(handle: string): Promise<CodeforcesReport> {
    return window.api.getCodeforcesReport(handle);
  }
}
