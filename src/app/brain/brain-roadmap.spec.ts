import { TestBed } from '@angular/core/testing';
import type { ModelLevelEntry } from '../core/api/api.types';
import { BrainRoadmap, type RoadmapSource } from './brain-roadmap';
import { roadmapState } from './brain.ladder';

const entry = (level: string, open: boolean): ModelLevelEntry => {
  const band = level.split('.').slice(0, 2).join('.');
  return {
    level,
    name: `Level ${level}`,
    description: '',
    reference: '',
    open,
    band,
    band_name: `Band ${band}`,
    band_detail: '',
  };
};

const source = (overrides: Partial<RoadmapSource> = {}): RoadmapSource => ({
  level: '0.0.0',
  measured_level: '0.0.0',
  approval_ready: false,
  max_level: '1.0.0',
  levels: [entry('0.0.0', true), entry('0.0.1', true), entry('0.0.2', true)],
  ...overrides,
});

const render = (level: RoadmapSource): HTMLElement => {
  const fixture = TestBed.createComponent(BrainRoadmap);
  fixture.componentRef.setInput('level', level);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
};

const nodes = (compiled: HTMLElement): HTMLElement[] => [
  ...compiled.querySelectorAll<HTMLElement>('.node'),
];

const has = (node: HTMLElement, state: string): boolean => node.classList.contains(state);

describe('roadmapState', () => {
  const levels = [entry('0.0.0', true), entry('0.0.1', true), entry('0.0.2', true)];

  it('keeps the next level locked until the previous one is passed', () => {
    expect(roadmapState(levels[0], levels, '0.0.0', '0.0.0', false)).toBe('passed');
    expect(roadmapState(levels[1], levels, '0.0.0', '0.0.0', false)).toBe('next');
    expect(roadmapState(levels[2], levels, '0.0.0', '0.0.0', false)).toBe('locked');
  });

  it('locks the road while a measurement waits for approval', () => {
    expect(roadmapState(levels[1], levels, '0.0.0', '0.0.1', true)).toBe('ahead');
    expect(roadmapState(levels[2], levels, '0.0.0', '0.0.1', true)).toBe('locked');
  });

  it('keeps a level with no test locked even at the frontier', () => {
    const closed = entry('0.1.1', false);
    const road = [...levels, entry('0.1.0', true), closed];

    expect(roadmapState(closed, road, '0.1.0', '0.1.0', false)).toBe('locked');
  });
});

describe('BrainRoadmap', () => {
  it('shows the whole road, one band at a time, up to 1.0.0', () => {
    const levels: ModelLevelEntry[] = [];
    for (let band = 0; band < 10; band += 1) {
      for (let step = 0; step < 10; step += 1) {
        levels.push(entry(`0.${band}.${step}`, band === 0 || (band === 1 && step === 0)));
      }
    }
    levels.push(entry('1.0.0', false));

    const compiled = render(source({ level: '0.1.0', measured_level: '0.1.0', levels }));

    expect(nodes(compiled).length).toBe(101);
    expect(compiled.querySelectorAll('.band').length).toBe(11);
    expect(compiled.textContent).toContain('Ladder to 1.0.0');
    expect(compiled.textContent).toContain('11 of 101 passed');
    expect(compiled.querySelectorAll('.node.next').length).toBe(0);
    expect(compiled.querySelectorAll('.node.locked').length).toBe(90);
    expect(nodes(compiled).at(-1)?.textContent).toContain('1.0.0');
    expect(nodes(compiled).at(-1)?.getAttribute('aria-label')).toContain(
      'No test has been written',
    );
  });

  it('marks the current level and opens only the one after it', () => {
    const compiled = render(
      source({
        levels: [
          entry('0.0.0', true),
          entry('0.0.1', true),
          entry('0.0.2', true),
          entry('0.0.3', true),
        ],
      }),
    );
    const [passed, next, later, last] = nodes(compiled);

    expect(has(passed, 'passed')).toBe(true);
    expect(has(passed, 'current')).toBe(true);
    expect(passed.getAttribute('aria-current')).toBe('step');
    expect(has(next, 'next')).toBe(true);
    expect(next.getAttribute('aria-label')).toContain('This level is open');
    expect(has(later, 'locked')).toBe(true);
    expect(has(last, 'locked')).toBe(true);
    expect(compiled.textContent).toContain('1 of 4 passed');
  });

  it('shows measured levels as ahead while the promotion waits', () => {
    const compiled = render(
      source({
        measured_level: '0.0.2',
        approval_ready: true,
        levels: [
          entry('0.0.0', true),
          entry('0.0.1', true),
          entry('0.0.2', true),
          entry('0.0.3', true),
        ],
      }),
    );
    const [passed, first, second, last] = nodes(compiled);

    expect(has(passed, 'passed')).toBe(true);
    expect(has(first, 'ahead')).toBe(true);
    expect(has(second, 'ahead')).toBe(true);
    expect(first.getAttribute('aria-label')).toContain('Waiting for your approval');
    expect(has(last, 'locked')).toBe(true);
    expect(compiled.querySelector('.node.next')).toBeNull();
  });

  it('keeps the next level closed when its test has not been written', () => {
    const compiled = render(
      source({
        level: '0.1.0',
        measured_level: '0.1.0',
        levels: [
          entry('0.0.0', true),
          entry('0.1.0', true),
          entry('0.1.1', false),
          entry('1.0.0', false),
        ],
      }),
    );
    const [, frontier, next, final] = nodes(compiled);

    expect(has(frontier, 'passed')).toBe(true);
    expect(frontier.getAttribute('aria-current')).toBe('step');
    expect(has(next, 'locked')).toBe(true);
    expect(next.getAttribute('title')).toContain('No test has been written');
    expect(has(final, 'locked')).toBe(true);
    expect(compiled.querySelector('.node.next')).toBeNull();
  });
});
