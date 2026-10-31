import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal, effect } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import {
  type VoiceModuleId,
  type VoiceInfo,
  loadVoiceEnabled,
  saveVoiceEnabled,
  loadActiveVoice,
  saveActiveVoice,
  loadVoiceModule,
  saveVoiceModule,
} from './voice-models';

export interface VoiceStatus {
  available: boolean;
  activeModule: string | null;
  ttsModule: string | null;
  sttModule: string | null;
  voices: VoiceInfo[];
  modules: { name: string; ttsModule: string; sttModule: string; description: string }[];
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiUrl;

  private readonly _enabled = signal(loadVoiceEnabled());
  private readonly _activeVoice = signal<string | null>(loadActiveVoice());
  private readonly _activeModule = signal<VoiceModuleId>(loadVoiceModule());
  private readonly _status = signal<VoiceStatus | null>(null);
  private readonly _isRecording = signal(false);
  private readonly _isSpeaking = signal(false);

  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private playbackQueue: string[] = [];
  private isProcessingQueue = false;

  readonly enabled = this._enabled.asReadonly();
  readonly activeVoice = this._activeVoice.asReadonly();
  readonly activeModule = this._activeModule.asReadonly();
  readonly status = this._status.asReadonly();
  readonly isRecording = this._isRecording.asReadonly();
  readonly isSpeaking = this._isSpeaking.asReadonly();
  readonly available = (): boolean => this._status()?.available ?? false;
  private readonly _currentlyPlayingText = signal<string | null>(null);
  readonly currentlyPlayingText = this._currentlyPlayingText.asReadonly();

  constructor() {
    effect(() => saveVoiceEnabled(this._enabled()));
    effect(() => {
      const voice = this._activeVoice();
      if (voice) saveActiveVoice(voice);
    });
    effect(() => saveVoiceModule(this._activeModule()));
  }

  async loadStatus(): Promise<void> {
    try {
      const status = await firstValueFrom(this.fetchStatus());
      this._status.set(status);
      if (status.activeModule) {
        this._activeModule.set(status.activeModule as VoiceModuleId);
      }
      if (status.voices.length > 0 && !this._activeVoice()) {
        this._activeVoice.set(status.voices[0].id);
      }
    } catch {
      this._status.set({
        available: false,
        activeModule: null,
        ttsModule: null,
        sttModule: null,
        voices: [],
        modules: [],
        error: 'Could not load voice status.',
      });
    }
  }

  toggle(): void {
    this._enabled.update((v) => !v);
    if (!this._enabled()) {
      this.stopSpeaking();
    }
  }

  setEnabled(on: boolean): void {
    this._enabled.set(on);
    if (!on) {
      this.stopSpeaking();
    }
  }

  setActiveVoice(voiceId: string): void {
    this._activeVoice.set(voiceId);
  }

  async setModule(moduleId: VoiceModuleId): Promise<void> {
    try {
      await firstValueFrom(this.updateModule(moduleId));
      this._activeModule.set(moduleId);
      await this.loadStatus();
    } catch {
      // The status reload will show the error.
    }
  }

  async speak(text: string): Promise<void> {
    if (!text.trim() || !this._enabled()) return;

    // If already speaking this text, pause it
    if (this._isSpeaking() && this._currentlyPlayingText() === text) {
      this.pauseSpeaking();
      return;
    }

    // Stop current playback and clear queue
    this.stopSpeaking();
    this.playbackQueue = [];

    // Add to queue and process
    this.playbackQueue.push(text);
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.playbackQueue.length === 0) return;

    this.isProcessingQueue = true;
    while (this.playbackQueue.length > 0) {
      const text = this.playbackQueue.shift()!;
      this._currentlyPlayingText.set(text);
      this._isSpeaking.set(true);
      try {
        const wavBytes = await firstValueFrom(this.synthesize(text, this._activeVoice()));
        await this.playWav(wavBytes);
      } catch {
        // Playback failed
      } finally {
        this._isSpeaking.set(false);
        this._currentlyPlayingText.set(null);
      }
    }
    this.isProcessingQueue = false;
  }

  pauseSpeaking(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
      } catch {
        // Already stopped
      }
    }
    this._isSpeaking.set(false);
  }

  resumeSpeaking(): void {
    if (this.currentAudio) {
      void this.currentAudio.play();
      this._isSpeaking.set(true);
    }
  }

  stopSpeaking(): void {
    this.playbackQueue = [];
    this.isProcessingQueue = false;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
      } catch {
        // Already stopped
      }
      this.currentAudioSource = null;
    }
    this._isSpeaking.set(false);
    this._currentlyPlayingText.set(null);
  }

  async listen(): Promise<string> {
    if (this._isRecording()) return '';
    this._isRecording.set(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      const stopped = new Promise<void>((resolve) => {
        this.mediaRecorder!.onstop = () => resolve();
      });
      this.mediaRecorder.start();
      // Record for up to 10 seconds, or until the user stops.
      setTimeout(() => {
        if (this.mediaRecorder?.state === 'recording') {
          this.mediaRecorder.stop();
        }
      }, 10000);
      // Wait for the user to release the button or the timeout.
      await stopped;
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const text = await firstValueFrom(this.transcribe(blob));
      return text;
    } catch {
      return '';
    } finally {
      this._isRecording.set(false);
      this.mediaRecorder = null;
    }
  }

  stopListening(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  private fetchStatus(): Observable<VoiceStatus> {
    return this.http.get<VoiceStatus>(`${this.base}/voice/status`, {
      headers: this.authHeaders(),
    });
  }

  private synthesize(text: string, voice: string | null): Observable<Blob> {
    return this.http.post(
      `${this.base}/voice/tts`,
      { text, voice },
      { headers: this.authHeaders(), responseType: 'blob' },
    );
  }

  private transcribe(audio: Blob): Observable<string> {
    const form = new FormData();
    form.append('audio', audio, 'recording.webm');
    return new Observable((subscriber) => {
      this.http
        .post<{ text: string }>(`${this.base}/voice/stt`, form, {
          headers: this.authHeaders(),
        })
        .subscribe({
          next: (response) => {
            subscriber.next(response.text);
            subscriber.complete();
          },
          error: (err) => subscriber.error(err),
        });
    });
  }

  private updateModule(moduleId: string): Observable<VoiceStatus> {
    return this.http.put<VoiceStatus>(
      `${this.base}/voice/module`,
      { name: moduleId },
      { headers: this.authHeaders() },
    );
  }

  private authHeaders(): Record<string, string> {
    const token = this.auth.token();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async playWav(wavBytes: Blob): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    const arrayBuffer = await wavBytes.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    this.currentAudioSource = source;

    const audio = new Audio();
    audio.src = URL.createObjectURL(wavBytes);
    this.currentAudio = audio;

    return new Promise<void>((resolve, reject) => {
      source.onended = () => {
        this._isSpeaking.set(false);
        this._currentlyPlayingText.set(null);
        this.currentAudio = null;
        this.currentAudioSource = null;
        resolve();
      };
      audio.onended = () => {
        this._isSpeaking.set(false);
        this._currentlyPlayingText.set(null);
        this.currentAudio = null;
        this.currentAudioSource = null;
        resolve();
      };
      audio.onerror = () => reject(new Error('Audio playback failed'));
      source.start();
    });
  }
}
