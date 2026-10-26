import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { BackgroundTasksService } from '../shared/background-tasks.service';
import { RightSidebarService } from '../shared/right-sidebar.service';
import { ChatUI } from './chat-ui';
import { ChatSessionService } from './chat-session.service';

function modelSettings(): Record<string, unknown> {
  return {
    name: 'Luke',
    start_level: '0.0.0',
    level: '0.0.0',
    defaults: { name: 'Luke', start_level: '0.0.0' },
    levels: [{ level: '0.0.0', name: 'Newborn', title: 'Luke 0.0.0', description: 'Seed' }],
  };
}

function startedAt(createdAt: number): string {
  return new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

describe('ChatUI', () => {
  let component: ChatUI;
  let fixture: ComponentFixture<ChatUI>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatUI],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'chat', children: [] }]),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ChatUI);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
    http
      .match((request) => request.url.endsWith('/health'))
      .forEach((request) => request.flush({ status: 'ok' }));
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(BackgroundTasksService).stop();
    http.verify();
  });

  const openInfo = (): void => {
    TestBed.inject(RightSidebarService).showInfo();
    fixture.detectChanges();
    http
      .match((request) => request.url.endsWith('/language-model/brain'))
      .forEach((request) =>
        request.flush({ training: false, trained: true, vocabulary: 12, progress: null }),
      );
    http
      .match((request) => request.url.endsWith('/language-model/settings'))
      .forEach((request) => request.flush(modelSettings()));
    fixture.detectChanges();
  };

  const factsPanel = (): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector('.page-info-facts');

  const factValues = (): (string | undefined)[] =>
    [...(factsPanel()?.querySelectorAll('dd') ?? [])].map((node) => node.textContent?.trim());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('builds the page from the top panel, the sidebar, the messages and the composer', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-top-bar')).toBeTruthy();
    expect(compiled.querySelector('app-right-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-chat-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-chat-messages')).toBeTruthy();
    expect(compiled.querySelector('app-chat-composer')).toBeTruthy();
    expect(compiled.querySelector('.chat-area app-engine-facts')).toBeNull();
    expect(compiled.querySelector('app-chat-header')).toBeNull();
    expect(compiled.textContent).not.toContain('Conversation engine');
  });

  it('puts the conversation engine facts in the info panel', () => {
    openInfo();
    const compiled = fixture.nativeElement as HTMLElement;
    const facts = compiled.querySelector('.page-info-facts app-engine-facts');

    expect(compiled.querySelector('.chat-area app-engine-facts')).toBeNull();
    expect(facts?.querySelector('dl')?.getAttribute('aria-label')).toBe(
      'Conversation engine state',
    );
    const labels = [...(facts?.querySelectorAll('dt') ?? [])].map((node) =>
      node.textContent?.trim(),
    );
    expect(labels).toEqual(['Messages', 'Answer paths', 'Started']);
    const values = [...(facts?.querySelectorAll('dd') ?? [])].map((node) =>
      node.textContent?.trim(),
    );
    expect(values[0]).toBe('1');
    expect(values[1]).toBe('0');
    expect(facts?.textContent).toContain('no answer yet');
    expect(compiled.querySelector('#right-sidebar')?.textContent).toContain('This conversation');
  });

  it('keeps the info facts on the active chat session', () => {
    const session = TestBed.inject(ChatSessionService);
    const first = session.active();
    openInfo();

    expect(factValues()).toEqual(['1', '0', startedAt(first.createdAt)]);

    session.appendMessage({
      id: 20,
      role: 'user',
      text: 'Why is the sky blue?',
      timestamp: new Date('2026-10-24T10:00:00Z'),
    });
    session.appendMessage({
      id: 21,
      role: 'assistant',
      text: 'Sunlight scatters blue light.',
      timestamp: new Date('2026-10-24T10:01:00Z'),
      source: 'docs',
    });
    fixture.detectChanges();

    expect(factValues()).toEqual(['3', '1', startedAt(first.createdAt)]);

    session.createSession();
    fixture.detectChanges();

    expect(factValues()).toEqual(['1', '0', startedAt(session.active().createdAt)]);

    session.selectSession(first.id);
    fixture.detectChanges();

    expect(factValues()).toEqual(['3', '1', startedAt(first.createdAt)]);
  });

  it('puts the active conversation title in the top panel', async () => {
    await TestBed.inject(Router).navigateByUrl('/chat');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const center = compiled.querySelector('.top-bar .bar-center');

    expect(center?.querySelector('.page-name')?.textContent?.trim()).toBe('Chat');
    expect(center?.querySelector('.page-scope')?.textContent?.trim()).toBe('Assistant');
    expect(center?.querySelector('.context-title')?.textContent).toContain('New chat');
  });

  it('opens an assistant answer with its record in the right sidebar', async () => {
    const session = TestBed.inject(ChatSessionService);
    session.appendMessage({
      id: 10,
      role: 'user',
      text: 'Why is the sky blue?',
      timestamp: new Date('2026-10-24T10:00:00Z'),
    });
    session.appendMessage({
      id: 11,
      role: 'assistant',
      text: 'Sunlight scatters shorter blue wavelengths more strongly.',
      timestamp: new Date('2026-10-24T10:01:00Z'),
      source: 'docs',
      hits: [
        {
          text: 'Rayleigh scattering makes the sky blue.',
          metadata: { source: 'science.md' },
          distance: 0.12,
        },
      ],
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const answers = compiled.querySelectorAll<HTMLButtonElement>('.answer-open');
    answers[answers.length - 1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    http
      .match((request) => request.url.endsWith('/language-model/brain'))
      .forEach((request) =>
        request.flush({ training: false, trained: true, vocabulary: 12, progress: null }),
      );

    await fixture.whenStable();
    fixture.detectChanges();

    const sidebar = compiled.querySelector<HTMLElement>('#right-sidebar');
    expect(sidebar).toBeTruthy();
    const text = sidebar?.textContent ?? '';
    expect(text).toContain('Answer details');
    expect(text).toContain('Why is the sky blue?');
    expect(text).toContain('Sunlight scatters shorter blue wavelengths');
    expect(text).toContain('Documents');
    expect(text).toContain('Rayleigh scattering makes the sky blue.');
    expect(text).not.toContain('What the writer read');
  });

  it('keeps settings in the shared top panel', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const settings = compiled.querySelector<HTMLAnchorElement>('.top-bar .settings-btn');

    expect(settings).toBeTruthy();
    expect(settings?.getAttribute('href')).toBe('/dashboard/settings');
    expect(compiled.querySelectorAll('a[aria-label="Open settings"]').length).toBe(1);
  });
});
