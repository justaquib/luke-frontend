import { TestBed } from '@angular/core/testing';
import { PaletteService, withAlpha } from './palette.service';

const STORAGE_KEY = 'assistance.palettes.v1';

describe('PaletteService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('offers the four built-in palettes', () => {
    const palettes = TestBed.inject(PaletteService);

    expect(palettes.palettes().map((palette) => palette.id)).toEqual([
      'frost',
      'mint',
      'bee',
      'princess',
    ]);
    expect(palettes.customPalettes()).toEqual([]);
  });

  it('adds, edits and removes a custom palette in storage', () => {
    const palettes = TestBed.inject(PaletteService);
    const created = palettes.add({
      name: ' Night ',
      darkAccent: '#112233',
      lightAccent: '#445566',
    });
    if (!created) throw new Error('The palette was not created');

    expect(created.name).toBe('Night');
    expect(created.builtIn).toBe(false);
    expect(palettes.palettes().length).toBe(5);

    expect(
      palettes.update(created.id, {
        name: 'Dusk',
        darkAccent: '#0A0B0C',
        lightAccent: '#445566',
      }),
    ).toBe(true);
    expect(palettes.find(created.id)?.name).toBe('Dusk');

    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    expect(stored).toEqual([
      { id: created.id, name: 'Dusk', darkAccent: '#0a0b0c', lightAccent: '#445566' },
    ]);

    expect(palettes.remove(created.id)).toBe(true);
    expect(palettes.customPalettes()).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });

  it('rejects a draft without a name or two six-digit colours', () => {
    const palettes = TestBed.inject(PaletteService);

    expect(palettes.add({ name: ' ', darkAccent: '#112233', lightAccent: '#445566' })).toBeNull();
    expect(palettes.add({ name: 'Night', darkAccent: 'blue', lightAccent: '#445566' })).toBeNull();
    expect(
      palettes.add({ name: 'Night', darkAccent: '#112233', lightAccent: '#44556' }),
    ).toBeNull();
  });

  it('never edits or removes a built-in palette', () => {
    const palettes = TestBed.inject(PaletteService);

    expect(
      palettes.update('frost', { name: 'Ice', darkAccent: '#112233', lightAccent: '#445566' }),
    ).toBe(false);
    expect(palettes.remove('frost')).toBe(false);
    expect(palettes.find('frost')?.name).toBe('Frost');
  });

  it('ignores malformed entries saved by an earlier visit', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'bad', name: '', darkAccent: '#112233', lightAccent: '#445566' },
        { id: 'short', name: 'Short', darkAccent: '#123', lightAccent: '#445566' },
        { id: 'ok', name: 'Okay', darkAccent: '#112233', lightAccent: '#445566' },
        'not a palette',
      ]),
    );

    const palettes = TestBed.inject(PaletteService);

    expect(palettes.customPalettes().map((palette) => palette.name)).toEqual(['Okay']);
  });

  it('derives a drawable tint from an accent', () => {
    expect(withAlpha('#6ea8fe', 0.14)).toBe('rgba(110, 168, 254, 0.14)');
  });
});
