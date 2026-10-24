import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ChatUI } from './chat-ui';

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

  it('builds the page from the top panel, the sidebar, the header, the facts, the messages and the composer', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-top-bar')).toBeTruthy();
    expect(compiled.querySelector('app-right-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-chat-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-chat-header')).toBeTruthy();
    expect(compiled.querySelector('app-chat-messages')).toBeTruthy();
    expect(compiled.querySelector('app-chat-composer')).toBeTruthy();
    expect(compiled.querySelector('app-chat-header .sidebar-toggle')).toBeNull();
  });

  it('shows the conversation engine facts with measured values', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const facts = compiled.querySelector('app-engine-facts');

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
  });

  it('sends the reader to the settings page from the gear', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const gear = compiled.querySelector<HTMLAnchorElement>('a[aria-label="Settings"]');

    expect(gear).toBeTruthy();
    expect(gear?.getAttribute('href')).toBe('/dashboard/settings');
  });
});
