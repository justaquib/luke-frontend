import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { type Tool, ToolsService } from '../core/tools.service';
import { AppIcon } from '../shared/app-icon';

@Component({
  selector: 'app-slash-menu',
  standalone: true,
  imports: [CommonModule, AppIcon],
  templateUrl: './slash-menu.component.html',
  styleUrl: './slash-menu.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlashMenuComponent {
  private toolsService = inject(ToolsService);

  visible = input(false);
  query = input('');
  tools = input<Tool[]>([]);

  toolSelected = output<Tool>();
  dismissed = output<void>();

  selectedIndex = signal(0);
  menu = viewChild<ElementRef<HTMLDivElement>>('menu');

  filteredTools(): Tool[] {
    const q = this.query().toLowerCase();
    return this.tools().filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    );
  }

  selectTool(tool: Tool): void {
    this.toolSelected.emit(tool);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible()) {
      this.dismissed.emit();
    }
  }

  @HostListener('document:keydown.arrowUp', ['$event'])
  onArrowUp(event: Event): void {
    if (!this.visible()) return;
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    const tools = this.filteredTools();
    if (tools.length === 0) return;
    this.selectedIndex.update((i) => (i - 1 + tools.length) % tools.length);
    this.scrollToSelected();
  }

  @HostListener('document:keydown.arrowDown', ['$event'])
  onArrowDown(event: Event): void {
    if (!this.visible()) return;
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    const tools = this.filteredTools();
    if (tools.length === 0) return;
    this.selectedIndex.update((i) => (i + 1) % tools.length);
    this.scrollToSelected();
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnter(event: Event): void {
    if (!this.visible()) return;
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    const tools = this.filteredTools();
    const selected = tools[this.selectedIndex()];
    if (selected) {
      this.selectTool(selected);
    }
  }

  private scrollToSelected(): void {
    const menuEl = this.menu()?.nativeElement;
    if (!menuEl) return;
    const items = menuEl.querySelectorAll('.slash_menu_item');
    const selected = items[this.selectedIndex()];
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }
}
