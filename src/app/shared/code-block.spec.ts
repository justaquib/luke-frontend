import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserService } from '../core/browser.service';
import { UiService } from './ui.service';
import { CodeBlock } from './code-block';

const CODE = 'def add(a, b):\n    return a + b';

type Toasts = { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

type Rendered = { fixture: ComponentFixture<CodeBlock>; compiled: HTMLElement; toasts: Toasts };

/** The card under test, with the clipboard and the toast channel faked. */
async function render(
  options: {
    code?: string;
    language?: string;
    copyText?: (text: string) => Promise<void>;
  } = {},
): Promise<Rendered> {
  const toasts: Toasts = { success: vi.fn(), error: vi.fn() };
  const copyText = options.copyText ?? (async (): Promise<void> => {});
  await TestBed.configureTestingModule({
    imports: [CodeBlock],
    providers: [
      { provide: UiService, useValue: toasts },
      { provide: BrowserService, useValue: { copyText } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(CodeBlock);
  fixture.componentRef.setInput('code', options.code ?? CODE);
  fixture.componentRef.setInput('language', options.language ?? 'python');
  fixture.detectChanges();
  return { fixture, compiled: fixture.nativeElement as HTMLElement, toasts };
}

function copyButton(compiled: HTMLElement): HTMLButtonElement {
  const button = compiled.querySelector<HTMLButtonElement>('.code-copy');
  if (!button) throw new Error('Missing element: .code-copy');
  return button;
}

async function copy(rendered: Rendered): Promise<void> {
  copyButton(rendered.compiled).click();
  await rendered.fixture.whenStable();
  rendered.fixture.detectChanges();
}

describe('CodeBlock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('numbers every line and names the language the answer gave', async () => {
    const { compiled } = await render();
    const lines = compiled.querySelectorAll<HTMLElement>('.code-line');

    expect(compiled.querySelector('.code-label')?.textContent?.trim()).toBe('python');
    expect(compiled.querySelector('.code-count')?.textContent?.trim()).toBe('2 lines');
    expect(lines).toHaveLength(2);
    expect(lines[0].querySelector('.code-num')?.textContent?.trim()).toBe('1');
    expect(lines[1].querySelector('.code-text')?.textContent).toBe('    return a + b');
  });

  it('calls a block whose fence named no language simply code', async () => {
    const { compiled } = await render({ language: '', code: 'x = 1' });

    expect(compiled.querySelector('.code-label')?.textContent?.trim()).toBe('code');
    expect(compiled.querySelector('.code-count')?.textContent?.trim()).toBe('1 line');
  });

  it('copies the exact code, indentation and all, and reports it once', async () => {
    const copyText = vi.fn(async (): Promise<void> => {});
    const rendered = await render({ copyText });

    await copy(rendered);

    expect(copyText).toHaveBeenCalledWith(CODE);
    expect(rendered.toasts.success).toHaveBeenCalledWith('Code copied.');
    expect(rendered.toasts.error).not.toHaveBeenCalled();
    expect(copyButton(rendered.compiled).getAttribute('aria-label')).toBe(
      'Code copied to clipboard',
    );
  });

  it('says so when the clipboard refuses the code', async () => {
    const rendered = await render({
      copyText: () => Promise.reject(new Error('Clipboard not available.')),
    });

    await copy(rendered);

    expect(rendered.toasts.error).toHaveBeenCalledWith('Could not copy the code.');
    expect(rendered.toasts.success).not.toHaveBeenCalled();
    expect(copyButton(rendered.compiled).getAttribute('aria-label')).toBe('Copy code');
  });

  it('keeps the copy click away from the answer behind it', async () => {
    const { compiled } = await render();
    const reached = vi.fn();
    document.addEventListener('click', reached);

    copyButton(compiled).click();
    document.removeEventListener('click', reached);

    expect(reached).not.toHaveBeenCalled();
  });

  it('holds the copied label for a moment and then returns to copy', async () => {
    vi.useFakeTimers();
    const { fixture, compiled } = await render();

    copyButton(compiled).click();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    expect(copyButton(compiled).getAttribute('aria-label')).toBe('Code copied to clipboard');

    await vi.advanceTimersByTimeAsync(1600);
    fixture.detectChanges();
    expect(copyButton(compiled).getAttribute('aria-label')).toBe('Copy code');
  });
});
