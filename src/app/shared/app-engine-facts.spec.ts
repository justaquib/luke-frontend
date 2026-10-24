import { TestBed } from '@angular/core/testing';
import { AppEngineFacts, type EngineFact } from './app-engine-facts';

const FACTS: EngineFact[] = [
  { label: 'Messages', value: '4' },
  { label: 'Sources', value: '2', note: 'in this conversation' },
  { label: 'Engine', value: 'Connected', tone: 'ok' },
];

function render(): HTMLElement {
  const fixture = TestBed.createComponent(AppEngineFacts);
  fixture.componentRef.setInput('facts', FACTS);
  fixture.componentRef.setInput('label', 'Conversation engine state');
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('AppEngineFacts', () => {
  it('renders every label, value and note in one labelled list', () => {
    const compiled = render();
    const list = compiled.querySelector('dl');

    expect(list?.getAttribute('aria-label')).toBe('Conversation engine state');
    const labels = [...compiled.querySelectorAll('dt')].map((node) => node.textContent?.trim());
    const values = [...compiled.querySelectorAll('dd')].map((node) => node.textContent?.trim());
    expect(labels).toEqual(['Messages', 'Sources', 'Engine']);
    expect(values).toEqual(['4', '2', 'Connected']);
    expect(compiled.querySelector('.note')?.textContent?.trim()).toBe('in this conversation');
  });

  it('marks only the facts that carry a measured tone', () => {
    const compiled = render();
    const tones = [...compiled.querySelectorAll('dd')].map((node) => node.className);

    expect(tones).toEqual(['', '', 'ok']);
  });
});
