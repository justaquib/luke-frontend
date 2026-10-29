import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IntegrationsService } from '../core/integrations.service';
import { ChatComposer } from './chat-composer';
import { ChatService } from './chat.service';
import { ChatSessionService } from './chat-session.service';

const TEACHER = 'hf:teacher-SmolLM2-135M';

function catalog(): Record<string, unknown> {
  return {
    default: 'luke',
    models: [
      {
        id: 'luke',
        name: 'Luke',
        kind: 'luke',
        detail: 'Answers from the taught material.',
        ready: true,
      },
      {
        id: TEACHER,
        name: 'SmolLM2 135M',
        kind: 'teacher',
        detail: 'Fine-tuned on the lab’s material.',
        ready: true,
      },
    ],
  };
}

describe('ChatComposer', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatComposer],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => http.verify());

  const build = (): { fixture: ComponentFixture<ChatComposer>; compiled: HTMLElement } => {
    const fixture = TestBed.createComponent(ChatComposer);
    fixture.detectChanges();
    http
      .match((request) => request.url.endsWith('/health'))
      .forEach((request) => request.flush({ status: 'ok' }));
    http
      .match((request) => request.url.endsWith('/language-model/models'))
      .forEach((request) => request.flush(catalog()));
    fixture.detectChanges();
    return { fixture, compiled: fixture.nativeElement as HTMLElement };
  };

  it('shows the model saved on this browser as the chosen one', () => {
    localStorage.setItem('luke.answer-model', TEACHER);
    const { compiled } = build();

    const select = compiled.querySelector('.model-select') as HTMLSelectElement;
    expect(select.value).toBe(TEACHER);
    expect([...select.options].map((option) => option.textContent?.trim())).toEqual([
      'Luke',
      'SmolLM2 135M',
    ]);
  });

  it('grows the message box with the draft and stops at the cap', () => {
    const { fixture, compiled } = build();
    const area = compiled.querySelector('.composer-input') as HTMLTextAreaElement;
    const scrollHeight = (value: number): void => {
      Object.defineProperty(area, 'scrollHeight', { configurable: true, value });
    };

    scrollHeight(120);
    area.value = 'A longer message';
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(area.style.height).toBe('120px');
    expect(area.style.overflowY).toBe('hidden');

    scrollHeight(400);
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(area.style.height).toBe('180px');
    expect(area.style.overflowY).toBe('auto');
    expect((compiled.querySelector('.send-btn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('offers a stop button only while an answer is streaming', () => {
    const { fixture, compiled } = build();
    const service = TestBed.inject(ChatService);

    expect(compiled.querySelector('.stop-btn')).toBeNull();

    service.isTyping.set(true);
    fixture.detectChanges();
    const stop = compiled.querySelector('.stop-btn') as HTMLButtonElement;
    expect(stop.getAttribute('aria-label')).toBe('Stop answering');

    stop.click();
    fixture.detectChanges();

    expect(service.isTyping()).toBe(false);
    expect(compiled.querySelector('.stop-btn')).toBeNull();
  });

  it('sends the draft with the chosen model', () => {
    const { fixture, compiled } = build();
    const service = TestBed.inject(ChatService);
    const send = vi.spyOn(service, 'send').mockImplementation((): void => undefined);
    const area = compiled.querySelector('.composer-input') as HTMLTextAreaElement;
    area.value = 'What is a drum?';
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const button = compiled.querySelector('.send-btn') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    button.click();

    expect(send).toHaveBeenCalledWith(
      'What is a drum?',
      expect.objectContaining({ model: 'luke' }),
    );
  });

  it('starts a new chat, unless an answer is streaming', () => {
    const { fixture, compiled } = build();
    const service = TestBed.inject(ChatService);
    const sessions = TestBed.inject(ChatSessionService);
    const newChat = vi.spyOn(sessions, 'newChat').mockImplementation((): void => undefined);

    (compiled.querySelector('.new-chat-btn') as HTMLButtonElement).click();
    expect(newChat).toHaveBeenCalledTimes(1);

    service.isTyping.set(true);
    fixture.detectChanges();
    expect((compiled.querySelector('.new-chat-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('turns the live sources on and off from the composer', () => {
    const { fixture, compiled } = build();
    const integrations = TestBed.inject(IntegrationsService);
    (compiled.querySelector('details.sources') as HTMLDetailsElement).open = true;
    fixture.detectChanges();

    const boxes = [...compiled.querySelectorAll<HTMLInputElement>('.source-row input')];
    expect(boxes).toHaveLength(3);
    expect(boxes.map((box) => box.checked)).toEqual([false, false, false]);

    boxes[1].checked = true;
    boxes[1].dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(integrations.wikiEnabled()).toBe(true);
    expect(compiled.querySelector('.tool-pill')?.textContent).toContain('Sources · 1');

    boxes[2].checked = true;
    boxes[2].dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(integrations.webEnabled()).toBe(true);
    expect(compiled.querySelector('.tool-pill')?.textContent).toContain('Sources · 2');
  });

  it('closes the source menu when the message box takes focus or Escape is pressed', () => {
    const { fixture, compiled } = build();
    const details = compiled.querySelector('details.sources') as HTMLDetailsElement;
    const area = compiled.querySelector('.composer-input') as HTMLTextAreaElement;

    details.open = true;
    area.dispatchEvent(new Event('focus'));
    expect(details.open).toBe(false);

    details.open = true;
    const summary = details.querySelector('summary') as HTMLElement;
    summary.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(details.open).toBe(false);
  });
});
