'use client';

import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store';
import { fetchAllContests } from '@/services/api';
import { ContestCard } from '@/components/ContestCard';
import { RefreshCw, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function Home() {
  const { contests, setContests, isLoading, setLoading } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  // Use a localized string for search placeholder if possible, otherwise default to English
  const t = useTranslations('Navbar'); 

  const loadContests = async () => {
    setLoading(true);
    try {
      const data = await fetchAllContests();
      setContests(data);
    } catch (error) {
      console.error('Failed to load contests', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contests.length === 0) {
      loadContests();
    }
  }, []);

  const filteredContests = useMemo(() => {
    if (!searchQuery) return contests;
    const query = searchQuery.toLowerCase();
    return contests.filter((contest) => 
      contest.name.toLowerCase().includes(query) ||
      contest.platform_id.toLowerCase().includes(query)
    );
  }, [contests, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Contests</h1>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search contests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-muted-foreground"
            />
          </div>
          
          <button
            onClick={loadContests}
            disabled={isLoading}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && contests.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {filteredContests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No contests found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContests.map((contest) => (
                <ContestCard key={contest.id} contest={contest} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
