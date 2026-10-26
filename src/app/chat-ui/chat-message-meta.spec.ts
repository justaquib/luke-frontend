import { TestBed } from '@angular/core/testing';
import { ChatMessageMeta } from './chat-message-meta';
import type { ChatMessage } from './chat.types';

function render(message: ChatMessage): HTMLElement {
  const fixture = TestBed.createComponent(ChatMessageMeta);
  fixture.componentRef.setInput('message', message);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

function metrics(compiled: HTMLElement): string[] {
  return [...compiled.querySelectorAll('.provenance-metric')].map(
    (node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  );
}

describe('ChatMessageMeta', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ChatMessageMeta] }).compileComponents();
  });

  it('names the answer source without a pill', () => {
    const compiled = render({
      id: 1,
      role: 'assistant',
      text: 'The square root of 69 is 8.30662.',
      timestamp: new Date('2026-10-24T10:00:00Z'),
      source: 'number_cards',
    });

    expect(compiled.querySelector('.source-tag')).toBeNull();
    expect(compiled.querySelector('.provenance-label')?.textContent?.trim()).toBe('Source');
    expect(compiled.querySelector('.provenance-value')?.textContent?.trim()).toBe('Number cards');
    expect(metrics(compiled)).toEqual([]);
  });

  it('shows the measured distance, confidence and model beside the source', () => {
    const compiled = render({
      id: 2,
      role: 'assistant',
      text: 'A drum is hit with a stick.',
      timestamp: new Date('2026-10-24T10:00:00Z'),
      source: 'lesson_cards',
      matchDistance: 0.1,
      confidence: 0.996,
      modelName: 'SmolLM2 135M',
    });

    expect(metrics(compiled)).toEqual(['dist 0.10', 'confidence 100%', 'model SmolLM2 135M']);
    expect(compiled.querySelector('.source-hint')).toBeNull();
  });

  it('falls back to the intent distance when no measured distance was stored', () => {
    const compiled = render({
      id: 3,
      role: 'assistant',
      text: 'The office is open at nine.',
      timestamp: new Date('2026-10-24T10:00:00Z'),
      source: 'intent',
      intent: { distance: 0.234 },
    });

    expect(metrics(compiled)).toEqual(['dist 0.23']);
  });
});
