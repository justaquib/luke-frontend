import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { BrowserService } from './browser.service';
import { BUILT_IN_PALETTES, PaletteService, withAlpha } from './palette.service';

export type ColorMode = 'system' | 'light' | 'dark';
export type TextSize = 'medium' | 'large';
export type FontChoice = 'sans' | 'serif' | 'mono';

export interface Appearance {
  colorMode: ColorMode;
  /** The id of a built-in or custom palette. */
  palette: string;
  textSize: TextSize;
  font: FontChoice;
}

const STORAGE_KEY = 'assistance.appearance.v1';

const DEFAULTS: Appearance = {
  colorMode: 'system',
  palette: 'frost',
  textSize: 'medium',
  font: 'sans',
};

function isColorMode(value: unknown): value is ColorMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

function isTextSize(value: unknown): value is TextSize {
  return value === 'medium' || value === 'large';
}

function isFontChoice(value: unknown): value is FontChoice {
  return value === 'sans' || value === 'serif' || value === 'mono';
}

/**
 * The look the person picked: the colour mode, the accent palette, the text
 * size and the typeface. The choice is saved in this browser and applied to
 * the document root, where the tokens in styles.css read it.
 */
@Injectable({ providedIn: 'root' })
export class AppearanceService {
  private readonly browser = inject(BrowserService);
  private readonly document = inject(DOCUMENT);
  private readonly palettes = inject(PaletteService);
  private readonly state = signal<Appearance>(this.read());

  readonly colorMode = computed(() => this.state().colorMode);
  readonly palette = computed(() => this.state().palette);
  readonly textSize = computed(() => this.state().textSize);
  readonly font = computed(() => this.state().font);

  constructor() {
    this.apply(this.state());
  }

  setColorMode(colorMode: ColorMode): void {
    this.update({ colorMode });
  }

  setPalette(palette: string): void {
    this.update({ palette });
  }

  setTextSize(textSize: TextSize): void {
    this.update({ textSize });
  }

  setFont(font: FontChoice): void {
    this.update({ font });
  }

  /** Called after a palette is edited, so the active choice redraws. */
  reapply(): void {
    this.apply(this.state());
  }

  private update(patch: Partial<Appearance>): void {
    this.state.update((current) => ({ ...current, ...patch }));
    this.apply(this.state());
    this.browser.writeLocal(STORAGE_KEY, JSON.stringify(this.state()));
  }

  private apply(appearance: Appearance): void {
    const root = this.document.documentElement;
    const palette =
      this.palettes.find(appearance.palette) ?? this.palettes.find('frost') ?? BUILT_IN_PALETTES[0];

    root.setAttribute('data-color-mode', appearance.colorMode);
    root.setAttribute('data-theme', palette.id);
    root.setAttribute('data-text-size', appearance.textSize);
    root.setAttribute('data-font', appearance.font);
    root.style.setProperty('--dark-accent', palette.darkAccent);
    root.style.setProperty('--dark-accent-soft', withAlpha(palette.darkAccent, 0.14));
    root.style.setProperty('--dark-accent-line', withAlpha(palette.darkAccent, 0.42));
    root.style.setProperty('--light-accent', palette.lightAccent);
    root.style.setProperty('--light-accent-soft', withAlpha(palette.lightAccent, 0.1));
    root.style.setProperty('--light-accent-line', withAlpha(palette.lightAccent, 0.38));
  }

  private read(): Appearance {
    const raw = this.browser.readLocal(STORAGE_KEY);
    if (!raw) return DEFAULTS;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return DEFAULTS;
      const saved = parsed as Partial<Record<keyof Appearance, unknown>>;
      return {
        colorMode: isColorMode(saved.colorMode) ? saved.colorMode : DEFAULTS.colorMode,
        palette:
          typeof saved.palette === 'string' && this.palettes.find(saved.palette)
            ? saved.palette
            : DEFAULTS.palette,
        textSize: isTextSize(saved.textSize) ? saved.textSize : DEFAULTS.textSize,
        font: isFontChoice(saved.font) ? saved.font : DEFAULTS.font,
      };
    } catch {
      return DEFAULTS;
    }
  }
}
