import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';
import { LanguageModelApiService } from './language-model-api.service';

/** The words a caller receives when a call fails, rather than the value. */
async function reason(read: Promise<unknown>): Promise<string> {
  try {
    await read;
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('The call succeeded, but a failure was expected.');
}

describe('LanguageModelApiService', () => {
  let service: LanguageModelApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token: () => 'test-token' } },
      ],
    });
    service = TestBed.inject(LanguageModelApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('says the backend is unreachable instead of quoting the transport', async () => {
    const read = reason(firstValueFrom(service.modelSettings()));
    http
      .expectOne((req) => req.url.endsWith('/language-model/settings'))
      .error(new ErrorEvent('offline'));

    // The transport's own message names the URL and ends in "0 undefined".
    expect(await read).toBe(
      `Could not reach the Luke Lab backend. Is the API running on ${environment.apiUrl}?`,
    );
  });

  it('passes the backend reason through in its own words', async () => {
    const detail = 'That starting version is not one of the measured levels.';
    const read = reason(firstValueFrom(service.saveModelSettings('Luke', '0.1.0')));
    const request = http.expectOne((req) => req.url.endsWith('/language-model/settings'));
    expect(request.request.method).toBe('PUT');
    request.flush({ detail }, { status: 400, statusText: 'Bad Request' });

    expect(await read).toBe(detail);
  });

  it('names the status when a failure carries no reason of its own', async () => {
    const read = reason(firstValueFrom(service.trainingSources()));
    http
      .expectOne((req) => req.url.endsWith('/language-model/brain/sources'))
      .flush('<html>a proxy error page</html>', { status: 502, statusText: 'Bad Gateway' });

    expect(await read).toContain('(HTTP 502)');
  });
});
