import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserService } from '../core/browser.service';
import { AnswerReveal } from './answer-reveal';

const ANSWER = 'Sunlight scatters blue light more strongly than red light in the sky above us.';
const CODED = 'Here is the function.\n```python\ndef add(a, b):\n    return a + b\n```\nIt adds.';

async function render(
  text: string,
  animate: boolean,
  reducedMotion = false,
  beforeDetect?: (fixture: ComponentFixture<AnswerReveal>) => void,
): Promise<ComponentFixture<AnswerReveal>> {
  await TestBed.configureTestingModule({
    imports: [AnswerReveal],
    providers: [
      {
        provide: BrowserService,
        useValue: {
          prefersReducedMotion: (): boolean => reducedMotion,
          copyText: async (): Promise<void> => {},
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(AnswerReveal);
  fixture.componentRef.setInput('text', text);
  fixture.componentRef.setInput('animate', animate);
  beforeDetect?.(fixture);
  fixture.detectChanges();
  return fixture;
}

function visibleText(fixture: ComponentFixture<AnswerReveal>): string {
  const compiled = fixture.nativeElement as HTMLElement;
  return (
    Array.from(compiled.querySelectorAll<HTMLElement>('.prose'))
      .map((node) => node.textContent ?? '')
      .join('') ?? ''
  );
}

function screenReaderText(fixture: ComponentFixture<AnswerReveal>): string {
  const compiled = fixture.nativeElement as HTMLElement;
  return compiled.querySelector('.sr-only')?.textContent ?? '';
}

function cards(fixture: ComponentFixture<AnswerReveal>): number {
  return (fixture.nativeElement as HTMLElement).querySelectorAll('app-code-block').length;
}

describe('AnswerReveal', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the complete answer at once when it should not animate', async () => {
    const finished = vi.fn();
    const fixture = await render(ANSWER, false, false, (component) =>
      component.componentInstance.finished.subscribe(finished),
    );

    expect(visibleText(fixture)).toBe(ANSWER);
    expect(screenReaderText(fixture)).toBe('');
    expect(finished).toHaveBeenCalledTimes(1);
  });

  it('keeps the full answer in the DOM for screen readers while the words arrive', async () => {
    vi.useFakeTimers();
    const fixture = await render(ANSWER, true);

    expect(screenReaderText(fixture)).toBe(ANSWER);
    expect(visibleText(fixture)).toBe('');

    vi.advanceTimersByTime(200);
    fixture.detectChanges();

    const partial = visibleText(fixture);
    expect(partial.length).toBeGreaterThan(0);
    expect(partial.length).toBeLessThan(ANSWER.length);
    expect(ANSWER.startsWith(partial)).toBe(true);
    expect(screenReaderText(fixture)).toBe(ANSWER);
  });

  it('finishes the word-by-word reveal once and ends on the exact text', async () => {
    vi.useFakeTimers();
    const finished = vi.fn();
    const fixture = await render(ANSWER, true, false, (component) =>
      component.componentInstance.finished.subscribe(finished),
    );

    vi.advanceTimersByTime(2000);
    fixture.detectChanges();

    expect(visibleText(fixture)).toBe(ANSWER);
    expect(finished).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);
    fixture.detectChanges();

    expect(finished).toHaveBeenCalledTimes(1);
  });

  it('reveals instantly under reduced motion', async () => {
    vi.useFakeTimers();
    const fixture = await render(ANSWER, true, true);

    expect(visibleText(fixture)).toBe(ANSWER);
    expect(screenReaderText(fixture)).toBe('');
  });

  it('frames the code of an answer as one card instead of revealed words', async () => {
    const fixture = await render(CODED, false);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(cards(fixture)).toBe(1);
    expect(compiled.querySelector('.code-text')?.textContent).toBe('def add(a, b):');
    expect(visibleText(fixture)).toBe('Here is the function.It adds.');
  });

  it('brings the code card in whole once the reveal reaches it', async () => {
    vi.useFakeTimers();
    const fixture = await render(CODED, true);

    expect(cards(fixture)).toBe(0);
    vi.advanceTimersByTime(1600);
    fixture.detectChanges();

    expect(cards(fixture)).toBe(1);
    expect(visibleText(fixture)).toBe('Here is the function.It adds.');
  });
});
