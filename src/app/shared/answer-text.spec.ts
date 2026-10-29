import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { AnswerText } from './answer-text';

const CODE = 'x = 1\ny = 2';
const ANSWER = `Two lines.\n\`\`\`python\n${CODE}\n\`\`\`\nBoth are numbers.`;

function render(words?: number): ComponentFixture<AnswerText> {
  TestBed.configureTestingModule({ imports: [AnswerText] });
  const fixture = TestBed.createComponent(AnswerText);
  fixture.componentRef.setInput('text', ANSWER);
  if (words !== undefined) {
    fixture.componentRef.setInput('revealedWords', words);
  }
  fixture.detectChanges();
  return fixture;
}

function prose(fixture: ComponentFixture<AnswerText>): string {
  const compiled = fixture.nativeElement as HTMLElement;
  return Array.from(compiled.querySelectorAll<HTMLElement>('.prose'))
    .map((node) => node.textContent ?? '')
    .join('');
}

describe('AnswerText', () => {
  it('frames a fenced block as one code card between the prose', () => {
    const fixture = render();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('app-code-block');

    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain('x = 1');
    expect(prose(fixture)).toBe('Two lines.Both are numbers.');
  });

  it('leaves an answer with no fence as plain prose', () => {
    TestBed.configureTestingModule({ imports: [AnswerText] });
    const fixture = TestBed.createComponent(AnswerText);
    fixture.componentRef.setInput('text', 'The sky is blue.');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('app-code-block')).toBeNull();
    expect(prose(fixture)).toBe('The sky is blue.');
  });

  it('shows a code card whole as soon as the reveal reaches it', () => {
    const fixture = render(3);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('app-code-block')).toHaveLength(1);
    expect(compiled.querySelector('.code-text')?.textContent).toBe('x = 1');
  });

  it('holds the card back while the prose before it is still arriving', () => {
    const fixture = render(1);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-code-block')).toBeNull();
    expect(prose(fixture)).toBe('Two');
  });

  it('marks prose as decoration while a reveal is running', () => {
    const fixture = render(1);

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.prose')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('lets the prose speak for itself once the answer is complete', () => {
    const fixture = render();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.prose')?.hasAttribute('aria-hidden'),
    ).toBe(false);
  });
});
