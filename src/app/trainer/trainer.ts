import {
  ChangeDetectionStrategy,
  Component,
  type OnDestroy,
  type OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppEngineFacts } from '../shared/app-engine-facts';
import { AppShell } from '../shared/app-shell';
import { PageInfoFacts } from '../shared/page-info-facts';
import { RightSidebarService } from '../shared/right-sidebar.service';
import { TRAINER_SIDEBAR_OWNER } from './trainer.constants';
import { TrainerDataService } from './trainer-data.service';
import { TrainerDocuments } from './trainer-documents';
import { TrainerFaqActions } from './trainer-faq.actions';
import { TrainerFaqs } from './trainer-faqs';
import { TrainerInbox } from './trainer-inbox';
import { TrainerMerge } from './trainer-merge';
import { TrainerNewFaq } from './trainer-new-faq';
import { TrainerBase } from './trainer-base';
import { TrainerStore } from './trainer.store';
import { TrainerTabs } from './trainer-tabs';
import type { TrainerTab } from './trainer.types';

/** The training room: one tab strip over the corpus tools the trainer uses. */
@Component({
  selector: 'app-trainer',
  standalone: true,
  imports: [
    AppShell,
    AppEngineFacts,
    PageInfoFacts,
    TrainerTabs,
    TrainerInbox,
    TrainerFaqs,
    TrainerMerge,
    TrainerNewFaq,
    TrainerDocuments,
    TrainerBase,
  ],
  templateUrl: './trainer.html',
  styleUrls: ['./trainer.css', './styles/trainer-controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Trainer implements OnInit, OnDestroy {
  protected readonly store = inject(TrainerStore);
  protected readonly data = inject(TrainerDataService);
  private readonly faqs = inject(TrainerFaqActions);
  private readonly route = inject(ActivatedRoute);
  private readonly sidebar = inject(RightSidebarService);

  ngOnInit(): void {
    this.data.refresh();
    this.data.refreshDocuments();
    this.route.queryParamMap.subscribe((params) => {
      const teach = params.get('teach');
      if (!teach) {
        return;
      }
      this.store.setTab('new');
      this.store.newQuestion.set(teach);
      this.store.newAnswer.set(params.get('answer') ?? '');
    });
  }

  ngOnDestroy(): void {
    this.sidebar.clearDetails(TRAINER_SIDEBAR_OWNER);
  }

  setTab(tab: TrainerTab): void {
    this.store.setTab(tab);
    this.faqs.closeFaq();
  }
}
