import {
  ChangeDetectionStrategy,
  Component,
  type TemplateRef,
  inject,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { AppIcon } from '../shared/app-icon';
import { TrainerFaqActions } from './trainer-faq.actions';
import { TrainerFaqActionsBar } from './trainer-faq-actions';
import { TrainerStore } from './trainer.store';

/** The trained-answer details the shared right sidebar shows. */
@Component({
  selector: 'app-trainer-faq-details',
  standalone: true,
  imports: [DatePipe, AppIcon, TrainerFaqActionsBar],
  templateUrl: './trainer-faq-details.html',
  styleUrls: [
    './styles/trainer-common.css',
    './styles/trainer-controls.css',
    './styles/trainer-details.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerFaqDetails {
  protected readonly store = inject(TrainerStore);
  protected readonly actions = inject(TrainerFaqActions);
  private readonly detailsTemplate = viewChild.required<TemplateRef<unknown>>('faqDetails');

  template(): TemplateRef<unknown> {
    return this.detailsTemplate();
  }
}
