import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ParentingChat } from './parenting-chat';

describe('ParentingChat', () => {
  let component: ParentingChat;
  let fixture: ComponentFixture<ParentingChat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParentingChat],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ParentingChat);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the coaching frame around the shell', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-shell')).toBeTruthy();
    expect(compiled.querySelector('main.coach-main')).toBeTruthy();
  });
});
