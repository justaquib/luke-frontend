import { SseParser } from './sse-parser';

describe('SseParser', () => {
  it('reads one named frame with its JSON data', () => {
    const parser = new SseParser();
    const messages = parser.push('event: reading\ndata: {"words":[]}\n\n');

    expect(messages).toEqual([{ event: 'reading', data: '{"words":[]}' }]);
  });

  it('joins a frame split across chunks, including a CRLF split in two', () => {
    const parser = new SseParser();
    const first = parser.push('event: thinking\r');
    const second = parser.push('\ndata: {"plan":["Lessons"]}\r\n\r\n');

    expect(first).toEqual([]);
    expect(second).toEqual([{ event: 'thinking', data: '{"plan":["Lessons"]}' }]);
  });

  it('joins multi-line data with a newline and keeps spaces after the colon', () => {
    const parser = new SseParser();
    const messages = parser.push('data: first line\ndata:  second line\n\n');

    expect(messages).toEqual([{ event: 'message', data: 'first line\n second line' }]);
  });

  it('ignores comments and blocks without data', () => {
    const parser = new SseParser();
    const messages = parser.push(': keep-alive\n\nevent: ignored\n\nevent: reading\ndata: {}\n\n');

    expect(messages).toEqual([{ event: 'reading', data: '{}' }]);
  });

  it('starts every frame with a fresh event name', () => {
    const parser = new SseParser();
    const messages = parser.push('event: reading\ndata: {}\n\ndata: {}\n\n');

    expect(messages.map((message) => message.event)).toEqual(['reading', 'message']);
  });

  it('flushes a final block that never got its blank line', () => {
    const parser = new SseParser();
    parser.push('event: done\ndata: {}');
    const messages = parser.flush();

    expect(messages).toEqual([{ event: 'done', data: '{}' }]);
  });
});
