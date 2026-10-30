import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
  requires_confirmation: boolean;
}

export interface ToolExecuteRequest {
  tool: string;
  params: Record<string, unknown>;
  conversation_id?: string;
  confirmed?: boolean;
}

export interface ToolExecuteResponse {
  status: 'succeeded' | 'failed' | 'awaiting_confirmation';
  tool: string;
  output?: unknown;
  error?: string;
  preview?: Record<string, unknown>;
}

export interface ToolPermission {
  tool: string;
  enabled: boolean;
}

export interface InstalledApp {
  name: string;
  path: string;
}

@Injectable({ providedIn: 'root' })
export class ToolsService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private apiUrl = `${environment.apiUrl}/tools`;

  private authHeaders(): Record<string, string> {
    const token = this.auth.token();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  getTools(): Observable<Tool[]> {
    return this.http.get<Tool[]>(this.apiUrl, {
      headers: this.authHeaders(),
    });
  }

  executeTool(request: ToolExecuteRequest): Observable<ToolExecuteResponse> {
    return this.http.post<ToolExecuteResponse>(`${this.apiUrl}/execute`, request, {
      headers: this.authHeaders(),
    });
  }

  getPermissions(): Observable<ToolPermission[]> {
    return this.http.get<ToolPermission[]>(`${this.apiUrl}/permissions`, {
      headers: this.authHeaders(),
    });
  }

  setPermission(tool: string, enabled: boolean): Observable<ToolPermission[]> {
    return this.http.put<ToolPermission[]>(
      `${this.apiUrl}/permissions`,
      { tool, enabled },
      { headers: this.authHeaders() },
    );
  }

  getInstalledApps(): Observable<InstalledApp[]> {
    return this.http.get<InstalledApp[]>(`${this.apiUrl}/apps`, {
      headers: this.authHeaders(),
    });
  }

  getAppAllowlist(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/apps/allowlist`, {
      headers: this.authHeaders(),
    });
  }

  setAppAllowlist(apps: string[]): Observable<string[]> {
    return this.http.put<string[]>(
      `${this.apiUrl}/apps/allowlist`,
      { apps },
      { headers: this.authHeaders() },
    );
  }
}
