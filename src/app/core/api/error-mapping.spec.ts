import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';
import { ChatApiService } from './chat-api.service';
import { DocumentsApiService } from './documents-api.service';
import { ParentingApiService } from './parenting-api.service';
import { TrainerApiService } from './trainer-api.service';

/** The words a caller receives when a call fails, rather than the value. */
async function reason(read: Promise<unknown>): Promise<string> {
  try {
    await read;
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('The call succeeded, but a failure was expected.');
}

const UNREACHABLE = `Could not reach the Luke Lab backend. Is the API running on ${environment.apiUrl}?`;

/**
 * A service in `core/api` turns a transport failure into words once, at the call
 * site, so a page can print `error.message` as it stands. The transport's own
 * message names the URL and ends in "0 undefined", which must never reach a
 * person. One call of each service is failed below; the rest of them are wrapped
 * the same way.
 */
describe('HTTP error mapping', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token: () => 'test-token' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  /** Fails the newest request for `urlEnd` with the backend's own reason. */
  function refuse(urlEnd: string, detail: string): void {
    http
      .expectOne((req) => req.url.endsWith(urlEnd))
      .flush({ detail }, { status: 400, statusText: 'Bad Request' });
  }

  it('answers a failed chat question with the backend reason', async () => {
    const service = TestBed.inject(ChatApiService);
    const read = reason(firstValueFrom(service.query('what is a noun?')));
    refuse('/query', 'That question is too long to read.');

    expect(await read).toBe('That question is too long to read.');
  });

  it('lists documents in the same words when the reading never reached the backend', async () => {
    const service = TestBed.inject(DocumentsApiService);
    const read = reason(firstValueFrom(service.listDocuments()));
    http.expectOne((req) => req.url.endsWith('/documents')).error(new ErrorEvent('offline'));

    expect(await read).toBe(UNREACHABLE);
  });

  it('names a coaching session the backend refused to start', async () => {
    const service = TestBed.inject(ParentingApiService);
    const read = reason(firstValueFrom(service.createCoachingSession('Bedtime', '4-6')));
    refuse('/parenting/chat/session', 'The topic is too short to coach from.');

    expect(await read).toBe('The topic is too short to coach from.');
  });

  it('reports a refused inbox reading in the words the backend gave', async () => {
    const service = TestBed.inject(TrainerApiService);
    const read = reason(firstValueFrom(service.listInbox()));
    refuse('/faq/inbox?resolved=false', 'The pending questions could not be read.');

    expect(await read).toBe('The pending questions could not be read.');
  });
});
