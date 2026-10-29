import { ChangeDetectionStrategy, Component, type OnInit, computed, inject } from '@angular/core';
import { AppCardInfo } from '../shared/app-card-info';
import { AppIcon } from '../shared/app-icon';
import { packageKinds, packageNotes } from './luke-package-presenter';
import { LukePackageStore } from './luke-package.store';

@Component({
  selector: 'app-luke-package',
  standalone: true,
  imports: [AppCardInfo, AppIcon],
  providers: [LukePackageStore],
  templateUrl: './luke-package.html',
  styleUrls: ['./styles/luke-package.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LukePackage implements OnInit {
  protected readonly store = inject(LukePackageStore);
  protected readonly modes = ['full', 'slim'] as const;
  protected readonly kinds = computed(() => packageKinds(this.store.preview()?.by_kind ?? {}));
  protected readonly notes = computed(() => packageNotes(this.store.preview()));
  protected readonly weights = computed(() => {
    if (this.store.selected()?.includes_base) return 'Includes foundation weights.';
    return 'Foundation weights are not included. The matching base revision and hash are required.';
  });

  ngOnInit(): void {
    this.store.refresh();
  }

  protected pick(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (file) this.store.inspect(file);
  }
}
