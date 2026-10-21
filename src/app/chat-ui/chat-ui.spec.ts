import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ChatUI } from './chat-ui';
import { ChatSessionService } from './chat-session.service';
import { ChatService } from './chat.service';
import type { ChatMessage } from './chat.types';

describe('ChatUI', () => {
  let component: ChatUI;
  let fixture: ComponentFixture<ChatUI>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatUI],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatUI);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('builds the page from the sidebar, the header, the messages and the composer', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-chat-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-chat-header')).toBeTruthy();
    expect(compiled.querySelector('app-chat-messages')).toBeTruthy();
    expect(compiled.querySelector('app-chat-composer')).toBeTruthy();
  });

  it('sends the reader to the settings page from the gear', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const gear = compiled.querySelector<HTMLAnchorElement>('a[aria-label="Settings"]');

    expect(gear).toBeTruthy();
    expect(gear?.getAttribute('href')).toBe('/settings');
  });

  it('shows the train banner only while the train mode is on', () => {
    const session = TestBed.inject(ChatSessionService);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.train-banner')).toBeNull();

    session.trainMode.set(true);
    fixture.detectChanges();

    expect(compiled.querySelector('.train-banner')).toBeTruthy();
  });

  it('marks the parts of the chat with the train mode', () => {
    const session = TestBed.inject(ChatSessionService);
    const compiled = fixture.nativeElement as HTMLElement;
    const header = compiled.querySelector('app-chat-header');
    const sidebar = compiled.querySelector('app-chat-sidebar');

    expect(header?.classList.contains('train-on')).toBe(false);

    session.trainMode.set(true);
    fixture.detectChanges();

    expect(header?.classList.contains('train-on')).toBe(true);
    expect(sidebar?.classList.contains('train-on')).toBe(true);
  });

  it('lets the trainer give the right answer when an answer was wrong', async () => {
    const http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(ChatService);
    const answer: ChatMessage = {
      id: 7,
      role: 'assistant',
      text: 'I do not know.',
      timestamp: new Date(),
    };

    service.startCorrection(answer);
    service.correctionDraft.set('The rudiments are the basic first principles of a subject.');
    service.sendCorrection(answer);

    const taught = http.expectOne((req) => req.url.endsWith('/language-model/brain/correction'));
    expect(taught.request.method).toBe('POST');
    expect(taught.request.body.correction).toContain('rudiments are the basic first principles');
    taught.flush({
      faq_id: 32,
      question: 'What are the rudiments?',
      answer: 'The rudiments are the basic first principles of a subject.',
      learned: true,
      answer_now: 'The rudiments are the basic first principles of a subject.',
      corrections: 1,
    });
    await fixture.whenStable();

    expect(service.correctionId()).toBeNull();
    for (const request of http.match((req) => req.url.endsWith('/health'))) {
      request.flush({ status: 'ok' });
    }
    http.verify();
  });
});
