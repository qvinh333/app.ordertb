import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  Input,
  forwardRef,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface CalendarCell {
  date: Date;
  currentMonth: boolean;
}

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true
    }
  ],
  template: `
    <div class="dp" [class.disabled]="disabled">
      <button type="button" class="dp-input" [disabled]="disabled" (click)="toggle()" (blur)="handleBlur()">
        <span [class.placeholder]="!value">{{ displayValue() || placeholder }}</span>
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </button>

      @if (open()) {
        <div class="panel" role="dialog" aria-label="Date picker" [ngStyle]="panelStyle()">
          <div class="panel-header">
            <button type="button" class="nav" (click)="changeMonth(-1)">‹</button>
            <strong>{{ monthLabel() }}</strong>
            <button type="button" class="nav" (click)="changeMonth(1)">›</button>
          </div>

          <div class="weekdays">
            <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
          </div>

          <div class="grid">
            @for (cell of calendarCells(); track cell.date.getTime()) {
              <button
                type="button"
                class="day"
                [class.muted]="!cell.currentMonth"
                [class.selected]="isSelected(cell.date)"
                [class.today]="isToday(cell.date)"
                (click)="selectDate(cell.date)"
              >
                {{ cell.date.getDate() }}
              </button>
            }
          </div>

          <div class="panel-actions">
            <button type="button" (click)="pickToday()">Hôm nay</button>
            <button type="button" (click)="clear()">Xóa</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .dp {
      position: relative;
      width: 100%;
    }

    .dp.disabled {
      opacity: 0.72;
    }

    .dp-input {
      width: 100%;
      min-height: 2.25rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: #fff;
      padding: 0.45rem 0.62rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--text);
      cursor: pointer;
      font: inherit;
      text-align: left;
    }

    .dp-input:hover {
      border-color: #b9cce9;
      background: #fafdff;
    }

    .placeholder {
      color: #8a9ab8;
    }

    .icon {
      width: 0.95rem;
      height: 0.95rem;
      color: #5f7398;
      flex-shrink: 0;
      margin-left: 0.55rem;
    }

    .panel {
      position: fixed;
      z-index: 1300;
      top: 0;
      left: 0;
      width: 260px;
      background: #fff;
      border: 1px solid #d8e2f0;
      border-radius: 12px;
      box-shadow: 0 16px 36px rgba(23, 36, 64, 0.18);
      padding: 0.6rem;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.45rem;
    }

    .panel-header strong {
      font-size: 0.86rem;
      color: #2e4368;
    }

    .nav {
      border: 1px solid #d7e3f3;
      background: #f3f8ff;
      border-radius: 8px;
      width: 1.7rem;
      height: 1.7rem;
      display: grid;
      place-items: center;
      cursor: pointer;
      color: #35507a;
      padding: 0;
    }

    .weekdays,
    .grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.2rem;
    }

    .weekdays {
      margin-bottom: 0.2rem;
    }

    .weekdays span {
      text-align: center;
      font-size: 0.74rem;
      color: #7384a3;
      font-weight: 600;
      padding: 0.12rem 0;
    }

    .day {
      border: 1px solid transparent;
      background: #fff;
      border-radius: 8px;
      height: 1.8rem;
      font-size: 0.78rem;
      color: #2f425f;
      cursor: pointer;
      padding: 0;
    }

    .day:hover {
      background: #eef6ff;
      border-color: #d4e5ff;
    }

    .day.muted {
      color: #a8b4c8;
    }

    .day.today {
      border-color: #c6dfff;
    }

    .day.selected {
      background: linear-gradient(90deg, var(--primary), var(--primary-600));
      color: #fff;
      border-color: transparent;
    }

    .panel-actions {
      display: flex;
      justify-content: space-between;
      gap: 0.4rem;
      margin-top: 0.45rem;
    }

    .panel-actions button {
      border: 1px solid #d7e3f3;
      background: #f8fbff;
      border-radius: 8px;
      padding: 0.28rem 0.5rem;
      font-size: 0.75rem;
      cursor: pointer;
      color: #35507a;
    }
  `
})
export class DatePickerComponent implements ControlValueAccessor {
  @Input() placeholder = 'Chọn ngày';

  readonly open = signal(false);
  readonly monthCursor = signal(startOfMonth(new Date()));
  readonly panelStyle = signal<Record<string, string>>({});

  value = '';
  disabled = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  writeValue(value: string | null): void {
    this.value = normalizeDateString(value);
    if (this.value) {
      this.monthCursor.set(startOfMonth(parseDateString(this.value) ?? new Date()));
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  handleBlur(): void {
    this.onTouched();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (!target) {
      return;
    }

    if (!this.elementRef.nativeElement.contains(target)) {
      this.open.set(false);
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

    this.open.update((opened) => !opened);
    if (this.open()) {
      setTimeout(() => this.updatePanelPosition(), 0);
    }
  }

  displayValue(): string {
    const parsed = parseDateString(this.value);
    if (!parsed) {
      return '';
    }

    const dd = String(parsed.getDate()).padStart(2, '0');
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const yyyy = parsed.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  monthLabel(): string {
    const date = this.monthCursor();
    return `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  changeMonth(step: number): void {
    const cursor = this.monthCursor();
    this.monthCursor.set(new Date(cursor.getFullYear(), cursor.getMonth() + step, 1));
  }

  calendarCells(): CalendarCell[] {
    const cursor = this.monthCursor();
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startDay = (first.getDay() + 6) % 7;
    const startDate = new Date(first);
    startDate.setDate(first.getDate() - startDay);

    const cells: CalendarCell[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      cells.push({
        date,
        currentMonth: date.getMonth() === cursor.getMonth() && date.getFullYear() === cursor.getFullYear()
      });
    }

    return cells;
  }

  selectDate(date: Date): void {
    const next = toDateString(date);
    this.value = next;
    this.onChange(next);
    this.onTouched();
    this.open.set(false);
  }

  clear(): void {
    this.value = '';
    this.onChange('');
    this.onTouched();
    this.open.set(false);
  }

  pickToday(): void {
    const today = new Date();
    this.monthCursor.set(startOfMonth(today));
    this.selectDate(today);
  }

  isSelected(date: Date): boolean {
    return this.value === toDateString(date);
  }

  isToday(date: Date): boolean {
    return toDateString(new Date()) === toDateString(date);
  }

  private updatePanelPosition(): void {
    if (!this.open()) {
      return;
    }

    const trigger = this.elementRef.nativeElement.querySelector('.dp-input') as HTMLElement | null;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const panelWidth = 260;
    const panelHeight = 290;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const left = Math.max(8, Math.min(rect.left, viewportWidth - panelWidth - 8));
    const placeAbove = rect.bottom + panelHeight + 8 > viewportHeight && rect.top - panelHeight - 8 > 8;
    const top = placeAbove
      ? Math.max(8, rect.top - panelHeight - 6)
      : Math.min(viewportHeight - panelHeight - 8, rect.bottom + 6);

    this.panelStyle.set({
      top: `${top}px`,
      left: `${left}px`
    });
  }
}

function normalizeDateString(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const direct = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) {
    return direct;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return toDateString(parsed);
}

function parseDateString(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [y, m, d] = value.split('-').map((x) => Number(x));
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

