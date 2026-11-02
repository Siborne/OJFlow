import type { ProblemSearchRequest, ProblemSearchResult } from '../../shared/types';

export class ProblemService {
  static search(request: ProblemSearchRequest): Promise<ProblemSearchResult> {
    return window.api.searchProblems(request);
  }
}
