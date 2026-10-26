/** One frame of a server-sent event stream. */
export interface SseMessage {
  event: string;
  data: string;
}

const LINE_BREAK = /\r\n|\r|\n/;

/**
 * Reads server-sent events from chunks that may split anywhere: between
 * frames, between a CR and its LF, or in the middle of a data line. Only
 * blocks that carry data are emitted, so comments and keep-alives are silent.
 */
export class SseParser {
  private buffer = '';
  private eventName = '';
  private dataLines: string[] = [];

  push(chunk: string): SseMessage[] {
    this.buffer += chunk;
    const messages: SseMessage[] = [];
    let line = this.takeLine(false);
    while (line !== null) {
      const message = this.readLine(line);
      if (message) messages.push(message);
      line = this.takeLine(false);
    }
    return messages;
  }

  /** Ends the stream: a last line or block without its trailing newline still counts. */
  flush(): SseMessage[] {
    const messages: SseMessage[] = [];
    let line = this.takeLine(true);
    while (line !== null) {
      const message = this.readLine(line);
      if (message) messages.push(message);
      line = this.takeLine(true);
    }
    const message = this.dispatch();
    if (message) messages.push(message);
    return messages;
  }

  private takeLine(final: boolean): string | null {
    const match = LINE_BREAK.exec(this.buffer);
    if (!match) {
      if (!final || this.buffer === '') return null;
      const last = this.buffer;
      this.buffer = '';
      return last;
    }
    if (match[0] === '\r' && match.index === this.buffer.length - 1 && !final) {
      return null;
    }
    const line = this.buffer.slice(0, match.index);
    this.buffer = this.buffer.slice(match.index + match[0].length);
    return line;
  }

  private readLine(line: string): SseMessage | null {
    if (line === '') {
      return this.dispatch();
    }
    if (line.startsWith(':')) {
      return null;
    }
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') {
      this.eventName = value;
    } else if (field === 'data') {
      this.dataLines.push(value);
    }
    return null;
  }

  private dispatch(): SseMessage | null {
    const event = this.eventName || 'message';
    this.eventName = '';
    if (this.dataLines.length === 0) {
      return null;
    }
    const data = this.dataLines.join('\n');
    this.dataLines = [];
    return { event, data };
  }
}
