import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { TokenizerReport } from '../core/api/language-brain.types';

/**
 * The tokenizer a checkpoint was trained with. A BPE model counts pieces and a
 * word model counts words, and the card says which one it is reading. A
 * missing artifact shows the error the backend reported, never a substitute.
 */
@Component({
  selector: 'app-brain-tokenizer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brain-tokenizer.html',
  styleUrl: './brain-tokenizer.css',
})
export class BrainTokenizer {
  readonly tokenizer = input<TokenizerReport | null>(null);
  readonly retry = output<void>();

  protected readonly kind = computed(() => {
    const kind = this.tokenizer()?.kind;
    if (!kind) return 'not recorded';
    return kind === 'bpe' ? 'BPE (byte-level)' : 'word';
  });

  protected readonly unit = computed(() => (this.tokenizer()?.kind === 'bpe' ? 'pieces' : 'words'));

  protected readonly stamp = computed(() => {
    const tokenizer = this.tokenizer();
    if (!tokenizer?.kind) return 'no checkpoint';
    if (tokenizer.error) return 'artifact missing';
    return tokenizer.kind === 'bpe' ? 'artifact verified' : 'inside the checkpoint';
  });

  protected readonly characters = computed(() => {
    const value = this.tokenizer()?.corpus?.characters;
    if (!value) return 'Not measured yet';
    return value.toLocaleString('en-US');
  });

  protected readonly perCharacter = computed(() => {
    const value = this.tokenizer()?.tokens_per_character;
    return value === null || value === undefined ? 'Not measured yet' : value.toFixed(4);
  });

  protected readonly artifactSize = computed(() => {
    const tokenizer = this.tokenizer();
    if (tokenizer?.kind !== 'bpe') return 'No separate file';
    const bytes = tokenizer.artifact_bytes;
    if (!bytes) return 'Not on disk';
    return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
  });

  protected readonly selected = computed(() => {
    const kind = this.tokenizer()?.default_kind;
    return kind === 'bpe' ? 'BPE (byte-level)' : 'Word (measured baseline)';
  });
}
