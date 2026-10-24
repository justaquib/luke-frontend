import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { BrowserService } from './browser.service';

export type SidebarSide = 'left' | 'right';
export type SidebarMode = 'push' | 'overlay' | 'full';
export type NumericDesignSetting =
  'cardMinWidth' | 'cardMaxWidth' | 'cardRadius' | 'modalWidth' | 'sidebarWidth' | 'overlayOpacity';

export interface DesignSettings {
  cardMinWidth: number;
  cardMaxWidth: number;
  cardRadius: number;
  modalWidth: number;
  sidebarWidth: number;
  sidebarSide: SidebarSide;
  sidebarMode: SidebarMode;
  overlayOpacity: number;
}

export const DESIGN_DEFAULTS: DesignSettings = {
  cardMinWidth: 240,
  cardMaxWidth: 0,
  cardRadius: 8,
  modalWidth: 512,
  sidebarWidth: 240,
  sidebarSide: 'left',
  sidebarMode: 'push',
  overlayOpacity: 72,
};

const STORAGE_KEY = 'assistance.design.v1';

const RANGES: Record<NumericDesignSetting, { min: number; max: number }> = {
  cardMinWidth: { min: 160, max: 360 },
  cardMaxWidth: { min: 0, max: 960 },
  cardRadius: { min: 0, max: 24 },
  modalWidth: { min: 360, max: 960 },
  sidebarWidth: { min: 200, max: 400 },
  overlayOpacity: { min: 20, max: 95 },
};

function isSide(value: unknown): value is SidebarSide {
  return value === 'left' || value === 'right';
}

function isMode(value: unknown): value is SidebarMode {
  return value === 'push' || value === 'overlay' || value === 'full';
}

function numberIn(value: unknown, key: NumericDesignSetting): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DESIGN_DEFAULTS[key];
  const range = RANGES[key];
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

/**
 * The shape of the product, not its colours: the frame of the sidebar, the
 * size of the cards and the dialog, and how strongly an overlay dims the page.
 * The values become root custom properties so every component reads them.
 */
@Injectable({ providedIn: 'root' })
export class DesignService {
  private readonly browser = inject(BrowserService);
  private readonly document = inject(DOCUMENT);
  private readonly state = signal<DesignSettings>(this.read());
  private readonly viewport = signal(false);
  private readonly open = signal(true);

  readonly settings = this.state.asReadonly();
  readonly sidebarOpen = this.open.asReadonly();
  readonly sidebarMode = computed(() => this.state().sidebarMode);
  readonly sidebarSide = computed(() => this.state().sidebarSide);
  readonly sidebarFloats = computed(() => this.viewport() || this.sidebarMode() !== 'push');

  constructor() {
    this.apply(this.state());
    this.watchViewport();
  }

  setNumber(key: NumericDesignSetting, value: number): void {
    const patch: Partial<Record<NumericDesignSetting, number>> = {};
    patch[key] = numberIn(value, key);
    this.update(patch);
  }

  setSidebarSide(sidebarSide: SidebarSide): void {
    this.update({ sidebarSide });
  }

  setSidebarMode(sidebarMode: SidebarMode): void {
    this.update({ sidebarMode });
    if (sidebarMode !== 'push') this.open.set(true);
  }

  toggleSidebar(): void {
    this.open.update((value) => !value);
  }

  closeSidebar(): void {
    this.open.set(false);
  }

  /** A link chosen on a floating sidebar closes it so the page is visible. */
  handleNavigation(): void {
    if (this.sidebarFloats()) this.closeSidebar();
  }

  reset(): void {
    this.state.set(DESIGN_DEFAULTS);
    this.apply(DESIGN_DEFAULTS);
    this.browser.writeLocal(STORAGE_KEY, JSON.stringify(DESIGN_DEFAULTS));
    this.open.set(true);
  }

  private update(patch: Partial<DesignSettings>): void {
    this.state.update((current) => ({ ...current, ...patch }));
    this.apply(this.state());
    this.browser.writeLocal(STORAGE_KEY, JSON.stringify(this.state()));
  }

  private apply(settings: DesignSettings): void {
    const root = this.document.documentElement;
    root.style.setProperty('--sidebar-width', `${settings.sidebarWidth}px`);
    root.style.setProperty('--card-min', `${settings.cardMinWidth}px`);
    root.style.setProperty(
      '--card-max',
      settings.cardMaxWidth > 0 ? `${settings.cardMaxWidth}px` : 'none',
    );
    root.style.setProperty('--card-radius', `${settings.cardRadius}px`);
    root.style.setProperty('--modal-width', `${settings.modalWidth}px`);
    root.style.setProperty('--overlay-alpha', String(settings.overlayOpacity / 100));
    root.setAttribute('data-sidebar-side', settings.sidebarSide);
    root.setAttribute('data-sidebar-mode', settings.sidebarMode);
  }

  private watchViewport(): void {
    if (!this.browser.isBrowser() || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(max-width: 680px)');
    const follow = (matches: boolean): void => {
      this.viewport.set(matches);
      // A floating navigation starts folded so the page is readable first.
      if (matches) this.open.set(false);
    };
    follow(query.matches);
    query.addEventListener('change', (event) => follow(event.matches));
  }

  private read(): DesignSettings {
    const raw = this.browser.readLocal(STORAGE_KEY);
    if (!raw) return DESIGN_DEFAULTS;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return DESIGN_DEFAULTS;
      const saved = parsed as Partial<Record<keyof DesignSettings, unknown>>;
      return {
        cardMinWidth: numberIn(saved.cardMinWidth, 'cardMinWidth'),
        cardMaxWidth: numberIn(saved.cardMaxWidth, 'cardMaxWidth'),
        cardRadius: numberIn(saved.cardRadius, 'cardRadius'),
        modalWidth: numberIn(saved.modalWidth, 'modalWidth'),
        sidebarWidth: numberIn(saved.sidebarWidth, 'sidebarWidth'),
        sidebarSide: isSide(saved.sidebarSide) ? saved.sidebarSide : DESIGN_DEFAULTS.sidebarSide,
        sidebarMode: isMode(saved.sidebarMode) ? saved.sidebarMode : DESIGN_DEFAULTS.sidebarMode,
        overlayOpacity: numberIn(saved.overlayOpacity, 'overlayOpacity'),
      };
    } catch {
      return DESIGN_DEFAULTS;
    }
  }
}
