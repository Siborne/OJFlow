'use client';

import { useState } from 'react';
import { useStore } from '@/store';
import { ojClient, SolvedStats } from '@/services/ojClient';
import { UnderDevelopment } from '@/components/UnderDevelopment';
import { RotateCw, X, HelpCircle, AlertCircle } from 'lucide-react';

interface StatCardProps {
  platformId: string;
  name: string;
  icon?: React.ReactNode;
  label: string; // '用户名' or 'id'
}

const SUPPORTED_PLATFORMS = ['codeforces', 'leetcode', 'atcoder', 'nowcoder', 'hdu', 'poj'];
// Check env var, default to true if not explicitly set to false
const USE_REAL_API = process.env.NEXT_PUBLIC_USE_REAL_API !== 'false';

export const StatCard = ({ platformId, name, icon, label }: StatCardProps) => {
  const { accounts, setAccount, removeAccount } = useStore();
  const account = accounts[platformId] || { id: platformId, platform_id: platformId, username: '', handle: '' };
  const [inputValue, setInputValue] = useState(account.username || '');
  const [isLoading, setIsLoading] = useState(false);

  const isSupported = SUPPORTED_PLATFORMS.includes(platformId);
  const showUnderDevelopment = !USE_REAL_API || !isSupported;

  const handleUpdate = async () => {
    if (!inputValue || showUnderDevelopment) return;
    setIsLoading(true);
    
    try {
      let stats: SolvedStats;
      switch (platformId) {
        case 'codeforces':
          stats = await ojClient.getCodeforcesStats(inputValue);
          break;
        case 'leetcode':
          stats = await ojClient.getLeetCodeStats(inputValue);
          break;
        case 'atcoder':
          stats = await ojClient.getAtCoderStats(inputValue);
          break;
        case 'nowcoder':
          stats = await ojClient.getNowCoderStats(inputValue);
          break;
        case 'hdu':
          stats = await ojClient.getHduStats(inputValue);
          break;
        case 'poj':
          stats = await ojClient.getPojStats(inputValue);
          break;
        default:
          throw new Error('Platform not supported');
      }

      setAccount(platformId, {
        ...account,
        username: inputValue,
        handle: inputValue,
        solved_count: stats.solved,
        error: undefined,
        last_synced: new Date().toISOString()
      });
    } catch (err: any) {
      console.error(`Failed to fetch stats for ${platformId}:`, err);
      setAccount(platformId, {
        ...account,
        username: inputValue,
        handle: inputValue,
        error: err.message || '查询失败',
        last_synced: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    removeAccount(platformId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUpdate();
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-muted/50 px-4 py-2 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
           {/* Placeholder for platform icon */}
           <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-700 rounded-sm flex items-center justify-center text-xs font-bold text-muted-foreground">
             {name[0]}
           </div>
           <span className="font-bold text-foreground">{name}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          {platformId === 'leetcode' || platformId === 'nowcoder' ? <HelpCircle className="w-4 h-4" /> : null}
          {platformId === 'lanqiao' ? <AlertCircle className="w-4 h-4" /> : null}
          {!showUnderDevelopment && (
            <button 
              onClick={handleUpdate} 
              disabled={isLoading}
              className={`hover:text-foreground transition-colors ${isLoading ? 'animate-spin' : ''}`}
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="text-sm text-blue-500 font-medium">{label}</div>
        
        {showUnderDevelopment ? (
          <div className="py-2">
            <UnderDevelopment label={!isSupported ? "暂未接入真实数据" : "API未启用"} />
          </div>
        ) : (
          <>
            <div className="relative group">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={label}
                disabled={isLoading}
                className="w-full py-1 bg-transparent border-b border-zinc-300 dark:border-zinc-700 text-foreground focus:outline-none focus:border-blue-500 transition-colors placeholder:text-muted-foreground/50 disabled:opacity-50"
              />
              {inputValue && !isLoading && (
                <button 
                  onClick={handleClear}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Line */}
            <div className="min-h-[20px] text-sm mt-1">
              {isLoading ? (
                 <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 animate-progress origin-left"></div>
                 </div>
              ) : account.error ? (
                <span className="text-red-500 text-xs">{account.error}</span>
              ) : account.solved_count !== undefined && account.solved_count >= 0 ? (
                <span className="text-green-600 dark:text-green-500">已解决: {account.solved_count}</span>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
