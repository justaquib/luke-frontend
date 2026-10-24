import { TestBed } from '@angular/core/testing';

import { AttentionHeatmap } from './attention-heatmap';

const HEAD_ONE = [
  [1, 0, 0],
  [0.5, 0.5, 0],
  [0, 0, 1],
];
const HEAD_TWO = [
  [0, 0, 1],
  [0.5, 0.5, 0],
  [0, 0, 1],
];

describe('AttentionHeatmap', () => {
  it('draws the real matrix and follows the layer and head controls', () => {
    const fixture = TestBed.createComponent(AttentionHeatmap);
    fixture.componentRef.setInput('tokens', ['a', 'b', 'c']);
    fixture.componentRef.setInput('layers', [
      [HEAD_ONE, HEAD_TWO],
      [HEAD_TWO, HEAD_ONE],
    ]);
    fixture.componentRef.setInput('heads', 2);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const selects = compiled.querySelectorAll<HTMLSelectElement>('select');
    expect(selects.length).toBe(2);
    expect(selects[0].value).toBe('1');
    expect(selects[1].value).toBe('-1');

    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
    expect(rows[0].querySelectorAll('td').length).toBe(3);
    const headers = [...compiled.querySelectorAll('thead th')].map((header) =>
      header.textContent?.trim(),
    );
    expect(headers).toEqual(['a', 'b', 'c']);
    const firstCell = rows[0].querySelector('td');
    expect(firstCell?.getAttribute('aria-label')).toBe('a looks at a: weight 0.500');

    selects[1].value = '0';
    selects[1].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(firstCell?.getAttribute('aria-label')).toBe('a looks at a: weight 0.000');

    selects[0].value = '0';
    selects[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(firstCell?.getAttribute('aria-label')).toBe('a looks at a: weight 1.000');
    expect(firstCell?.getAttribute('style')).toContain('100%');
  });

  it('says when there are no weights to draw', () => {
    const fixture = TestBed.createComponent(AttentionHeatmap);
    fixture.componentRef.setInput('tokens', []);
    fixture.componentRef.setInput('layers', []);
    fixture.componentRef.setInput('heads', 0);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No attention weights were returned');
  });
});
