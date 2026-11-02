import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useUiStore } from './stores/ui';
import { useContestStore } from './stores/contest';
import { useScheduleStore } from './stores/schedule';
import { useEffect } from 'react';
import { TooltipProvider } from './components/ui/tooltip';

export default function App() {
  const uiInit = useUiStore(s => s.init);
  const contestInit = useContestStore(s => s.init);
  const scheduleInit = useScheduleStore(s => s.init);
  const applyContestsPartial = useContestStore(s => s.applyContestsPartial);
  const fetchContests = useContestStore(s => s.fetchContests);
  const liveContestUpdates = useUiStore(s => s.features.liveContestUpdates);

  useEffect(() => {
    uiInit();
    contestInit();
    scheduleInit();
  }, [uiInit, contestInit, scheduleInit]);

  useEffect(() => {
    if (!liveContestUpdates || !window.api?.onContestsPartial) return;
    return window.api.onContestsPartial(applyContestsPartial);
  }, [applyContestsPartial, liveContestUpdates]);

  useEffect(() => {
    if (!window.api?.onRefreshContestsRequested) return;
    return window.api.onRefreshContestsRequested(() => {
      void fetchContests().catch(() => {
        // The store exposes the user-facing error state.
      });
    });
  }, [fetchContests]);

  return (
    <TooltipProvider delayDuration={300}>
      <RouterProvider router={router} />
    </TooltipProvider>
  );
}
