/** The web evidence settings and the snapshots the backend keeps. */

export interface WebProviderChoice {
  id: string;
  name: string;
}

export interface WebPolicyView {
  enabled: boolean;
  provider: string;
  provider_name: string;
  endpoint: string;
  allowlist: string[];
  ttl_hours: number;
  min_score: number;
  results: number;
  providers: WebProviderChoice[];
  max_sources: number;
}

/** One allowlisted source and the last page read from it. */
export interface WebSourceView {
  id: number;
  url: string;
  domain: string;
  enabled: boolean;
  title: string;
  status: string;
  checked_at: string | null;
}

export interface WebCounts {
  indexed: number;
  candidate: number;
  superseded: number;
}

export interface WebStatus {
  policy: WebPolicyView;
  sources: WebSourceView[];
  counts: WebCounts;
}

/** The measured result of one refresh run. */
export interface WebRefreshReport {
  checked: number;
  changed: number;
  unchanged: number;
  failed: number;
  expired: number;
}

export interface WebRefreshResult {
  report: WebRefreshReport;
  sources: WebSourceView[];
}

/** The policy fields the backend accepts. */
export interface WebSettingsBody {
  enabled: boolean;
  provider: string;
  endpoint: string;
  allowlist: string[];
  ttl_hours: number;
  min_score: number;
  results: number;
}
