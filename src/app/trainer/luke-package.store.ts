import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  LukePackageCheck,
  LukePackageMode,
  LukePackagePreview,
} from '../core/api/luke-package';
import { isPackageApplied, isPackageCheck } from '../core/api/luke-package-validation';
import { ModelApiService } from '../core/api/model-api.service';
import { BrowserService } from '../core/browser.service';
import { UiService } from '../shared/ui.service';
import { packageConfirmation } from './luke-package-presenter';

type PackagePhase = 'idle' | 'preview' | 'download' | 'check' | 'confirm' | 'restore';
const PHASE_LABELS: Record<PackagePhase, string> = {
  idle: '',
  preview: 'Reading package contents…',
  download: 'Packing… Building the ZIP on this machine.',
  check: 'Checking the ZIP… No changes are being made.',
  confirm: 'Dry run passed. Review the restore confirmation.',
  restore: 'Restoring and verifying the workspace… Keep this page open.',
};

/** One package operation at a time, with a fresh dry run before every restore attempt. */
@Injectable()
export class LukePackageStore {
  readonly preview = signal<LukePackagePreview | null>(null);
  readonly mode = signal<LukePackageMode>('full');
  readonly error = signal('');
  readonly phase = signal<PackagePhase>('idle');
  readonly outcome = signal('');
  readonly busy = computed(() => this.phase() !== 'idle');
  readonly status = computed(() => PHASE_LABELS[this.phase()] || this.outcome());
  readonly selected = computed(() => this.preview()?.modes?.[this.mode()] ?? null);

  private readonly api = inject(ModelApiService);
  private readonly browser = inject(BrowserService);
  private readonly ui = inject(UiService);
  private readonly destroyRef = inject(DestroyRef);
  private confirmationId: number | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.confirmationId !== null && this.ui.confirm()?.id === this.confirmationId) {
        this.ui.resolveConfirm(false);
      }
    });
  }

  select(mode: LukePackageMode): void {
    if (!this.busy()) this.mode.set(mode);
  }

  refresh(): void {
    if (this.busy()) return;
    this.phase.set('preview');
    this.error.set('');
    this.api
      .lukePackage()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preview) => {
          this.preview.set(preview);
          this.phase.set('idle');
        },
        error: (error: Error) => {
          this.preview.set(null);
          this.fail(error.message || 'The package could not be read. Refresh to try again.');
        },
      });
  }

  download(): void {
    const selected = this.selected();
    if (!selected || this.busy()) return;
    this.start('download');
    this.api
      .downloadLukePackage(this.mode())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.browser.downloadBlob(blob, selected.filename);
          this.phase.set('idle');
          this.ui.success(`${selected.filename} is downloading.`);
        },
        error: (error: Error) => this.fail(error.message || 'The package could not be built.'),
      });
  }

  inspect(file: File): void {
    if (this.busy()) return;
    this.start('check');
    if (!file.name.toLowerCase().endsWith('.zip') || !file.size) {
      this.fail('Choose a non-empty ZIP package, then try again.');
      return;
    }
    this.api
      .importLukePackage(file, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          if (!isPackageCheck(report)) {
            this.fail('The dry-run report is incomplete. Choose the ZIP again to recheck it.');
            return;
          }
          this.confirm(file, report);
        },
        error: (error: Error) => this.fail(error.message || 'The ZIP could not be checked.'),
      });
  }

  private confirm(file: File, report: LukePackageCheck): void {
    this.phase.set('confirm');
    this.ui
      .confirmDialog({
        title: report.replace_required ? 'Replace this workspace?' : 'Restore this package?',
        message: packageConfirmation(file.name, report),
        confirmLabel: report.replace_required ? 'Replace and restore' : 'Restore package',
        cancelLabel: 'Cancel',
        danger: report.replace_required,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        this.confirmationId = null;
        if (confirmed) {
          this.apply(file, report);
        } else {
          this.phase.set('idle');
          this.outcome.set('Restore cancelled. No changes were made.');
        }
      });
    this.confirmationId = this.ui.confirm()?.id ?? null;
  }

  private apply(file: File, checked: LukePackageCheck): void {
    this.phase.set('restore');
    this.api
      .importLukePackage(file, false, checked.replace_required)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          if (!isPackageApplied(report)) {
            this.fail(
              'The restore result is incomplete. Refresh and recheck the ZIP before retrying.',
            );
            return;
          }
          this.phase.set('idle');
          this.outcome.set(
            `${checked.model.name} was restored. Reload other open views to read the restored state.`,
          );
          this.ui.success(this.outcome());
          this.refresh();
        },
        error: (error: Error) =>
          this.fail(error.message || 'Restore failed. Recheck the ZIP to retry.'),
      });
  }

  private start(phase: PackagePhase): void {
    this.error.set('');
    this.outcome.set('');
    this.phase.set(phase);
  }

  private fail(message: string): void {
    this.phase.set('idle');
    this.outcome.set('');
    this.error.set(message);
    this.ui.error(message);
  }
}
