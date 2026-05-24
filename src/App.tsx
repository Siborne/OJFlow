import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useUiStore } from './stores/ui';
import { useContestStore } from './stores/contest';
import { useEffect } from 'react';
import { TooltipProvider } from './components/ui/tooltip';

export default function App() {
  const uiInit = useUiStore((s) => s.init);
  const contestInit = useContestStore((s) => s.init);

  useEffect(() => {
    uiInit();
    contestInit();
  }, [uiInit, contestInit]);

  return (
    <TooltipProvider delayDuration={300}>
      <RouterProvider router={router} />
    </TooltipProvider>
  );
}
