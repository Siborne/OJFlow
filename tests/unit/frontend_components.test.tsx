import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { createContest, installDom } from './helpers';
import { click, findButton, render } from './react-helpers';
import { Button } from '../../src/components/ui/button';
import { Label } from '../../src/components/ui/label';
import { Skeleton } from '../../src/components/ui/skeleton';
import { Switch } from '../../src/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../src/components/ui/tooltip';
import { PageHeader } from '../../src/components/PageHeader';
import { ContestDateTabs } from '../../src/components/contest/ContestDateTabs';
import { ContestCard } from '../../src/components/contest/ContestCard';
import { ContestDayGroup } from '../../src/components/contest/ContestDayGroup';
import { ContestFilterModal } from '../../src/components/contest/ContestFilterModal';
import { ContestSummaryGrid } from '../../src/components/contest/ContestSummaryGrid';
import { SkeletonCard } from '../../src/components/contest/SkeletonCard';

let dom: ReturnType<typeof installDom>;

beforeAll(() => {
  dom = installDom();
});

afterAll(() => {
  dom.window.close();
});

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('base UI components', () => {
  test('Button handles clicks and disabled state', async () => {
    let clicks = 0;
    const first = await render(<Button onClick={() => clicks++}>Run</Button>);
    await click(findButton(first.container, 'Run'));
    expect(clicks).toBe(1);
    await first.unmount();

    const second = await render(
      <Button disabled onClick={() => clicks++}>
        Disabled
      </Button>,
    );
    await click(findButton(second.container, 'Disabled'));
    expect(clicks).toBe(1);
    await second.unmount();
  });

  test('Label, Skeleton, PageHeader and tooltip render', async () => {
    const view = await render(
      <div>
        <Label htmlFor="field">Field</Label>
        <Skeleton className="h-4" data-testid="skeleton" />
        <PageHeader title="Title" actions={<Button size="sm">Action</Button>} />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hover</Button>
            </TooltipTrigger>
            <TooltipContent>Hint</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>,
    );
    expect(view.container.textContent).toContain('Title');
    expect(view.container.textContent).toContain('Action');
    expect(view.container.querySelector('[data-testid="skeleton"]')).not.toBeNull();
    expect(view.container.querySelector('label')?.getAttribute('for')).toBe('field');
    expect(findButton(view.container, 'Hover')).toBeDefined();
    await view.unmount();
  });

  test('Switch calls onCheckedChange', async () => {
    const values: boolean[] = [];
    const view = await render(
      <Switch defaultChecked={false} onCheckedChange={value => values.push(value)} />,
    );
    const control = view.container.querySelector('[role="switch"]');
    expect(control).not.toBeNull();
    await click(control);
    expect(values).toEqual([true]);
    await view.unmount();
  });
});

describe('contest components', () => {
  const future = Math.floor(Date.now() / 1000) + 3600;

  test('date tabs notify selection', async () => {
    const values: string[] = [];
    const view = await render(
      <ContestDateTabs value="today" onChange={value => values.push(value)} />,
    );
    await click(findButton(view.container, '明天'));
    await click(findButton(view.container, '本周'));
    expect(values).toEqual(['tomorrow', 'thisWeek']);
    await view.unmount();
  });

  test('contest card opens and toggles favorite', async () => {
    const contest = createContest('Round', future);
    const opened: string[] = [];
    let favoriteCalls = 0;
    const view = await render(
      <ContestCard
        contest={contest}
        now={Date.now()}
        isFavorite={false}
        platformImage="data:image/gif;base64,R0lGODlhAQABAAAAACw="
        onOpen={value => opened.push(value.name)}
        onToggleFavorite={() => favoriteCalls++}
      />,
    );
    await click(findButton(view.container, '参赛'));
    const buttons = view.container.querySelectorAll('button');
    await click(buttons[buttons.length - 1]);
    expect(opened).toEqual(['Round']);
    expect(favoriteCalls).toBe(1);
    await view.unmount();
  });

  test('day group renders expanded content and handles empty groups', async () => {
    const contest = createContest('Round', future);
    const view = await render(
      <ContestDayGroup
        title="Today"
        contests={[contest]}
        now={Date.now()}
        selectedPlatforms={{ Codeforces: true }}
        isFavorite={() => false}
        getPlatformImage={() => 'data:image/gif;base64,R0lGODlhAQABAAAAACw='}
        onOpenContest={() => {}}
        onToggleFavorite={() => {}}
      />,
    );
    expect(view.container.textContent).toContain('Round');
    await view.unmount();

    let toggled = 0;
    const empty = await render(
      <ContestDayGroup
        title="Empty"
        contests={[]}
        now={Date.now()}
        selectedPlatforms={{}}
        isFavorite={() => false}
        getPlatformImage={() => ''}
        collapsible
        expanded
        onToggle={() => toggled++}
        onOpenContest={() => {}}
        onToggleFavorite={() => {}}
      />,
    );
    expect(empty.container.textContent).toContain('这里没有比赛喵');
    await click(empty.container.querySelector('.cursor-pointer'));
    expect(toggled).toBe(1);
    await empty.unmount();
  });

  test('filter modal updates empty-day and platform selections', async () => {
    const emptyValues: boolean[] = [];
    const platformValues: Array<[string, boolean]> = [];
    let closed = 0;
    const view = await render(
      <ContestFilterModal
        show
        showEmptyDay
        selectedPlatforms={{ Codeforces: true }}
        platforms={['Codeforces']}
        onClose={() => closed++}
        onToggleShowEmptyDay={value => emptyValues.push(value)}
        onTogglePlatform={(platform, value) => platformValues.push([platform, value])}
      />,
    );
    await click(view.container.querySelector('[role="switch"]'));
    await click(view.container.querySelector('input[type="checkbox"]'));
    await click(findButton(view.container, '关闭'));
    expect(emptyValues).toEqual([false]);
    expect(platformValues).toEqual([['Codeforces', false]]);
    expect(closed).toBe(1);
    await view.unmount();
  });

  test('summary grid and skeleton render useful content', async () => {
    const view = await render(
      <div>
        <ContestSummaryGrid
          visibleCount={3}
          favoriteCount={1}
          runningCount={1}
          nextContest={createContest('Next', future)}
          platformsWithCount={[{ name: 'Codeforces', count: 3 }]}
        />
        <SkeletonCard rows={2} />
      </div>,
    );
    expect(view.container.textContent).toContain('比赛总览');
    expect(view.container.textContent).toContain('下一场');
    expect(view.container.textContent).toContain('Codeforces');
    await view.unmount();
  });
});
