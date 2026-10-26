import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserService } from '../core/browser.service';
import { AnswerReveal } from './answer-reveal';

const ANSWER = 'Sunlight scatters blue light more strongly than red light in the sky above us.';

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
        useValue: { prefersReducedMotion: (): boolean => reducedMotion },
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
  return compiled.querySelector('[aria-hidden="true"]')?.textContent ?? '';
}

function screenReaderText(fixture: ComponentFixture<AnswerReveal>): string {
  const compiled = fixture.nativeElement as HTMLElement;
  return compiled.querySelector('.sr-only')?.textContent ?? '';
}

describe('AnswerReveal', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the complete answer at once when it should not animate', async () => {
    const finished = vi.fn();
    const fixture = await render(ANSWER, false, false, (component) =>
      component.componentInstance.finished.subscribe(finished),
    );

    expect(visibleText(fixture)).toBe(ANSWER);
    expect(screenReaderText(fixture)).toBe(ANSWER);
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
    expect(screenReaderText(fixture)).toBe(ANSWER);
  });
});
