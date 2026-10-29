import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ChatMessage } from './chat-message';
import type { ChatMessage as ChatMessageModel } from './chat.types';

const ANSWER: ChatMessageModel = {
  id: 1,
  role: 'assistant',
  text: ['Read the notes file first.', '', '```python', 'open("notes.txt")', '```'].join('\n'),
  timestamp: new Date('2026-10-24T10:00:00Z'),
};

function render(): { fixture: ComponentFixture<ChatMessage>; compiled: HTMLElement } {
  const fixture = TestBed.createComponent(ChatMessage);
  fixture.componentRef.setInput('message', ANSWER);
  fixture.detectChanges();
  return { fixture, compiled: fixture.nativeElement as HTMLElement };
}

function click(node: Element | null, event: Event): void {
  if (!node) {
    throw new Error('Missing the node to click.');
  }
  node.dispatchEvent(event);
}

describe('ChatMessage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatMessage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    localStorage.clear();
  });

  it('puts the record behind its own button, and keeps the answer plain text', () => {
    const { fixture, compiled } = render();
    const opened = trackOpened(fixture);
    const answer = compiled.querySelector('app-answer-reveal');

    expect(answer?.getAttribute('role')).toBeNull();
    expect(answer?.getAttribute('tabindex')).toBeNull();

    click(compiled.querySelector('button[aria-label="Answer details"]'), new MouseEvent('click'));

    expect(opened).toEqual([ANSWER]);
  });

  it('never opens the record from a click inside the answer', () => {
    const { fixture, compiled } = render();
    const opened = trackOpened(fixture);

    click(compiled.querySelector('app-answer-reveal'), new MouseEvent('click', { bubbles: true }));
    click(compiled.querySelector('.prose'), new MouseEvent('click', { bubbles: true }));
    click(compiled.querySelector('.code-text'), new MouseEvent('click', { bubbles: true }));
    click(compiled.querySelector('.code-copy'), new MouseEvent('click', { bubbles: true }));

    expect(opened).toEqual([]);
  });

  it('shows the fenced block as its own card, and the prose around it', () => {
    const { compiled } = render();

    expect(compiled.querySelector('app-code-block')).not.toBeNull();
    expect(
      [...compiled.querySelectorAll('.prose')].map((node) => node.textContent?.trim()),
    ).toEqual(['Read the notes file first.']);
    expect(compiled.querySelector('.code-text')?.textContent?.trim()).toBe('open("notes.txt")');
  });
});

function trackOpened(fixture: ComponentFixture<ChatMessage>): ChatMessageModel[] {
  const opened: ChatMessageModel[] = [];
  fixture.componentInstance.openDetails.subscribe((message) => opened.push(message));
  return opened;
}
