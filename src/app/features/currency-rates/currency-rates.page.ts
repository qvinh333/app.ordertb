import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin, timeout } from 'rxjs';
import { CurrencyRatesService } from '../../core/currency-rates.service';
import { CurrencyRate, CurrencyRateCreateRequest } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { ConfirmModalComponent } from '../../shared/confirm-modal.component';

@Component({
  selector: 'app-currency-rates-page',
  imports: [ReactiveFormsModule, DecimalPipe, DatePipe, ConfirmModalComponent],
  template: `
    <section class="currency-page">
      <div class="summary-panel">
        <div>
          <h2>Quản lý giá tệ</h2>
          <p>Tỷ giá được lưu theo tài khoản và giữ lịch sử mỗi lần thay đổi.</p>
        </div>

        <div class="latest-card">
          <span class="latest-label">Tỷ giá hiện tại</span>
          <strong>{{ latestRate()?.rate !== undefined ? ((latestRate()?.rate | number:'1.0-4') + ' VNĐ') : '-' }}</strong>
          <span class="latest-time">{{ latestRate()?.createdAt ? (latestRate()?.createdAt | date:'dd/MM/yyyy HH:mm') : 'Chưa cấu hình' }}</span>
        </div>
      </div>

      <div class="content-grid">
        <section class="card form-card">
          <div class="section-title">
            <span class="title-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/></svg>
            </span>
            <h3>Cấu hình tỷ giá mới</h3>
          </div>

          <form [formGroup]="form" (ngSubmit)="requestSave()" class="rate-form">
            <label>
              Tỷ giá (VNĐ) *
              <span class="input-with-unit">
                <input type="number" min="0" step="0.0001" formControlName="rate" placeholder="Ví dụ: 3500" />
                <span>VNĐ</span>
              </span>
            </label>

            <label>
              Ghi chú
              <textarea rows="4" formControlName="note" placeholder="Lý do thay đổi hoặc nguồn tham chiếu"></textarea>
            </label>

            @if (formError()) {
              <div class="error">{{ formError() }}</div>
            }

            <button type="button" class="btn-primary" [disabled]="saving()" (click)="requestSave()">
              <span class="btn-content">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>
                <span>{{ saving() ? 'Đang lưu...' : 'Lưu tỷ giá' }}</span>
              </span>
            </button>
          </form>
        </section>

        <section class="card history-card">
          <div class="history-header">
            <div class="section-title">
              <span class="title-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l3 2"/></svg>
              </span>
              <h3>Lịch sử tỷ giá</h3>
            </div>

            <button type="button" class="btn-ghost" (click)="load()" [disabled]="loading()">
              <span class="btn-content">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M16 8h5V3"/></svg>
                <span>Tải lại</span>
              </span>
            </button>
          </div>

          @if (loading()) {
            <div class="page-loading" aria-live="polite">
              <span class="page-loading-spinner" aria-hidden="true"></span>
              <span>Đang tải dữ liệu...</span>
            </div>
          }

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tỷ giá (VNĐ)</th>
                  <th>Ghi chú</th>
                  <th>Ngày cấu hình</th>
                </tr>
              </thead>
              <tbody>
                @for (rate of visibleRates(); track rate.id; let rowIndex = $index) {
                  <tr>
                    <td data-label="STT">{{ (currentPage() - 1) * pageSize() + rowIndex + 1 }}</td>
                    <td data-label="Tỷ giá" class="rate-value">{{ rate.rate | number:'1.0-4' }} VNĐ</td>
                    <td data-label="Ghi chú">{{ rate.note || '-' }}</td>
                    <td data-label="Ngày cấu hình">{{ rate.createdAt ? (rate.createdAt | date:'dd/MM/yyyy HH:mm') : '-' }}</td>
                  </tr>
                }
                @if (!visibleRates().length) {
                  <tr class="table-empty-row">
                    <td colspan="4">Chưa có lịch sử tỷ giá.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="pager">
            <div class="pager-meta">
              <span class="paging-summary">{{ pagingSummary() }}</span>
              <label class="page-size">
                Hiển thị
                <select [value]="pageSize()" (change)="onPageSizeChange($any($event.target).value)">
                  @for (size of [10, 20, 50]; track size) {
                    <option [value]="size">{{ size }}</option>
                  }
                </select>
                / trang
              </label>
            </div>
            <div class="pager-controls">
              <button type="button" class="pager-btn" (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() <= 1">Trước</button>
              <span class="pager-current">Trang {{ currentPage() }} / {{ totalPages() }}</span>
              <button type="button" class="pager-btn" (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() >= totalPages()">Sau</button>
            </div>
          </div>
        </section>
      </div>
    </section>

    <app-confirm-modal
      [open]="showSaveConfirm()"
      [loading]="saving()"
      title="Xác nhận lưu tỷ giá"
      message="Bạn có chắc chắn muốn cấu hình tỷ giá mới? Thay đổi này sẽ được lưu vào lịch sử."
      (cancel)="showSaveConfirm.set(false)"
      (confirm)="confirmSave()"
    />
  `,
  styles: `
    .currency-page {
      display: grid;
      gap: 1rem;
    }

    .summary-panel {
      display: flex;
      justify-content: space-between;
      align-items: stretch;
      gap: 1rem;
      border: 1px solid #25304d;
      background: linear-gradient(180deg, #26314d 0%, #1f2940 100%);
      border-radius: var(--radius-md);
      color: #fff;
      padding: 1rem;
      box-shadow: var(--shadow-md);
    }

    h2,
    h3,
    p {
      margin: 0;
    }

    h2 {
      font-size: 1.1rem;
      font-weight: 700;
    }

    p {
      margin-top: 0.35rem;
      color: #d8e2ff;
      font-size: 0.86rem;
    }

    .latest-card {
      min-width: 220px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.09);
      padding: 0.75rem 0.85rem;
      display: grid;
      gap: 0.18rem;
      justify-items: end;
    }

    .latest-label,
    .latest-time {
      color: #d8e2ff;
      font-size: 0.78rem;
      font-weight: 600;
    }

    .latest-card strong {
      font-size: 1.48rem;
      line-height: 1.2;
    }

    .content-grid {
      display: grid;
      grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.4fr);
      gap: 1rem;
      align-items: start;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      padding: 1rem;
    }

    .section-title,
    .history-header {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }

    .history-header {
      justify-content: space-between;
      margin-bottom: 0.9rem;
    }

    .section-title {
      min-width: 0;
    }

    h3 {
      font-size: 1rem;
      font-weight: 700;
    }

    .title-icon {
      width: 1.8rem;
      height: 1.8rem;
      border-radius: 9px;
      background: #eef5ff;
      color: #26314d;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .title-icon svg {
      width: 1rem;
      height: 1rem;
    }

    .rate-form {
      display: grid;
      gap: 0.75rem;
      margin-top: 0.9rem;
    }

    label {
      display: grid;
      gap: 0.32rem;
      font-size: 0.86rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    input,
    select,
    button,
    textarea {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0.48rem 0.62rem;
      background: #fff;
    }

    .input-with-unit {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #fff;
      overflow: hidden;
    }

    .input-with-unit:focus-within {
      border-color: #87bfff;
      box-shadow: 0 0 0 3px rgba(64, 153, 255, 0.18);
    }

    .input-with-unit input {
      border: 0;
      border-radius: 0;
      box-shadow: none;
      min-width: 0;
    }

    .input-with-unit input:focus {
      box-shadow: none;
    }

    .input-with-unit span {
      padding: 0 0.68rem;
      color: #405372;
      font-size: 0.82rem;
      font-weight: 700;
      border-left: 1px solid #edf0f6;
      align-self: stretch;
      display: grid;
      place-items: center;
      background: #f5f8fd;
    }

    .btn-primary {
      background: linear-gradient(90deg, var(--primary), var(--primary-600));
      color: #fff;
      border: 1px solid transparent;
      border-radius: 10px;
      padding: 0.52rem 0.78rem;
      cursor: pointer;
      font-weight: 600;
      box-shadow: 0 8px 18px rgba(64, 153, 255, 0.24);
      justify-self: start;
    }

    .btn-primary:disabled,
    .btn-ghost:disabled {
      cursor: not-allowed;
      opacity: 0.62;
      transform: none;
    }

    .btn-ghost {
      border-color: #cfe0ff;
      color: #1d5fbf;
      background: #f0f7ff;
      cursor: pointer;
      font-weight: 600;
    }

    .error {
      color: #b42318;
      background: #fef3f2;
      border: 1px solid #fecdca;
      border-radius: 10px;
      padding: 0.58rem 0.68rem;
      font-size: 0.86rem;
    }

    .page-loading {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.44rem 0.64rem;
      border: 1px solid #d7e3f5;
      border-radius: 999px;
      background: #f5f9ff;
      color: #35507a;
      font-size: 0.82rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }

    .page-loading-spinner {
      width: 0.9rem;
      height: 0.9rem;
      border-radius: 50%;
      border: 2px solid #c7dbfa;
      border-top-color: #3f8cff;
      animation: spin 0.8s linear infinite;
    }

    .table-wrap {
      overflow: auto;
      border: 1px solid #edf0f6;
      border-radius: 12px;
      background: #fff;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 640px;
    }

    th,
    td {
      border-bottom: 1px solid #eef2f8;
      padding: 0.62rem 0.48rem;
      text-align: left;
      font-size: 0.88rem;
      vertical-align: top;
    }

    th {
      color: #d8e2ff;
      font-weight: 600;
      background: linear-gradient(180deg, #26314d 0%, #1f2940 100%);
    }

    tbody tr:hover td {
      background: #fafcff;
    }

    .rate-value {
      color: #1f2940;
      font-weight: 700;
      white-space: nowrap;
    }

    .pager {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.6rem;
      margin-top: 0.72rem;
      color: var(--text-muted);
      font-size: 0.88rem;
      flex-wrap: wrap;
      border-top: 1px solid #ecf1f8;
      padding-top: 0.68rem;
    }

    .pager-meta,
    .pager-controls {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      min-width: 0;
    }

    .paging-summary,
    .pager-current {
      padding: 0.34rem 0.6rem;
      border-radius: 999px;
      background: #f5f8fd;
      border: 1px solid #dce7f6;
      color: #405372;
      font-weight: 600;
      white-space: nowrap;
    }

    .pager-btn {
      background: #fff;
      border: 1px solid #d6e1f2;
      border-radius: 10px;
      padding: 0.4rem 0.72rem;
      font-weight: 600;
      cursor: pointer;
    }

    .pager-btn:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .page-size {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 1080px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .summary-panel {
        flex-direction: column;
      }

      .latest-card {
        justify-items: start;
        min-width: 0;
      }

      .history-header {
        align-items: flex-start;
        flex-direction: column;
      }

      .table-wrap {
        border: none;
        background: transparent;
      }

      table {
        min-width: 0;
        border-collapse: separate;
      }

      thead {
        display: none;
      }

      tbody {
        display: grid;
        gap: 0.6rem;
      }

      tbody tr {
        display: block;
        border: 1px solid #e6edf7;
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 4px 14px rgba(20, 39, 70, 0.06);
        padding: 0.2rem 0;
      }

      tbody tr td {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.5rem 0.7rem;
        white-space: normal;
        border-bottom: 1px solid #f2f5fa;
      }

      tbody tr td::before {
        content: attr(data-label);
        font-weight: 600;
        color: #5f708f;
        font-size: 0.78rem;
        min-width: 6.8rem;
      }

      tbody tr td:last-child {
        border-bottom: none;
      }

      .table-empty-row td {
        display: block;
        text-align: center;
        border-bottom: none;
        padding: 0.9rem;
      }

      .table-empty-row td::before {
        display: none;
      }
    }

    @media (max-width: 720px) {
      .pager {
        align-items: stretch;
      }

      .pager-meta,
      .pager-controls {
        width: 100%;
        justify-content: space-between;
      }

      .pager-btn {
        flex: 1 1 0;
      }

      .pager-current {
        flex: 1 1 100%;
        text-align: center;
        order: -1;
      }
    }
  `
})
export class CurrencyRatesPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly currencyRatesService = inject(CurrencyRatesService);
  private readonly toastService = inject(ToastService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showSaveConfirm = signal(false);
  readonly formError = signal('');
  readonly rates = signal<CurrencyRate[]>([]);
  readonly latestRate = signal<CurrencyRate | null>(null);
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.rates().length / this.pageSize())));
  readonly visibleRates = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.rates().slice(start, start + this.pageSize());
  });

  readonly form = this.fb.nonNullable.group({
    rate: [0, [Validators.required, Validators.min(0.0001)]],
    note: ['']
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      rates: this.currencyRatesService.list(),
      latest: this.currencyRatesService.latest()
    })
      .pipe(
        timeout(20000),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: ({ rates, latest }) => {
          const orderedRates = [...rates].sort((a, b) => {
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            return bTime - aTime;
          });
          this.rates.set(orderedRates);
          this.latestRate.set(latest ?? orderedRates[0] ?? null);
          this.goToPage(Math.min(this.currentPage(), this.totalPages()));
        },
        error: () => this.toastService.error('Không thể tải lịch sử tỷ giá. Vui lòng thử lại.')
      });
  }

  onPageSizeChange(rawValue: string): void {
    const nextSize = Number(rawValue);
    if (!Number.isNaN(nextSize) && nextSize > 0) {
      this.pageSize.set(nextSize);
      this.currentPage.set(1);
    }
  }

  goToPage(page: number): void {
    this.currentPage.set(Math.min(Math.max(page, 1), this.totalPages()));
  }

  requestSave(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Vui lòng nhập tỷ giá lớn hơn 0 trước khi lưu.');
      return;
    }

    this.formError.set('');
    this.showSaveConfirm.set(true);
  }

  confirmSave(): void {
    if (this.form.invalid || this.saving()) {
      this.showSaveConfirm.set(false);
      return;
    }

    this.showSaveConfirm.set(false);
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const payload: CurrencyRateCreateRequest = {
      rate: Number(raw.rate),
      note: raw.note.trim()
    };

    this.currencyRatesService
      .create(payload)
      .pipe(
        timeout(20000),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: (created) => {
          this.toastService.success('Đã lưu tỷ giá mới.');
          this.form.reset({ rate: created.rate, note: '' });
          this.currentPage.set(1);
          this.load();
        },
        error: (error) => {
          this.formError.set(resolveCrudError(error, 'Không thể lưu tỷ giá.'));
        }
      });
  }

  pagingSummary(): string {
    const totalItems = this.rates().length;
    if (!totalItems) {
      return '0 kết quả';
    }

    const from = (this.currentPage() - 1) * this.pageSize() + 1;
    const to = Math.min(this.currentPage() * this.pageSize(), totalItems);
    return `${from}-${to} / ${totalItems}`;
  }
}

function resolveCrudError(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const asRecord = error as Record<string, unknown>;
  const body = asRecord['error'];
  if (body && typeof body === 'object') {
    const message = (body as Record<string, unknown>)['message'];
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  if (typeof asRecord['message'] === 'string' && (asRecord['message'] as string).trim()) {
    return asRecord['message'] as string;
  }

  return fallback;
}
