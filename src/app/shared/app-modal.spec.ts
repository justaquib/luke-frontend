import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { AppModal } from './app-modal';

function query<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

describe('AppModal', () => {
  let fixture: ComponentFixture<AppModal>;
  let closed: number;
  let opener: HTMLButtonElement | null = null;

  function compiled(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  async function render(open = true, closable = true): Promise<void> {
    fixture = TestBed.createComponent(AppModal);
    fixture.componentRef.setInput('title', 'About the card');
    fixture.componentRef.setInput('closable', closable);
    fixture.componentRef.setInput('open', open);
    fixture.componentInstance.closed.subscribe(() => {
      closed += 1;
    });
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppModal] }).compileComponents();
    closed = 0;
    opener = null;
  });

  afterEach(() => {
    document.body.style.overflow = '';
    opener?.remove();
  });

  it('draws nothing until it opens', async () => {
    await render(false);
    expect(compiled().querySelector('[role="dialog"]')).toBeNull();
  });

  it('shows the title and locks the page', async () => {
    await render();

    const dialog = query<HTMLElement>(compiled(), '[role="dialog"]');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(query<HTMLElement>(dialog, 'h2').textContent?.trim()).toBe('About the card');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close dialog');
  });

  it('asks to close from the close button', async () => {
    await render();

    query<HTMLButtonElement>(compiled(), 'button[aria-label="Close dialog"]').click();

    expect(closed).toBe(1);
  });

  it('asks to close from the backdrop', async () => {
    await render();

    query<HTMLElement>(compiled(), '.modal-backdrop').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );

    expect(closed).toBe(1);
  });

  it('asks to close from Escape', async () => {
    await render();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closed).toBe(1);
  });

  it('ignores every dismissal while it is not closable', async () => {
    await render(true, false);

    expect(compiled().querySelector('button[aria-label="Close dialog"]')).toBeNull();
    query<HTMLElement>(compiled(), '.modal-backdrop').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closed).toBe(0);
    expect(compiled().querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('returns the focus it took when it closes', async () => {
    opener = document.createElement('button');
    opener.textContent = 'Open';
    document.body.append(opener);
    opener.focus();
    await render(false);

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close dialog');

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(opener);
  });
});
