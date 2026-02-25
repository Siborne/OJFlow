
import { ojClient } from '../src/services/ojClient';

// Mock fetch globally
const originalFetch = global.fetch;

async function testOjClient() {
  console.log('Starting OJ Client Verification...');

  // Mock Data
  const mockResponses: Record<string, any> = {
    'https://codeforces.com/api/user.info?handles=tourist': {
      ok: true,
      json: async () => ({ status: 'OK', result: [{ rating: 3800, rank: 'legendary grandmaster' }] })
    },
    'https://ojhunt.com/api/crawlers/codeforces/tourist': {
      ok: true,
      json: async () => ({ data: { solved: 5000 } })
    },
    'https://leetcode.cn/graphql/': {
      ok: true,
      json: async () => ({ 
        data: { 
          userProfileUserQuestionProgressV2: { 
            numAcceptedQuestions: [
              { difficulty: 'EASY', count: 10 }, 
              { difficulty: 'MEDIUM', count: 20 }, 
              { difficulty: 'HARD', count: 5 }
            ] 
          } 
        } 
      })
    }
  };

  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    console.log(`[MockFetch] ${url}`);
    
    if (mockResponses[url]) {
      return {
        ok: true,
        status: 200,
        json: mockResponses[url].json
      } as Response;
    }
    
    return {
      ok: false,
      status: 404,
      statusText: 'Not Found'
    } as Response;
  };

  try {
    // Test Codeforces
    console.log('Testing Codeforces...');
    const cfStats = await ojClient.getCodeforcesStats('tourist');
    if (cfStats.solved === 5000) console.log('✅ Codeforces Success');
    else console.error('❌ Codeforces Failed', cfStats);

    // Test LeetCode
    console.log('Testing LeetCode...');
    const lcStats = await ojClient.getLeetCodeStats('testuser');
    if (lcStats.solved === 35) console.log('✅ LeetCode Success');
    else console.error('❌ LeetCode Failed', lcStats);

  } catch (e) {
    console.error('Test Failed:', e);
  } finally {
    global.fetch = originalFetch;
  }
}

testOjClient();
