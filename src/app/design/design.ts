import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AppearanceService } from '../core/appearance.service';
import {
  DesignService,
  type NumericDesignSetting,
  type SidebarMode,
  type SidebarSide,
} from '../core/design.service';
import { PaletteService, type PaletteDefinition, type PaletteDraft } from '../core/palette.service';
import { AppCardInfo } from '../shared/app-card-info';
import { AppEngineFacts, type EngineFact } from '../shared/app-engine-facts';
import { AppIcon, ICON_NAMES, type IconName } from '../shared/app-icon';
import { AppModal } from '../shared/app-modal';
import { PageInfoActions } from '../shared/page-info-actions';
import { AppShell } from '../shared/app-shell';
import { UiService } from '../shared/ui.service';

interface ModeChoice {
  value: SidebarMode;
  label: string;
  icon: IconName;
}

interface SideChoice {
  value: SidebarSide;
  label: string;
  icon: IconName;
}

interface RangeChoice {
  key: NumericDesignSetting;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
  zeroLabel?: string;
}

type DraftField = 'name' | 'darkAccent' | 'lightAccent';

const RANGES: readonly RangeChoice[] = [
  { key: 'cardMinWidth', label: 'Card minimum', min: 160, max: 360, step: 8, suffix: 'px' },
  {
    key: 'cardMaxWidth',
    label: 'Card maximum',
    min: 0,
    max: 960,
    step: 8,
    suffix: 'px',
    zeroLabel: 'none',
  },
  { key: 'cardRadius', label: 'Card corners', min: 0, max: 24, step: 1, suffix: 'px' },
  { key: 'modalWidth', label: 'Window width', min: 360, max: 960, step: 8, suffix: 'px' },
  { key: 'sidebarWidth', label: 'Sidebar width', min: 200, max: 400, step: 4, suffix: 'px' },
  { key: 'overlayOpacity', label: 'Overlay strength', min: 20, max: 95, step: 1, suffix: '%' },
];

/**
 * The Design page owns what every other page inherits: the accent palettes,
 * the size and corners of a card, the dialog and the sidebar, the strength of
 * an overlay, and the icon set a control may draw from. A change is written
 * once, in the root, and every surface follows.
 */
@Component({
  selector: 'app-design',
  standalone: true,
  imports: [AppShell, PageInfoActions, AppCardInfo, AppEngineFacts, AppIcon, AppModal],
  templateUrl: './design.html',
  styleUrls: ['./design.css', './design-frame.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Design {
  protected readonly appearance = inject(AppearanceService);
  protected readonly design = inject(DesignService);
  protected readonly paletteService = inject(PaletteService);
  private readonly ui = inject(UiService);

  protected readonly icons = ICON_NAMES;
  protected readonly ranges = RANGES;
  protected readonly previewOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly draft = signal<PaletteDraft>(this.newDraft());

  protected readonly modes: readonly ModeChoice[] = [
    { value: 'push', label: 'Dock beside the page', icon: 'sidebar' },
    { value: 'overlay', label: 'Float over the page', icon: 'layers' },
    { value: 'full', label: 'Take the full width', icon: 'maximize' },
  ];

  protected readonly sides: readonly SideChoice[] = [
    { value: 'left', label: 'Open on the left', icon: 'sidebar-left' },
    { value: 'right', label: 'Open on the right', icon: 'sidebar' },
  ];

  protected readonly facts = computed<readonly EngineFact[]>(() => {
    const settings = this.design.settings();
    const active = this.paletteService.find(this.appearance.palette());
    return [
      {
        label: 'Palette',
        value: active?.name ?? '—',
        note: active?.builtIn ? 'built in' : 'custom',
      },
      {
        label: 'Cards',
        value: `${settings.cardMinWidth}px min`,
        note: `${settings.cardMaxWidth ? `${settings.cardMaxWidth}px max` : 'no maximum'} · ${settings.cardRadius}px corners`,
      },
      {
        label: 'Window',
        value: `${settings.modalWidth}px`,
        note: `${settings.overlayOpacity}% overlay`,
      },
      {
        label: 'Sidebar',
        value: `${settings.sidebarWidth}px`,
        note: `${settings.sidebarMode} · ${settings.sidebarSide}`,
      },
    ];
  });

  protected readonly editingName = computed(() => {
    const id = this.editingId();
    return id ? (this.paletteService.find(id)?.name ?? 'palette') : null;
  });

  protected updateDraft(field: DraftField, value: string): void {
    this.draft.update((current) => ({ ...current, [field]: value }));
  }

  protected selectPalette(id: string): void {
    this.appearance.setPalette(id);
  }

  protected editPalette(palette: PaletteDefinition): void {
    this.editingId.set(palette.id);
    this.draft.set({
      name: palette.name,
      darkAccent: palette.darkAccent,
      lightAccent: palette.lightAccent,
    });
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.draft.set(this.newDraft());
  }

  protected savePalette(): void {
    const draft = this.draft();
    const editing = this.editingId();
    if (editing) {
      if (!this.paletteService.update(editing, draft)) {
        this.ui.error('Give the palette a name and two six-digit colours.');
        return;
      }
      if (this.appearance.palette() === editing) this.appearance.reapply();
      this.ui.success(`Updated ${draft.name.trim()}.`);
    } else {
      const created = this.paletteService.add(draft);
      if (!created) {
        this.ui.error('Give the palette a name and two six-digit colours.');
        return;
      }
      this.appearance.setPalette(created.id);
      this.ui.success(`Added ${created.name} and applied it.`);
    }
    this.cancelEdit();
  }

  protected removePalette(palette: PaletteDefinition): void {
    this.ui
      .confirmDialog({
        title: `Remove ${palette.name}?`,
        message: 'Pages wearing this palette switch to Frost. This cannot be undone.',
        confirmLabel: 'Remove palette',
        danger: true,
      })
      .subscribe((ok) => {
        if (!ok || !this.paletteService.remove(palette.id)) return;
        if (this.appearance.palette() === palette.id) this.appearance.setPalette('frost');
        if (this.editingId() === palette.id) this.cancelEdit();
        this.ui.success(`Removed ${palette.name}.`);
      });
  }

  protected setting(key: NumericDesignSetting): number {
    return this.design.settings()[key];
  }

  protected rangeValue(range: RangeChoice): string {
    const value = this.setting(range.key);
    return value === 0 && range.zeroLabel ? range.zeroLabel : `${value}${range.suffix}`;
  }

  protected setNumber(key: NumericDesignSetting, value: string): void {
    this.design.setNumber(key, Number(value));
  }

  protected setMode(value: SidebarMode): void {
    this.design.setSidebarMode(value);
  }

  protected setSide(value: SidebarSide): void {
    this.design.setSidebarSide(value);
  }

  protected resetLayout(): void {
    this.ui
      .confirmDialog({
        title: 'Reset the layout?',
        message: 'Cards, the dialog, the sidebar and the overlay return to their defaults.',
        confirmLabel: 'Reset layout',
        danger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.design.reset();
        this.ui.success('Layout reset.');
      });
  }

  private newDraft(): PaletteDraft {
    const active = this.paletteService.find(this.appearance.palette());
    return {
      name: '',
      darkAccent: active?.darkAccent ?? '#6ea8fe',
      lightAccent: active?.lightAccent ?? '#2f6fdb',
    };
  }
}
