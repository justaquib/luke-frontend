import { TestBed } from '@angular/core/testing';

import { ChatSessionService } from './chat-session.service';

const SESSIONS_KEY = 'assistance.sessions.v1';
const ACTIVE_KEY = 'assistance.active.v1';

function storeSession(messages: { id: number; role: string; text: string }[]): void {
  localStorage.setItem(
    SESSIONS_KEY,
    JSON.stringify([
      {
        id: 'stored',
        title: 'Who is your creator?',
        createdAt: 1,
        updatedAt: 2,
        messages: messages.map((message, index) => ({
          ...message,
          timestamp: new Date(2026, 9, 24, 10, index).toISOString(),
        })),
      },
    ]),
  );
  localStorage.setItem(ACTIVE_KEY, 'stored');
}

describe('ChatSessionService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('numbers new messages above the ids read from storage', () => {
    storeSession([
      { id: 100, role: 'user', text: 'Twinkle Twinkle Little Star' },
      { id: 101, role: 'assistant', text: 'Twinkle, twinkle, little star.' },
    ]);

    const service = TestBed.inject(ChatSessionService);

    expect(service.nextMessageId()).toBe(102);
  });

  it('repairs duplicate ids so an answer keeps its own question', () => {
    storeSession([
      { id: 100, role: 'user', text: 'Twinkle Twinkle Little Star' },
      { id: 101, role: 'assistant', text: 'Twinkle, twinkle, little star.' },
      { id: 100, role: 'user', text: 'who is your creator?' },
      {
        id: 101,
        role: 'assistant',
        text: 'I have been created by Aquib Shahbaz, a Senior Product Engineer.',
      },
    ]);
    const service = TestBed.inject(ChatSessionService);

    const answer = service.active().messages.at(-1);

    expect(answer?.text).toContain('Aquib Shahbaz');
    expect(answer && service.findUserQuestion(answer.id)).toBe('who is your creator?');
  });
});
