import { TestBed } from '@angular/core/testing';
import { DESIGN_DEFAULTS, DesignService } from './design.service';

const STORAGE_KEY = 'assistance.design.v1';

function clearRoot(): void {
  const root = document.documentElement;
  root.removeAttribute('data-sidebar-side');
  root.removeAttribute('data-sidebar-mode');
  for (const property of [
    '--sidebar-width',
    '--card-min',
    '--card-max',
    '--card-radius',
    '--modal-width',
    '--overlay-alpha',
  ]) {
    root.style.removeProperty(property);
  }
}

describe('DesignService', () => {
  beforeEach(() => {
    localStorage.clear();
    clearRoot();
  });

  afterEach(() => {
    localStorage.clear();
    clearRoot();
  });

  it('writes the default frame to the root', () => {
    TestBed.inject(DesignService);

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--sidebar-width')).toBe('240px');
    expect(root.style.getPropertyValue('--card-min')).toBe('240px');
    expect(root.style.getPropertyValue('--card-max')).toBe('none');
    expect(root.style.getPropertyValue('--card-radius')).toBe('8px');
    expect(root.style.getPropertyValue('--modal-width')).toBe('512px');
    expect(root.style.getPropertyValue('--overlay-alpha')).toBe('0.72');
    expect(root.getAttribute('data-sidebar-side')).toBe('left');
    expect(root.getAttribute('data-sidebar-mode')).toBe('push');
  });

  it('clamps a measurement to its range and saves it', () => {
    const design = TestBed.inject(DesignService);

    design.setNumber('cardRadius', -5);
    expect(design.settings().cardRadius).toBe(0);
    design.setNumber('cardMinWidth', 999);
    expect(design.settings().cardMinWidth).toBe(360);

    expect(document.documentElement.style.getPropertyValue('--card-min')).toBe('360px');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"cardMinWidth":360');
  });

  it('opens a floating sidebar and closes it after a navigation', () => {
    const design = TestBed.inject(DesignService);

    design.toggleSidebar();
    expect(design.sidebarOpen()).toBe(false);

    design.setSidebarMode('overlay');
    expect(design.sidebarOpen()).toBe(true);
    expect(design.sidebarFloats()).toBe(true);

    design.handleNavigation();
    expect(design.sidebarOpen()).toBe(false);

    design.setSidebarMode('push');
    design.toggleSidebar();
    design.handleNavigation();
    expect(design.sidebarOpen()).toBe(true);
  });

  it('restores a saved frame and resets it', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        cardMinWidth: 300,
        cardMaxWidth: 640,
        cardRadius: 16,
        modalWidth: 700,
        sidebarWidth: 320,
        sidebarSide: 'right',
        sidebarMode: 'overlay',
        overlayOpacity: 50,
      }),
    );

    const design = TestBed.inject(DesignService);
    expect(design.settings().sidebarWidth).toBe(320);
    expect(design.sidebarMode()).toBe('overlay');

    const root = document.documentElement;
    expect(root.getAttribute('data-sidebar-side')).toBe('right');
    expect(root.style.getPropertyValue('--card-max')).toBe('640px');

    design.reset();
    expect(design.settings()).toEqual(DESIGN_DEFAULTS);
    expect(root.style.getPropertyValue('--card-max')).toBe('none');
    expect(root.getAttribute('data-sidebar-side')).toBe('left');
  });
});
