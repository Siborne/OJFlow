import { createHashRouter, Navigate } from 'react-router-dom';
import NavigationPage from './views/NavigationPage';
import { lazy, Suspense } from 'react';
import { Skeleton } from './components/ui/skeleton';

const Contest = lazy(() => import('./views/Contest'));
const DashboardPage = lazy(() => import('./views/DashboardPage'));
const Favorite = lazy(() => import('./views/Favorite'));
const ProblemsPage = lazy(() => import('./views/ProblemsPage'));
const ServicePage = lazy(() => import('./views/ServicePage'));
const Settings = lazy(() => import('./views/Settings'));
const RatingPage = lazy(() => import('./views/RatingPage'));
const SolvedNumPage = lazy(() => import('./views/SolvedNumPage'));
const ContestArchivePage = lazy(() => import('./views/ContestArchivePage'));
const CfpReportPage = lazy(() => import('./views/CfpReportPage'));
const PracticeInboxPage = lazy(() => import('./views/PracticeInboxPage'));
const SchedulePage = lazy(() => import('./views/SchedulePage'));
const TemplatesPage = lazy(() => import('./views/TemplatesPage'));

function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full p-8">
          <Skeleton className="h-32 w-full" />
        </div>
      }
    >
      <div className="page-transition h-full">{children}</div>
    </Suspense>
  );
}

export const router = createHashRouter([
  {
    path: '/',
    element: <NavigationPage />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: (
          <LazyRoute>
            <DashboardPage />
          </LazyRoute>
        ),
      },
      {
        path: 'practice',
        element: (
          <LazyRoute>
            <PracticeInboxPage />
          </LazyRoute>
        ),
      },
      {
        path: 'contest',
        element: (
          <LazyRoute>
            <Contest />
          </LazyRoute>
        ),
      },
      {
        path: 'schedule',
        element: (
          <LazyRoute>
            <SchedulePage />
          </LazyRoute>
        ),
      },
      {
        path: 'templates',
        element: (
          <LazyRoute>
            <TemplatesPage />
          </LazyRoute>
        ),
      },
      {
        path: 'star',
        element: (
          <LazyRoute>
            <Favorite />
          </LazyRoute>
        ),
      },
      {
        path: 'problems',
        element: (
          <LazyRoute>
            <ProblemsPage />
          </LazyRoute>
        ),
      },
      {
        path: 'service',
        element: (
          <LazyRoute>
            <ServicePage />
          </LazyRoute>
        ),
      },
      {
        path: 'setting',
        element: (
          <LazyRoute>
            <Settings />
          </LazyRoute>
        ),
      },
      {
        path: 'rating',
        element: (
          <LazyRoute>
            <RatingPage />
          </LazyRoute>
        ),
      },
      {
        path: 'solved_num',
        element: (
          <LazyRoute>
            <SolvedNumPage />
          </LazyRoute>
        ),
      },
      {
        path: 'archive',
        element: (
          <LazyRoute>
            <ContestArchivePage />
          </LazyRoute>
        ),
      },
      {
        path: 'ccpc',
        element: <Navigate to="/archive" replace />,
      },
      {
        path: 'oier',
        element: <Navigate to="/archive" replace />,
      },
      {
        path: 'cf_report',
        element: (
          <LazyRoute>
            <CfpReportPage />
          </LazyRoute>
        ),
      },
    ],
  },
]);
