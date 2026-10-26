import { TestBed } from '@angular/core/testing';
import { ChatWordHeatmap } from './chat-word-heatmap';

function render(tokens: string[], attention: number[][] | null): HTMLElement {
  const fixture = TestBed.createComponent(ChatWordHeatmap);
  fixture.componentRef.setInput('tokens', tokens);
  fixture.componentRef.setInput('attention', attention);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ChatWordHeatmap', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ChatWordHeatmap] }).compileComponents();
  });

  it('draws one measured cell for every word a word looked at', () => {
    const compiled = render(
      ['the', 'sky'],
      [
        [1, 0.5],
        [0, 0.25],
      ],
    );

    expect(compiled.querySelectorAll('.heat-head').length).toBe(2);
    expect(compiled.querySelectorAll('.heat-row-label').length).toBe(2);
    const cells = compiled.querySelectorAll('.heat-cell');
    expect(cells.length).toBe(4);
    expect(cells[1].getAttribute('title')).toBe('the saw sky: 0.500');
    expect(compiled.querySelector('.heat-grid')?.getAttribute('aria-label')).toContain(
      'Measured attention over 2 tokens',
    );
  });

  it('scales the colour to the strongest cell of this prefix', () => {
    const compiled = render(
      ['a', 'b'],
      [
        [1, 0.5],
        [0, 0.25],
      ],
    );

    const fills = [...compiled.querySelectorAll<HTMLElement>('.heat-fill')].map((node) =>
      Number(node.style.opacity),
    );
    expect(fills[0]).toBe(1);
    expect(fills[1]).toBeCloseTo(0.525);
    expect(fills[2]).toBeCloseTo(0.05);
    expect(fills[3]).toBeCloseTo(0.2875);
  });

  it('says when the model reported no attention', () => {
    const compiled = render(['the'], null);

    expect(compiled.querySelector('.heat-grid')).toBeNull();
    expect(compiled.querySelector('.heat-empty')?.textContent).toContain(
      'did not report attention',
    );
  });
});
