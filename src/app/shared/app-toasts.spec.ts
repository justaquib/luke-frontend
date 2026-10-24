import { TestBed } from '@angular/core/testing';
import { AppToasts } from './app-toasts';
import { UiService } from './ui.service';

function query<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

describe('AppToasts', () => {
  let ui: UiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppToasts] }).compileComponents();
    ui = TestBed.inject(UiService);
    for (const toast of ui.toasts()) ui.dismissToast(toast.id);
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(AppToasts);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('draws no region while there is nothing to say', () => {
    expect(render().querySelector('.toasts')).toBeNull();
  });

  it('shows each message with its tone and an icon', () => {
    ui.toast('Saved the lesson.', 'success', 60_000);
    ui.toast('The engine is offline.', 'error', 60_000);
    const compiled = render();

    expect(query<HTMLElement>(compiled, '.toasts').getAttribute('aria-label')).toBe(
      'Notifications',
    );

    const success = query<HTMLElement>(compiled, '.toast.success');
    expect(success.getAttribute('role')).toBe('status');
    expect(query<HTMLElement>(success, '.toast-message').textContent?.trim()).toBe(
      'Saved the lesson.',
    );
    expect(success.querySelector('app-icon')).toBeTruthy();

    const error = query<HTMLElement>(compiled, '.toast.error');
    expect(error.getAttribute('role')).toBe('alert');
    expect(query<HTMLElement>(error, '.toast-message').textContent?.trim()).toBe(
      'The engine is offline.',
    );

    for (const toast of ui.toasts()) ui.dismissToast(toast.id);
  });

  it('dismisses a message from its own button', () => {
    ui.toast('Saved the lesson.', 'success', 60_000);
    const fixture = TestBed.createComponent(AppToasts);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    query<HTMLButtonElement>(compiled, '.toast-close').click();
    fixture.detectChanges();

    expect(compiled.querySelector('.toast')).toBeNull();
    expect(ui.toasts()).toHaveLength(0);
  });
});
