import { Injectable } from '@angular/core';
import { type Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import type { Invite, Tenant } from './api-models';

@Injectable({ providedIn: 'root' })
export class AdminApiService extends BaseApiService {
  listTenants(): Observable<Tenant[]> {
    return this.http.get<Tenant[]>(`${this.base}/auth/tenants`, {
      headers: this.authHeaders(),
    });
  }

  createInvite(email: string, role = 'user'): Observable<Invite> {
    return this.http.post<Invite>(
      `${this.base}/auth/invites`,
      { email, role },
      { headers: this.authHeaders() },
    );
  }

  listInvites(): Observable<Invite[]> {
    return this.http.get<Invite[]>(`${this.base}/auth/invites`, {
      headers: this.authHeaders(),
    });
  }
}
