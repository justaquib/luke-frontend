import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ModelLevelEntry } from '../core/api/api.types';
import { AppIcon } from '../shared/app-icon';
import { roadmapHint, roadmapState, SEED_LEVEL, type RoadmapState } from './brain.ladder';

/** The part of the level payload the road reads. */
export interface RoadmapSource {
  level: string;
  measured_level: string;
  approval_ready: boolean;
  max_level?: string;
  levels: ModelLevelEntry[];
}

/** One level on the road, with the state its place earns. */
interface RoadmapNode {
  level: string;
  name: string;
  state: RoadmapState;
  hint: string;
  current: boolean;
}

/** One band of the road: its gate, its nine steps and what it holds. */
interface RoadmapBand {
  key: string;
  name: string;
  levels: RoadmapNode[];
  passed: number;
  tested: boolean;
}

/** What every level on the road is read against. */
interface RoadContext {
  entries: ModelLevelEntry[];
  current: string;
  measured: string;
  pending: boolean;
}

/**
 * The whole road to 1.0.0, in its eleven bands. A level passes at or below
 * the approved level, the next one opens only when it has a test and nothing
 * waits for approval, and every level after that stays locked.
 */
@Component({
  selector: 'app-brain-roadmap',
  imports: [AppIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brain-roadmap.html',
  styleUrl: './brain-roadmap.css',
})
export class BrainRoadmap {
  readonly level = input<RoadmapSource | null>(null);

  /** Every level of the road, in its band, with its state. */
  protected readonly bands = computed<RoadmapBand[]>(() => {
    const context = this.roadContext();
    const bands = new Map<string, RoadmapBand>();
    for (const entry of context.entries) {
      const key = this.bandKey(entry);
      const band = bands.get(key) ?? this.emptyBand(key, entry);
      const node = this.node(entry, context);
      band.levels.push(node);
      if (node.state === 'passed') band.passed += 1;
      if (entry.open !== false) band.tested = true;
      bands.set(key, band);
    }
    return [...bands.values()];
  });

  /** How many levels of the road are behind the displayed level. */
  protected readonly passedLevels = computed(() =>
    this.bands().reduce((sum, band) => sum + band.passed, 0),
  );

  /** How many levels the road holds. */
  protected readonly totalLevels = computed(() => this.level()?.levels?.length ?? 0);

  /** The full sentence a trainer hears for one level of the road. */
  protected label(node: RoadmapNode): string {
    return `${node.level} ${node.name} — ${node.hint}`;
  }

  private roadContext(): RoadContext {
    const level = this.level();
    const current = level?.level ?? SEED_LEVEL;
    return {
      entries: level?.levels ?? [],
      current,
      measured: level?.measured_level ?? current,
      pending: level?.approval_ready ?? false,
    };
  }

  private node(entry: ModelLevelEntry, context: RoadContext): RoadmapNode {
    const state = roadmapState(
      entry,
      context.entries,
      context.current,
      context.measured,
      context.pending,
    );
    return {
      level: entry.level,
      name: entry.name,
      state,
      hint: roadmapHint(entry, state),
      current: entry.level === context.current,
    };
  }

  private bandKey(entry: ModelLevelEntry): string {
    return entry.band ?? entry.level.split('.').slice(0, 2).join('.');
  }

  private emptyBand(key: string, entry: ModelLevelEntry): RoadmapBand {
    return {
      key,
      name: entry.band_name ?? 'Ladder',
      levels: [],
      passed: 0,
      tested: false,
    };
  }
}
