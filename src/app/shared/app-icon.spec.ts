import { TestBed } from '@angular/core/testing';
import { AppIcon, ICON_NAMES } from './app-icon';

describe('AppIcon', () => {
  it('draws a shape for every icon in the shared set', () => {
    const fixture = TestBed.createComponent(AppIcon);
    fixture.componentRef.setInput('name', 'info');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    for (const name of ICON_NAMES) {
      fixture.componentRef.setInput('name', name);
      fixture.detectChanges();
      const shapes = compiled.querySelectorAll('svg > *').length;
      expect(shapes, name).toBeGreaterThan(0);
    }
  });

  it('sizes the icon from the caller', () => {
    const fixture = TestBed.createComponent(AppIcon);
    fixture.componentRef.setInput('name', 'menu');
    fixture.componentRef.setInput('size', 20);
    fixture.detectChanges();

    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('20');
    expect(svg?.getAttribute('height')).toBe('20');
  });
});
