import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatUI } from './chat-ui';

describe('ChatUI', () => {
  let component: ChatUI;
  let fixture: ComponentFixture<ChatUI>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatUI],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatUI);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
