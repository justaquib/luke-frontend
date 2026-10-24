import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { AppCardInfo } from './app-card-info';

function query<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

describe('AppCardInfo', () => {
  async function render(): Promise<{
    fixture: ComponentFixture<AppCardInfo>;
    compiled: HTMLElement;
  }> {
    await TestBed.configureTestingModule({ imports: [AppCardInfo] }).compileComponents();
    const fixture = TestBed.createComponent(AppCardInfo);
    fixture.componentRef.setInput('label', 'what it has learned');
    fixture.componentRef.setInput('text', 'Everything the learner holds right now.');
    fixture.detectChanges();
    return { fixture, compiled: fixture.nativeElement as HTMLElement };
  }

  it('keeps the explanation closed behind an info button', async () => {
    const { compiled } = await render();
    const button = query<HTMLButtonElement>(compiled, '.card-info-button');

    expect(compiled.querySelector('[role="dialog"]')).toBeNull();
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    expect(button.getAttribute('aria-label')).toBe('Show info about what it has learned');
    expect(button.getAttribute('title')).toBe('Show info about what it has learned');
  });

  it('opens the explanation in the shared dialog', async () => {
    const { fixture, compiled } = await render();

    query<HTMLButtonElement>(compiled, '.card-info-button').click();
    fixture.detectChanges();
    await fixture.whenStable();

    const dialog = query<HTMLElement>(compiled, '[role="dialog"]');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(query<HTMLElement>(dialog, 'h2').textContent?.trim()).toBe('About what it has learned');
    expect(query<HTMLElement>(dialog, '.card-info-text').textContent?.trim()).toBe(
      'Everything the learner holds right now.',
    );
  });

  it('closes the shared dialog again', async () => {
    const { fixture, compiled } = await render();
    query<HTMLButtonElement>(compiled, '.card-info-button').click();
    fixture.detectChanges();
    await fixture.whenStable();

    const dialog = query<HTMLElement>(compiled, '[role="dialog"]');
    query<HTMLButtonElement>(dialog, 'button[aria-label="Close dialog"]').click();
    fixture.detectChanges();

    expect(compiled.querySelector('[role="dialog"]')).toBeNull();
  });
});
