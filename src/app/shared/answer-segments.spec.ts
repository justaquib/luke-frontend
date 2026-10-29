import { answerWordCount, parseAnswer, revealAnswer } from './answer-segments';

const CODE = 'def add(a, b):\n    return a + b';
const FENCED = `Here is the function.\n\`\`\`python\n${CODE}\n\`\`\`\nIt returns the sum.`;
const FENCED_WORDS = 15;

function kinds(text: string): string[] {
  return parseAnswer(text).map((part) => part.kind);
}

describe('parseAnswer', () => {
  it('keeps an answer without a fence as one prose part', () => {
    const parts = parseAnswer('The sky is blue because light scatters.');

    expect(parts).toHaveLength(1);
    expect(parts[0].kind).toBe('prose');
    expect(parts[0].text).toBe('The sky is blue because light scatters.');
  });

  it('splits an answer into the prose around one fenced block', () => {
    const parts = parseAnswer(FENCED);

    expect(parts.map((part) => part.kind)).toEqual(['prose', 'code', 'prose']);
    expect(parts[1].language).toBe('python');
    expect(parts[1].text).toBe(CODE);
  });

  it('names an unlabelled block nothing so the card can say code', () => {
    const parts = parseAnswer(['Look:', '```', 'npm install luke', '```'].join('\n'));

    expect(parts[1].kind).toBe('code');
    expect(parts[1].language).toBe('');
    expect(parts[1].text).toBe('npm install luke');
  });

  it('treats an unclosed fence as code, which is what a streaming answer holds', () => {
    const parts = parseAnswer('Here:\n```python\ndef add(a, b):');

    expect(kinds('Here:\n```python\ndef add(a, b):')).toEqual(['prose', 'code']);
    expect(parts[1].text).toBe('def add(a, b):');
  });

  it('keeps several blocks in the order the answer wrote them', () => {
    const parts = parseAnswer('one\n```\nx = 1\n```\ntwo\n```\ny = 2\n```\nthree');

    expect(kinds('one\n```\nx = 1\n```\ntwo\n```\ny = 2\n```\nthree')).toEqual([
      'prose',
      'code',
      'prose',
      'code',
      'prose',
    ]);
    expect(parts[1].text).toBe('x = 1');
    expect(parts[3].text).toBe('y = 2');
  });

  it('leaves a single backtick pair inside a sentence as prose', () => {
    expect(kinds('Run `make quality` before you report the work.')).toEqual(['prose']);
  });

  it('drops the fence markers from the words a reveal has to count', () => {
    const parts = parseAnswer(FENCED);

    expect(parts[0].start).toBe(0);
    expect(parts[0].end).toBe(4);
    expect(parts[1].start).toBe(4);
    expect(parts[1].end).toBe(11);
    expect(answerWordCount(parts)).toBe(FENCED_WORDS);
  });

  it('counts no words in an empty answer', () => {
    expect(answerWordCount(parseAnswer(''))).toBe(0);
  });
});

describe('revealAnswer', () => {
  const parts = parseAnswer(FENCED);

  it('holds back the parts the reveal has not reached', () => {
    const visible = revealAnswer(parts, 2);

    expect(visible).toHaveLength(1);
    expect(visible[0].text).toBe('Here is');
  });

  it('shows a code block whole rather than one line at a time', () => {
    const visible = revealAnswer(parts, 5);

    expect(visible.map((part) => part.kind)).toEqual(['prose', 'code']);
    expect(visible[1].text).toBe(CODE);
  });

  it('finishes with the whole answer, prose and both ends intact', () => {
    expect(revealAnswer(parts, 5)[0].text).toBe('Here is the function.');
    expect(revealAnswer(parts, FENCED_WORDS)).toEqual(parts);
  });
});
