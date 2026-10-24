import { Injectable, computed, inject, signal } from '@angular/core';
import { BrowserService } from './browser.service';

export interface PaletteDefinition {
  id: string;
  name: string;
  darkAccent: string;
  lightAccent: string;
  builtIn: boolean;
}

export interface PaletteDraft {
  name: string;
  darkAccent: string;
  lightAccent: string;
}

type StoredPalette = Omit<PaletteDefinition, 'builtIn'>;

const STORAGE_KEY = 'assistance.palettes.v1';
const HEX = /^#[0-9a-f]{6}$/i;

export const BUILT_IN_PALETTES: readonly PaletteDefinition[] = [
  { id: 'frost', name: 'Frost', darkAccent: '#6ea8fe', lightAccent: '#2f6fdb', builtIn: true },
  { id: 'mint', name: 'Mint', darkAccent: '#5bd6a2', lightAccent: '#157a55', builtIn: true },
  { id: 'bee', name: 'Bee', darkAccent: '#e5b454', lightAccent: '#8a5c08', builtIn: true },
  {
    id: 'princess',
    name: 'Princess',
    darkAccent: '#f08bb9',
    lightAccent: '#b23c72',
    builtIn: true,
  },
];

/** The accent pair of a palette as a colour the browser can draw. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isName(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 40;
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

function isValidDraft(draft: PaletteDraft): boolean {
  return isName(draft.name) && isHexColor(draft.darkAccent) && isHexColor(draft.lightAccent);
}

function isStoredPalette(value: unknown): value is StoredPalette {
  if (!value || typeof value !== 'object') return false;
  const stored = value as Partial<Record<keyof StoredPalette, unknown>>;
  return (
    isId(stored.id) &&
    isName(stored.name) &&
    isHexColor(stored.darkAccent) &&
    isHexColor(stored.lightAccent)
  );
}

/**
 * The colour palettes the workspace may wear: the four the product ships with
 * and the ones the person adds. A palette is two accent values; the soft and
 * line tints are derived from them, so no page carries its own colour.
 */
@Injectable({ providedIn: 'root' })
export class PaletteService {
  private readonly browser = inject(BrowserService);
  private readonly custom = signal<readonly PaletteDefinition[]>(this.read());

  readonly palettes = computed<readonly PaletteDefinition[]>(() => [
    ...BUILT_IN_PALETTES,
    ...this.custom(),
  ]);
  readonly customPalettes = this.custom.asReadonly();

  find(id: string): PaletteDefinition | undefined {
    return this.palettes().find((palette) => palette.id === id);
  }

  add(draft: PaletteDraft): PaletteDefinition | null {
    if (!isValidDraft(draft)) return null;
    const created: PaletteDefinition = {
      id: this.nextId(),
      name: draft.name.trim(),
      darkAccent: draft.darkAccent.toLowerCase(),
      lightAccent: draft.lightAccent.toLowerCase(),
      builtIn: false,
    };
    this.custom.update((list) => [...list, created]);
    this.persist();
    return created;
  }

  update(id: string, draft: PaletteDraft): boolean {
    if (!isValidDraft(draft)) return false;
    const existing = this.custom().find((palette) => palette.id === id);
    if (!existing) return false;
    this.custom.update((list) =>
      list.map((palette) =>
        palette.id === id
          ? {
              ...palette,
              name: draft.name.trim(),
              darkAccent: draft.darkAccent.toLowerCase(),
              lightAccent: draft.lightAccent.toLowerCase(),
            }
          : palette,
      ),
    );
    this.persist();
    return true;
  }

  remove(id: string): boolean {
    if (!this.custom().some((palette) => palette.id === id)) return false;
    this.custom.update((list) => list.filter((palette) => palette.id !== id));
    this.persist();
    return true;
  }

  private nextId(): string {
    return `custom-${Date.now().toString(36)}-${this.custom().length + 1}`;
  }

  private persist(): void {
    const stored: StoredPalette[] = this.custom().map((palette) => ({
      id: palette.id,
      name: palette.name,
      darkAccent: palette.darkAccent,
      lightAccent: palette.lightAccent,
    }));
    this.browser.writeLocal(STORAGE_KEY, JSON.stringify(stored));
  }

  private read(): readonly PaletteDefinition[] {
    const raw = this.browser.readLocal(STORAGE_KEY);
    if (!raw) return [];

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isStoredPalette).map(({ id, name, darkAccent, lightAccent }) => ({
        id,
        name: name.trim(),
        darkAccent,
        lightAccent,
        builtIn: false,
      }));
    } catch {
      return [];
    }
  }
}
