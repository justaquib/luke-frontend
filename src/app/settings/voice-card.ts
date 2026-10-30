import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject,
  type OnInit,
} from '@angular/core';
import { VoiceService } from '../core/voice.service';
import { type VoiceModuleId, VOICE_MODULE_OPTIONS, findVoiceModule } from '../core/voice-models';
import { AppCardInfo } from '../shared/app-card-info';
import { UiService } from '../shared/ui.service';

/**
 * The voice module settings: which TTS/STT engines Luke uses, and whether
 * voice mode is on. The choices are persisted in browser storage.
 */
@Component({
  selector: 'app-voice-card',
  standalone: true,
  imports: [AppCardInfo],
  templateUrl: './voice-card.html',
  styleUrls: ['./voice-card.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoiceCard implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ui = inject(UiService);
  protected readonly voice = inject(VoiceService);

  protected readonly moduleOptions = VOICE_MODULE_OPTIONS;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    void this.voice.loadStatus();
  }

  protected toggleVoiceMode(on: boolean): void {
    this.voice.setEnabled(on);
    this.ui.info(on ? 'Voice mode on.' : 'Voice mode off.');
  }

  protected chooseVoice(voiceId: string): void {
    this.voice.setActiveVoice(voiceId);
  }

  protected async chooseModule(moduleId: VoiceModuleId): Promise<void> {
    await this.voice.setModule(moduleId);
    const option = findVoiceModule(moduleId);
    this.ui.info(option ? `Switched to ${option.label}.` : 'Voice module changed.');
  }

  protected statusLine(): string {
    const status = this.voice.status();
    if (!status) return 'Loading…';
    if (!status.available) return status.error ?? 'Voice module not available.';
    const tts = status.ttsModule ?? '—';
    const stt = status.sttModule ?? '—';
    return `${tts} · ${stt}`;
  }
}
