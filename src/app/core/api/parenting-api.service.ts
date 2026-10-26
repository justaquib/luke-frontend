import { Injectable, inject } from '@angular/core';
import { type Observable } from 'rxjs';
import { AnswerStreamService } from './answer-stream.service';
import { BaseApiService } from './base-api.service';
import type { AnswerStreamEvent, CoachingSession, CoachingTurn } from './api-models';

/**
 * The calls of the parenting coaching chat: the coach answers the parent from
 * the lessons the tenant taught.
 */
@Injectable({ providedIn: 'root' })
export class ParentingApiService extends BaseApiService {
  private readonly streams = inject(AnswerStreamService);

  createCoachingSession(topic = 'General', childAgeBand = ''): Observable<CoachingSession> {
    return this.http.post<CoachingSession>(
      `${this.base}/parenting/chat/session`,
      { topic, child_age_band: childAgeBand },
      { headers: this.authHeaders() },
    );
  }

  getCoachingSession(sessionId: string): Observable<CoachingSession> {
    return this.http.get<CoachingSession>(`${this.base}/parenting/chat/session/${sessionId}`, {
      headers: this.authHeaders(),
    });
  }

  sendCoachingTurn(sessionId: string, message: string): Observable<CoachingTurn> {
    return this.http.post<CoachingTurn>(
      `${this.base}/parenting/chat/session/${sessionId}/turn`,
      { message },
      { headers: this.authHeaders() },
    );
  }

  /** The same turn, read and connected stage by stage. */
  streamCoachingTurn(
    sessionId: string,
    message: string,
    signal?: AbortSignal,
  ): Observable<AnswerStreamEvent<CoachingTurn>> {
    return this.streams.streamCoachingTurn(sessionId, message, signal);
  }
}
