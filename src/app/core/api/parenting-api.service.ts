import { Injectable } from '@angular/core';
import { type Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import type { CoachingSession, CoachingTurn } from './api-models';

/**
 * The calls of the parenting coaching chat: the coach answers the parent from
 * the lessons the tenant taught, and the corrections the parent gives go back
 * to the coach until it answers well.
 */
@Injectable({ providedIn: 'root' })
export class ParentingApiService extends BaseApiService {
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

  sendCoachingCorrection(sessionId: string, correction: string): Observable<CoachingTurn> {
    return this.http.post<CoachingTurn>(
      `${this.base}/parenting/chat/session/${sessionId}/correction`,
      { correction },
      { headers: this.authHeaders() },
    );
  }
}
