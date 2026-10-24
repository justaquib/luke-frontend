import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ChatMessageMeta } from './chat-message-meta';
import type { ChatMessage } from './chat.types';

function render(message: ChatMessage): HTMLElement {
  const fixture = TestBed.createComponent(ChatMessageMeta);
  fixture.componentRef.setInput('message', message);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ChatMessageMeta', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatMessageMeta],
      providers: [provideRouter([])],
    }).compileComponents();
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
  });

  it('turns a disabled live source into a settings link, not a warning box', () => {
    const compiled = render({
      id: 2,
      role: 'assistant',
      text: 'I do not know that yet.',
      timestamp: new Date('2026-10-24T10:00:00Z'),
      source: 'pending',
      disabledExternalSources: ['Wikipedia'],
    });

    const hint = compiled.querySelector('.source-hint');
    const link = hint?.querySelector('a');
    expect(hint?.textContent).toContain('Live answers are off.');
    expect(link?.getAttribute('href')).toBe('/dashboard/settings');
    expect(link?.textContent).toContain('Enable Wikipedia in Settings');
    expect(compiled.querySelector('.external-hint')).toBeNull();
    expect(compiled.querySelector('.provenance-value')?.classList.contains('pending')).toBe(true);
  });
});
