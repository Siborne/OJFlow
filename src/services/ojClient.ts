import { request } from '@/utils/request';

export interface SolvedStats {
  solved: number;
  easy?: number;
  medium?: number;
  hard?: number;
  rank?: number;
  rating?: number;
}

export const ojClient = {
  // Codeforces - via Official API (or ojhunt if needed)
  async getCodeforcesStats(handle: string): Promise<SolvedStats> {
    try {
      // Trying official API first
      const response = await request(`https://codeforces.com/api/user.info?handles=${handle}`);
      if (!response.ok) throw new Error(`CF API Error: ${response.status}`);
      const data = await response.json();
      if (data.status === 'OK' && data.result.length > 0) {
        const user = data.result[0];
        
        // CF API doesn't return solved count directly in user.info
        // Let's use the reference's approach: ojhunt
        const ojhuntRes = await request(`https://ojhunt.com/api/crawlers/codeforces/${handle}`);
        if (ojhuntRes.ok) {
           const ojhuntData = await ojhuntRes.json();
           if (ojhuntData.data && typeof ojhuntData.data.solved === 'number') {
             return { solved: ojhuntData.data.solved, rating: user.rating, rank: user.rank };
           }
        }
        
        // Fallback if ojhunt fails but user exists
        return { solved: 0, rating: user.rating, rank: user.rank };
      }
      throw new Error(data.comment || 'Unknown Error');
    } catch (e) {
      console.error('Codeforces fetch error:', e);
      throw e;
    }
  },

  // LeetCode (CN) - via GraphQL
  async getLeetCodeStats(handle: string): Promise<SolvedStats> {
    const response = await request('https://leetcode.cn/graphql/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        query: `
          query userProfileUserQuestionProgressV2($userSlug: String!) {
            userProfileUserQuestionProgressV2(userSlug: $userSlug) {
              numAcceptedQuestions {
                count
                difficulty
              }
            }
          }
        `,
        variables: { userSlug: handle },
        operationName: "userProfileUserQuestionProgressV2"
      }),
    });

    if (!response.ok) throw new Error(`LeetCode API Error: ${response.status}`);
    const data = await response.json();
    
    if (data.errors) throw new Error(data.errors[0].message);
    
    const stats = data.data?.userProfileUserQuestionProgressV2?.numAcceptedQuestions;
    if (!stats) throw new Error('User not found or no data');

    const easy = stats.find((s: any) => s.difficulty === 'EASY')?.count || 0;
    const medium = stats.find((s: any) => s.difficulty === 'MEDIUM')?.count || 0;
    const hard = stats.find((s: any) => s.difficulty === 'HARD')?.count || 0;

    return {
      solved: easy + medium + hard,
      easy,
      medium,
      hard
    };
  },

  // AtCoder - via Kenkoooo
  async getAtCoderStats(handle: string): Promise<SolvedStats> {
    const response = await request(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user=${handle}`);
    if (!response.ok) throw new Error(`AtCoder API Error: ${response.status}`);
    const data = await response.json();
    return {
      solved: data.count || 0
    };
  },
  
  // NowCoder - via ojhunt (as per reference)
  async getNowCoderStats(handle: string): Promise<SolvedStats> {
    const response = await request(`https://ojhunt.com/api/crawlers/nowcoder/${handle}`);
    if (!response.ok) throw new Error(`NowCoder API Error: ${response.status}`);
    const data = await response.json();
    return {
      solved: data.data?.solved || 0
    };
  },

  // HDU - via ojhunt
  async getHduStats(handle: string): Promise<SolvedStats> {
    const response = await request(`https://ojhunt.com/api/crawlers/hdu/${handle}`);
    if (!response.ok) throw new Error(`HDU API Error: ${response.status}`);
    const data = await response.json();
    return {
      solved: data.data?.solved || 0
    };
  },

  // POJ - via ojhunt
  async getPojStats(handle: string): Promise<SolvedStats> {
    const response = await request(`https://ojhunt.com/api/crawlers/poj/${handle}`);
    if (!response.ok) throw new Error(`POJ API Error: ${response.status}`);
    const data = await response.json();
    return {
      solved: data.data?.solved || 0
    };
  },

  // Generic/Mock for unsupported
  async getMockStats(handle: string): Promise<SolvedStats> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { solved: 123, easy: 50, medium: 50, hard: 23 };
  }
};
