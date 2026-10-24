import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AppearanceService } from '../core/appearance.service';
import { DesignService } from '../core/design.service';
import { PaletteService, type PaletteDraft } from '../core/palette.service';
import { ICON_NAMES } from '../shared/app-icon';
import { UiService } from '../shared/ui.service';
import { Design } from './design';

const NIGHT: PaletteDraft = {
  name: 'Night',
  darkAccent: '#112233',
  lightAccent: '#445566',
};

describe('Design', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Design],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    const root = document.documentElement;
    for (const attribute of [
      'data-color-mode',
      'data-theme',
      'data-text-size',
      'data-font',
      'data-sidebar-side',
      'data-sidebar-mode',
    ]) {
      root.removeAttribute(attribute);
    }
    for (const property of [
      '--dark-accent',
      '--dark-accent-soft',
      '--dark-accent-line',
      '--light-accent',
      '--light-accent-soft',
      '--light-accent-line',
      '--sidebar-width',
      '--card-min',
      '--card-max',
      '--card-radius',
      '--modal-width',
      '--overlay-alpha',
    ]) {
      root.style.removeProperty(property);
    }
  });

  it('lists the palettes, the measurements and the whole icon set', async () => {
    const fixture = TestBed.createComponent(Design);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-shell')).toBeTruthy();
    expect(compiled.querySelectorAll('.palette-row').length).toBe(4);
    expect(compiled.querySelectorAll('.range-row').length).toBe(6);
    expect(compiled.querySelectorAll('.icon-cell').length).toBe(ICON_NAMES.length);
    expect(compiled.querySelectorAll('.icon-cell svg').length).toBe(ICON_NAMES.length);
    expect(compiled.querySelector('app-engine-facts')?.textContent).toContain('Frost');
  });

  it('adds a custom palette and applies it', async () => {
    const fixture = TestBed.createComponent(Design);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const palettes = TestBed.inject(PaletteService);
    const appearance = TestBed.inject(AppearanceService);
    const ui = TestBed.inject(UiService);

    const set = (selector: string, value: string): void => {
      const input = compiled.querySelector<HTMLInputElement>(selector);
      if (!input) throw new Error(`Missing control: ${selector}`);
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };

    set('input[name="palette-name"]', 'Evening');
    set('input[name="dark-accent"]', '#334455');
    set('input[name="light-accent"]', '#556677');
    fixture.detectChanges();

    compiled.querySelector('form.palette-form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const created = palettes.customPalettes()[0];
    expect(created.name).toBe('Evening');
    expect(created.darkAccent).toBe('#334455');
    expect(appearance.palette()).toBe(created.id);
    expect(document.documentElement.getAttribute('data-theme')).toBe(created.id);
    expect(ui.toasts().at(-1)?.message).toBe('Added Evening and applied it.');
  });

  it('edits a custom palette in place', async () => {
    const fixture = TestBed.createComponent(Design);
    const palettes = TestBed.inject(PaletteService);
    const appearance = TestBed.inject(AppearanceService);
    const created = palettes.add(NIGHT);
    if (!created) throw new Error('The palette was not created');
    appearance.setPalette(created.id);

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('button[aria-label="Edit Night"]')?.click();
    fixture.detectChanges();

    const name = compiled.querySelector<HTMLInputElement>('input[name="palette-name"]');
    if (!name) throw new Error('Missing palette name');
    name.value = 'Dusk';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    compiled.querySelector('form.palette-form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(palettes.find(created.id)?.name).toBe('Dusk');
    expect(palettes.customPalettes().length).toBe(1);
    expect(appearance.palette()).toBe(created.id);
  });

  it('removes a custom palette after confirmation and falls back to Frost', async () => {
    const fixture = TestBed.createComponent(Design);
    const palettes = TestBed.inject(PaletteService);
    const appearance = TestBed.inject(AppearanceService);
    const ui = TestBed.inject(UiService);
    const created = palettes.add(NIGHT);
    if (!created) throw new Error('The palette was not created');
    appearance.setPalette(created.id);

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('button[aria-label="Remove Night"]')?.click();
    fixture.detectChanges();
    expect(ui.confirm()?.title).toBe('Remove Night?');

    ui.resolveConfirm(true);
    fixture.detectChanges();

    expect(palettes.customPalettes()).toEqual([]);
    expect(appearance.palette()).toBe('frost');
    expect(document.documentElement.getAttribute('data-theme')).toBe('frost');
    expect(ui.toasts().at(-1)?.message).toBe('Removed Night.');
  });

  it('writes the frame choices to the root and previews the window', async () => {
    const fixture = TestBed.createComponent(Design);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const design = TestBed.inject(DesignService);
    const root = document.documentElement;
    const cardMin = compiled.querySelector<HTMLInputElement>('.range-row input[type="range"]');
    if (!cardMin) throw new Error('Missing card minimum');

    cardMin.value = '320';
    cardMin.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(design.settings().cardMinWidth).toBe(320);
    expect(root.style.getPropertyValue('--card-min')).toBe('320px');

    compiled.querySelector<HTMLButtonElement>('button[title="Float over the page"]')?.click();
    fixture.detectChanges();
    expect(design.sidebarMode()).toBe('overlay');
    expect(root.getAttribute('data-sidebar-mode')).toBe('overlay');

    compiled.querySelector<HTMLButtonElement>('button[title="Open on the right"]')?.click();
    fixture.detectChanges();
    expect(design.sidebarSide()).toBe('right');
    expect(root.getAttribute('data-sidebar-side')).toBe('right');

    compiled.querySelector<HTMLButtonElement>('.preview-button')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('[role="dialog"] h2')?.textContent?.trim()).toBe(
      'Window preview',
    );
  });
});
