import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  type OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModelSettingsService } from '../core/model-settings.service';
import type { LanguageBrainDocument } from '../core/api/language-brain.types';
import { AppEngineFacts, type EngineFact, type FactTone } from './app-engine-facts';
import { AppIcon } from './app-icon';
import { BackgroundTasksService } from './background-tasks.service';
import { RightSidebarService } from './right-sidebar.service';

/**
 * The neural engine information the top panel opens. Every value is read from
 * the engine, so the panel shows the model as it runs rather than a copy.
 */
@Component({
  selector: 'app-engine-details',
  standalone: true,
  imports: [RouterLink, AppEngineFacts, AppIcon],
  templateUrl: './app-engine-details.html',
  styleUrl: './app-engine-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppEngineDetails implements OnInit {
  protected readonly tasks = inject(BackgroundTasksService);
  protected readonly model = inject(ModelSettingsService);
  protected readonly sidebar = inject(RightSidebarService);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.model.load();
  }

  protected readonly facts = computed<EngineFact[]>(() => {
    const settings = this.model.settings();
    const brain = this.tasks.brain();
    return [
      { label: 'Model', value: this.model.name() },
      this.versionFact(settings?.start_level),
      ...(brain ? this.brainFacts(brain) : []),
    ];
  });

  private versionFact(startLevel: string | undefined): EngineFact {
    return {
      label: 'Version',
      value: this.model.level() ?? startLevel ?? 'Reading…',
      note: startLevel ? `starts at ${startLevel}` : undefined,
    };
  }

  private brainFacts(brain: LanguageBrainDocument): EngineFact[] {
    const stage = brain.progress?.stages?.find((step) => step.status === 'working')?.label;
    return [this.stateFact(brain, stage), this.vocabularyFact(brain), this.deviceFact(brain)];
  }

  private stateFact(brain: LanguageBrainDocument, stage?: string): EngineFact {
    const training = brain.training === true;
    const trained = brain.trained === true;
    const tone: FactTone | undefined = training ? 'warn' : trained ? 'ok' : undefined;
    return {
      label: 'State',
      value: training ? 'Training' : trained ? 'Trained' : 'Not trained',
      tone,
      note: stage,
    };
  }

  private vocabularyFact(brain: LanguageBrainDocument): EngineFact {
    return {
      label: 'Vocabulary',
      value: `${(brain.vocabulary ?? 0).toLocaleString()} words`,
    };
  }

  private deviceFact(brain: LanguageBrainDocument): EngineFact {
    return {
      label: 'Device',
      value: brain.engine?.device ?? 'Unknown',
      note: brain.engine?.torch ? `PyTorch ${brain.engine.torch}` : undefined,
    };
  }
}
