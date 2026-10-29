import { Pipe, inject, type PipeTransform } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';

@Pipe({ name: 'safeUrl', standalone: true })
export class SafeUrlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(value);
  }
}
