import { TestBed } from '@angular/core/testing';
import { BrainLadder } from './brain-ladder';

describe('BrainLadder', () => {
  it('folds the ladder away and brings it back on the same button', () => {
    const fixture = TestBed.createComponent(BrainLadder);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const toggle = (): HTMLButtonElement | null =>
      compiled.querySelector<HTMLButtonElement>('button[aria-expanded]');

    expect(toggle()?.getAttribute('aria-expanded')).toBe('true');
    expect(toggle()?.getAttribute('aria-label')).toBe('Collapse the ladder');
    expect(compiled.textContent).toContain('The ladder has not been read yet.');

    toggle()?.click();
    fixture.detectChanges();

    expect(toggle()?.getAttribute('aria-expanded')).toBe('false');
    expect(toggle()?.getAttribute('aria-label')).toBe('Expand the ladder');
    expect(toggle()?.getAttribute('title')).toBe('Expand the ladder');
    expect(compiled.querySelector('.empty')).toBeNull();

    toggle()?.click();
    fixture.detectChanges();

    expect(toggle()?.getAttribute('aria-expanded')).toBe('true');
    expect(compiled.textContent).toContain('The ladder has not been read yet.');
  });
});
