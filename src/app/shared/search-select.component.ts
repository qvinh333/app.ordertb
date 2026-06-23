import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  signal
} from '@angular/core';

export interface SearchSelectOption {
  id: number;
  label: string;
  description?: string;
  raw?: unknown;
}

@Component({
  selector: 'app-search-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="search-select" [class.disabled]="disabled" [class.open]="open()">
      <button
        type="button"
        class="trigger"
        [disabled]="disabled"
        (click)="toggle()"
        [attr.aria-expanded]="open()"
        (blur)="handleBlur()"
      >
        <span class="value" [class.placeholder]="!selectedLabel">
          {{ selectedLabel || placeholder }}
        </span>

        <span class="actions">
          @if (allowClear && selectedLabel && !disabled) {
            <span
              class="clear-btn"
              role="button"
              tabindex="0"
              (click)="clearSelection($event)"
              (keydown.enter)="clearSelection($event)"
              aria-label="Xóa"
            >
              ✕
            </span>
          }

          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      @if (open()) {
        <div class="panel" [ngStyle]="panelStyle()" (keydown.escape)="close()">
          @if (showSearch) {
            <div class="panel-search">
              <input
                #searchInput
                type="text"
                [value]="searchTerm()"
                [placeholder]="searchPlaceholder"
                (input)="onSearchInput($any($event.target).value)"
                (keydown.enter)="useTypedValue($event)"
              />
            </div>
          }

          <div class="options" (scroll)="onOptionsScroll($event)">
            @if (loading() && !options.length) {
              <div class="state">Đang tải dữ liệu...</div>
            } @else {
              @for (option of options; track option.id) {
                <button type="button" class="option" (click)="selectOption(option)">
                  <span class="option-label">{{ option.label }}</span>
                  @if (option.description) {
                    <span class="option-description">{{ option.description }}</span>
                  }
                </button>
              }

              @if (!options.length) {
                <div class="state">{{ emptyText }}</div>
              }

              @if (loadingMore()) {
                <div class="state state-subtle">Đang tải thêm...</div>
              } @else if (hasMore() && options.length) {
                <div class="state state-subtle">Cuộn để tải thêm</div>
              }
            }
          </div>

          @if (allowCustomValue && hasTypedValue()) {
            <div class="custom-action-wrap">
              <button type="button" class="custom-action" (click)="useTypedValue()">
                {{ customActionText }}: "{{ typedValue() }}"
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .search-select {
      position: relative;
      width: 100%;
    }

    .search-select.disabled {
      opacity: 0.72;
    }

    .trigger {
      width: 100%;
      min-height: auto;
      border: 1px solid #d4dff0;
      border-radius: 10px;
      background: linear-gradient(180deg, #ffffff, #f4f8ff);
      padding: 0.48rem 0.62rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      color: var(--text);
      cursor: pointer;
      font: inherit;
      text-align: left;
      height: auto;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
      transition:
        border-color 0.16s ease,
        box-shadow 0.16s ease,
        background-color 0.16s ease;
    }

    .trigger:hover {
      border-color: #b7c9e5;
      background: linear-gradient(180deg, #ffffff, #edf4ff);
    }

    .search-select.open .trigger {
      border-color: #7eb5ff;
      box-shadow: 0 0 0 3px rgba(64, 153, 255, 0.18);
    }

    .value {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .placeholder {
      color: #8a9ab8;
    }

    .icon {
      width: 0.95rem;
      height: 0.95rem;
      color: #5f7398;
      flex-shrink: 0;
      transition: transform 0.16s ease;
    }

    .search-select.open .icon {
      transform: rotate(180deg);
    }

    .panel {
      position: fixed;
      z-index: 1350;
      top: 0;
      left: 0;
      width: min(360px, calc(100vw - 16px));
      background: #fff;
      border: 1px solid #d4dff0;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(23, 36, 64, 0.22);
      overflow: hidden;
      animation: panelIn 0.16s ease;
    }

    .panel-search {
      padding: 0.65rem;
      border-bottom: 1px solid #eef2f8;
      background: linear-gradient(180deg, #fbfcff, #f5f9ff);
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .panel-search input {
      width: 100%;
      min-height: 2.15rem;
      border: 1px solid #d4dff0;
      border-radius: 10px;
      padding: 0.42rem 0.58rem;
      background: #fff;
      transition:
        border-color 0.16s ease,
        box-shadow 0.16s ease;
    }

    .panel-search input:focus-visible {
      outline: none;
      border-color: #7eb5ff;
      box-shadow: 0 0 0 3px rgba(64, 153, 255, 0.16);
    }

    .options {
      max-height: 260px;
      overflow: auto;
      padding: 0.5rem;
      display: grid;
      gap: 0.34rem;
      background: linear-gradient(180deg, #fcfdff, #f7faff);
    }

    .options::-webkit-scrollbar {
      width: 8px;
    }

    .options::-webkit-scrollbar-track {
      background: #eef3fb;
      border-radius: 8px;
    }

    .options::-webkit-scrollbar-thumb {
      background: #c7d4e8;
      border-radius: 8px;
      border: 2px solid #eef3fb;
    }

    .option {
      width: 100%;
      border: 1px solid #e3ebf8;
      background: linear-gradient(180deg, #ffffff, #fbfdff);
      border-radius: 11px;
      padding: 0.56rem 0.62rem;
      display: grid;
      gap: 0.16rem;
      text-align: left;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition:
        border-color 0.16s ease,
        background-color 0.16s ease,
        transform 0.16s ease;
    }

    .option::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.3rem;
      bottom: 0.3rem;
      width: 3px;
      border-radius: 4px;
      background: linear-gradient(180deg, #6ea8ff, #4f8eff);
      opacity: 0;
      transform: scaleY(0.35);
      transition:
        opacity 0.16s ease,
        transform 0.16s ease;
    }

    .option:hover {
      background: linear-gradient(180deg, #f7fbff, #edf4ff);
      border-color: #c6d9fb;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(82, 132, 201, 0.12);
    }

    .option:hover::before,
    .option:focus-visible::before {
      opacity: 1;
      transform: scaleY(1);
    }

    .option:active {
      transform: translateY(0);
    }

    .option:focus-visible {
      outline: none;
      border-color: #79adfb;
      box-shadow:
        0 0 0 2px rgba(64, 153, 255, 0.16),
        0 6px 16px rgba(82, 132, 201, 0.12);
    }

    .option-label {
      font-size: 0.86rem;
      font-weight: 600;
      color: #29415f;
      line-height: 1.22;
    }

    .option-description {
      font-size: 0.77rem;
      color: #6b7f9b;
      line-height: 1.3;
    }

    .state {
      padding: 0.66rem 0.58rem;
      text-align: center;
      font-size: 0.8rem;
      color: #5f7491;
      background: #f4f8ff;
      border: 1px dashed #cfdef4;
      border-radius: 10px;
    }

    .state-subtle {
      padding-top: 0.2rem;
    }

    .custom-action-wrap {
      border-top: 1px solid #eef2f8;
      padding: 0.5rem;
      background: linear-gradient(180deg, #fbfcff, #f6f9ff);
    }

    @keyframes panelIn {
      from {
        opacity: 0;
        transform: translateY(6px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .custom-action {
      width: 100%;
      border: 1px solid #cfe0ff;
      border-radius: 9px;
      padding: 0.44rem 0.52rem;
      background: #f0f7ff;
      color: #1d5fbf;
      font-size: 0.8rem;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
    }

    .custom-action:hover {
      border-color: #b8d8ff;
      background: #e9f3ff;
    }
  `,
})
export class SearchSelectComponent implements OnDestroy {
  @Input() placeholder = 'Chọn dữ liệu';
  @Input() searchPlaceholder = 'Tìm kiếm';
  @Input() emptyText = 'Không có dữ liệu';
  @Input() selectedLabel = '';
  @Input() options: SearchSelectOption[] = [];
  @Input() disabled = false;
  @Input() allowCustomValue = false;
  @Input() customActionText = 'Dùng nội dung đã nhập';
  @Input() loading = signal(false);
  @Input() loadingMore = signal(false);
  @Input() hasMore = signal(false);
  @Input() allowClear = false;
  @Input() showSearch = true;
  @Input() panelWidth = 360;
  @Output() cleared = new EventEmitter<void>();

  @Output() opened = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() loadMore = new EventEmitter<void>();
  @Output() optionSelected = new EventEmitter<SearchSelectOption>();
  @Output() customValueSelected = new EventEmitter<string>();

  readonly open = signal(false);
  readonly searchTerm = signal('');
  readonly panelStyle = signal<Record<string, string>>({});

  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngOnDestroy(): void {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
  }

  handleBlur(): void {
    // keep method for parity with shared form controls and to avoid browser focus quirks
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (!target) {
      return;
    }

    if (!this.elementRef.nativeElement.contains(target)) {
      this.close(true);
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updatePanelPosition();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updatePanelPosition();
  }

  toggle(): void {
    if (this.disabled) {
      return;
    }

    if (this.open()) {
      this.close(true);
      return;
    }

    this.searchTerm.set('');
    this.open.set(true);
    this.opened.emit();
    this.searchChange.emit('');
    setTimeout(() => {
      this.updatePanelPosition();
      if (this.showSearch) {
        const searchInput = this.elementRef.nativeElement.querySelector(
          '.panel-search input',
        ) as HTMLInputElement | null;
        searchInput?.focus();
      }
    }, 0);
  }

  close(commitTypedValue = false): void {
    if (commitTypedValue) {
      this.emitTypedValue();
    }

    this.open.set(false);
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }

    this.searchDebounce = setTimeout(() => {
      this.searchChange.emit(value.trim());
    }, 250);
  }

  onOptionsScroll(event: Event): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (remaining <= 28) {
      this.loadMore.emit();
    }
  }

  selectOption(option: SearchSelectOption): void {
    this.optionSelected.emit(option);
    this.close(false);
  }

  useTypedValue(event?: Event): void {
    event?.preventDefault();
    this.emitTypedValue();
    this.close(false);
  }

  typedValue(): string {
    return this.searchTerm().trim();
  }

  hasTypedValue(): boolean {
    return this.typedValue().length > 0;
  }

  private emitTypedValue(): void {
    if (!this.allowCustomValue) {
      return;
    }

    const value = this.searchTerm().trim();
    if (!value) {
      return;
    }

    this.customValueSelected.emit(value);
  }

  private updatePanelPosition(): void {
    if (!this.open()) {
      return;
    }

    const trigger = this.elementRef.nativeElement.querySelector('.trigger') as HTMLElement | null;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const panel = this.elementRef.nativeElement.querySelector('.panel') as HTMLElement | null;
    const panelWidth = Math.min(Math.max(rect.width, this.panelWidth), window.innerWidth - 16);
    const panelHeight = panel?.offsetHeight || 320;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const left = Math.max(8, Math.min(rect.left, viewportWidth - panelWidth - 8));
    const placeAbove =
      rect.bottom + panelHeight + 8 > viewportHeight && rect.top - panelHeight - 8 > 8;
    const top = placeAbove
      ? Math.max(8, rect.top - panelHeight - 6)
      : Math.min(viewportHeight - panelHeight - 8, rect.bottom + 6);

    this.panelStyle.set({
      top: `${top}px`,
      left: `${left}px`,
      width: `${panelWidth}px`,
    });
  }

  clearSelection(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.searchTerm.set('');
    this.cleared.emit();
  }
}
