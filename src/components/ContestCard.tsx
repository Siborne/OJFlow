import { Contest } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { ExternalLink, Calendar, Clock } from 'lucide-react';
import { open } from '@tauri-apps/plugin-shell';

interface ContestCardProps {
  contest: Contest;
  platformIcon?: string;
}

export const ContestCard = ({ contest }: ContestCardProps) => {
  const isRunning = contest.status === 'running';
  
  // Robust date handling
  let startTime = new Date();
  try {
    const parsedDate = new Date(contest.start_time);
    if (!isNaN(parsedDate.getTime())) {
      startTime = parsedDate;
    }
  } catch (e) {
    console.error('Invalid date for contest:', contest.name, contest.start_time);
  }

  const handleOpenContest = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        await open(contest.url);
      } else {
        window.open(contest.url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to open link:', error);
      // Fallback to standard window.open if Tauri fails
      window.open(contest.url, '_blank', 'noopener,noreferrer');
    }
  };
  
  return (
    <div className="bg-card rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow border border-border flex flex-col h-full">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg text-card-foreground line-clamp-2" title={contest.name}>
          {contest.name}
        </h3>
        <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ml-2 ${
          isRunning 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        }`}>
          {isRunning ? 'Running' : 'Upcoming'}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-muted-foreground flex-grow">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span>{format(startTime, 'PPP p')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>{formatDistanceToNow(startTime, { addSuffix: true })}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Duration:</span>
          <span>{Math.floor(contest.duration / 60)} mins</span>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <a 
          href={contest.url} 
          onClick={handleOpenContest}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
        >
          View Contest <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
