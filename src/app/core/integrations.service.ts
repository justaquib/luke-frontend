import { Injectable, signal, effect } from '@angular/core';

const KEY = 'assistance.integrations.v1';
const LOC_KEY = 'assistance.location.v1';

interface Integrations {
  weather: boolean;
  wiki: boolean;
}

interface LocationCache {
  lat: number;
  lon: number;
  updatedAt: number;
}

const DEFAULTS: Integrations = { weather: false, wiki: false };
const LOC_TTL_MS = 1000 * 60 * 60 * 12;

@Injectable({ providedIn: 'root' })
export class IntegrationsService {
  private readonly _state = signal<Integrations>(this.read());
  readonly state = this._state.asReadonly();
  readonly weatherEnabled = () => this._state().weather;
  readonly wikiEnabled = () => this._state().wiki;

  private readonly _location = signal<LocationCache | null>(this.readLocation());

  constructor() {
    effect(() => this.write(this._state()));
  }

  setWeather(on: boolean) {
    this._state.update((s) => ({ ...s, weather: on }));
  }

  setWiki(on: boolean) {
    this._state.update((s) => ({ ...s, wiki: on }));
  }

  location(): LocationCache | null {
    const cached = this._location();
    if (cached && Date.now() - cached.updatedAt < LOC_TTL_MS) return cached;
    return null;
  }

  async refreshLocation(): Promise<LocationCache | null> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return null;
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: LocationCache = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            updatedAt: Date.now(),
          };
          try {
            localStorage.setItem(LOC_KEY, JSON.stringify(loc));
          } catch {}
          this._location.set(loc);
          resolve(loc);
        },
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 6000, maximumAge: LOC_TTL_MS },
      );
    });
  }

  private read(): Integrations {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw) as Partial<Integrations>;
      return {
        weather: !!parsed.weather,
        wiki: !!parsed.wiki,
      };
    } catch {
      return { ...DEFAULTS };
    }
  }

  private write(state: Integrations) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }

  private readLocation(): LocationCache | null {
    try {
      const raw = localStorage.getItem(LOC_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as LocationCache;
    } catch {
      return null;
    }
  }
}