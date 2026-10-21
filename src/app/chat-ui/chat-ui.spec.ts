import { ComponentFixture, TestBed } from '@angular/core/testing';
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

  it('sends the reader to the settings page from the gear', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const gear = compiled.querySelector<HTMLAnchorElement>('a[aria-label="Settings"]');

    expect(gear).toBeTruthy();
    expect(gear?.getAttribute('href')).toBe('/settings');
  });
});
