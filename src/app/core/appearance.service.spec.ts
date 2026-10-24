import { TestBed } from '@angular/core/testing';
import { AppearanceService } from './appearance.service';
import { PaletteService } from './palette.service';

const STORAGE_KEY = 'assistance.appearance.v1';

function clearDocumentAttributes(): void {
  const root = document.documentElement;
  root.removeAttribute('data-color-mode');
  root.removeAttribute('data-theme');
  root.removeAttribute('data-text-size');
  root.removeAttribute('data-font');
  for (const property of [
    '--dark-accent',
    '--dark-accent-soft',
    '--dark-accent-line',
    '--light-accent',
    '--light-accent-soft',
    '--light-accent-line',
  ]) {
    root.style.removeProperty(property);
  }
}

describe('AppearanceService', () => {
  beforeEach(() => {
    localStorage.clear();
    clearDocumentAttributes();
  });

  afterEach(() => {
    localStorage.clear();
    clearDocumentAttributes();
  });

  it('applies the default look when nothing is saved', () => {
    TestBed.inject(AppearanceService);

    const root = document.documentElement;
    expect(root.getAttribute('data-color-mode')).toBe('system');
    expect(root.getAttribute('data-theme')).toBe('frost');
    expect(root.getAttribute('data-text-size')).toBe('medium');
    expect(root.getAttribute('data-font')).toBe('sans');
    expect(root.style.getPropertyValue('--dark-accent')).toBe('#6ea8fe');
    expect(root.style.getPropertyValue('--light-accent')).toBe('#2f6fdb');
    expect(root.style.getPropertyValue('--dark-accent-soft')).toBe('rgba(110, 168, 254, 0.14)');
  });

  it('applies and saves a chosen look', () => {
    const appearance = TestBed.inject(AppearanceService);

    appearance.setColorMode('light');
    appearance.setPalette('bee');
    appearance.setTextSize('large');
    appearance.setFont('serif');

    const root = document.documentElement;
    expect(root.getAttribute('data-color-mode')).toBe('light');
    expect(root.getAttribute('data-theme')).toBe('bee');
    expect(root.getAttribute('data-text-size')).toBe('large');
    expect(root.getAttribute('data-font')).toBe('serif');

    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(saved).toEqual({
      colorMode: 'light',
      palette: 'bee',
      textSize: 'large',
      font: 'serif',
    });
  });

  it('draws a custom palette from its two accents and follows an edit', () => {
    const palettes = TestBed.inject(PaletteService);
    const created = palettes.add({
      name: 'Night',
      darkAccent: '#334455',
      lightAccent: '#556677',
    });
    if (!created) throw new Error('The palette was not created');

    const appearance = TestBed.inject(AppearanceService);
    appearance.setPalette(created.id);

    const root = document.documentElement;
    expect(root.getAttribute('data-theme')).toBe(created.id);
    expect(root.style.getPropertyValue('--dark-accent')).toBe('#334455');
    expect(root.style.getPropertyValue('--light-accent')).toBe('#556677');
    expect(root.style.getPropertyValue('--light-accent-soft')).toBe('rgba(85, 102, 119, 0.1)');

    palettes.update(created.id, {
      name: 'Night',
      darkAccent: '#0a0b0c',
      lightAccent: '#556677',
    });
    appearance.reapply();

    expect(root.style.getPropertyValue('--dark-accent')).toBe('#0a0b0c');
  });

  it('restores the look saved by an earlier visit', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        colorMode: 'dark',
        palette: 'princess',
        textSize: 'large',
        font: 'mono',
      }),
    );

    const appearance = TestBed.inject(AppearanceService);

    expect(appearance.colorMode()).toBe('dark');
    expect(appearance.palette()).toBe('princess');
    expect(appearance.textSize()).toBe('large');
    expect(appearance.font()).toBe('mono');
    expect(document.documentElement.getAttribute('data-theme')).toBe('princess');
    expect(document.documentElement.getAttribute('data-font')).toBe('mono');
  });

  it('falls back field by field when a saved value is unknown', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ colorMode: 'sepia', palette: 'neon', textSize: 'huge', font: 'comic' }),
    );

    const appearance = TestBed.inject(AppearanceService);

    expect(appearance.colorMode()).toBe('system');
    expect(appearance.palette()).toBe('frost');
    expect(appearance.textSize()).toBe('medium');
    expect(appearance.font()).toBe('sans');
    expect(document.documentElement.getAttribute('data-theme')).toBe('frost');
  });

  it('falls back when the saved data cannot be read', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');

    const appearance = TestBed.inject(AppearanceService);

    expect(appearance.colorMode()).toBe('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('frost');
    expect(document.documentElement.getAttribute('data-font')).toBe('sans');
  });
});
