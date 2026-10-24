import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { UiOverlay } from './ui-overlay';
import { UiService } from './ui.service';

function query<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

describe('UiOverlay', () => {
  let ui: UiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UiOverlay] }).compileComponents();
    ui = TestBed.inject(UiService);
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  function compiled(fixture: ComponentFixture<UiOverlay>): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('asks for confirmation in the shared dialog and answers true', async () => {
    const fixture = TestBed.createComponent(UiOverlay);
    fixture.detectChanges();
    const answers: boolean[] = [];

    ui.confirmDialog({
      title: 'Delete the lesson',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      danger: true,
    }).subscribe((answer) => answers.push(answer));
    fixture.detectChanges();
    await fixture.whenStable();

    const dialog = query<HTMLElement>(compiled(fixture), '[role="dialog"]');
    expect(query<HTMLElement>(dialog, 'h2').textContent?.trim()).toBe('Delete the lesson');
    expect(dialog.textContent).toContain('This cannot be undone.');
    expect(dialog.querySelector('.primary.danger')).toBeTruthy();
    expect(query<HTMLElement>(dialog, '.modal-actions .ghost').textContent?.trim()).toBe('Keep');

    query<HTMLButtonElement>(dialog, '.primary').click();
    fixture.detectChanges();

    expect(answers).toEqual([true]);
    expect(compiled(fixture).querySelector('[role="dialog"]')).toBeNull();
  });

  it('answers false when the dialog is closed without confirming', async () => {
    const fixture = TestBed.createComponent(UiOverlay);
    fixture.detectChanges();
    const answers: boolean[] = [];

    ui.confirmDialog({ message: 'Discard the draft?' }).subscribe((answer) => answers.push(answer));
    fixture.detectChanges();
    await fixture.whenStable();

    query<HTMLButtonElement>(compiled(fixture), '.modal-close').click();
    fixture.detectChanges();

    expect(answers).toEqual([false]);
    expect(ui.confirm()).toBeNull();
  });
});
