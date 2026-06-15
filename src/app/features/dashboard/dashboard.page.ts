import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize, forkJoin, timeout } from 'rxjs';
import { ORDER_STATUS_LABELS } from '../../core/constants';
import { DashboardService } from '../../core/dashboard.service';
import { DashboardOrdersByDate, DashboardOrderStatus, DashboardRevenue } from '../../core/models';
import { DatePickerComponent } from '../../shared/date-picker.component';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [ReactiveFormsModule, DecimalPipe, DatePipe, DatePickerComponent],
  template: `
    <section class="toolbar card">
      <h2>Bảng điều khiển</h2>
      <form [formGroup]="form" (ngSubmit)="reload()" class="filters">
        <label>
          Từ ngày
          <app-date-picker formControlName="fromDate" placeholder="Từ ngày" />
        </label>
        <label>
          Đến ngày
          <app-date-picker formControlName="toDate" placeholder="Đến ngày" />
        </label>
        <button type="submit">
          <span class="btn-content">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
            <span>Tìm kiếm</span>
          </span>
        </button>
      </form>

      @if (loading()) {
        <div class="page-loading" aria-live="polite">
          <span class="page-loading-spinner" aria-hidden="true"></span>
          <span>Đang tải dữ liệu thống kê...</span>
        </div>
      }
    </section>

    <section class="cards">
      <article class="card">
        <div class="card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7l8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
        </div>
        <h3>Tổng đơn</h3>
        <strong>{{ revenue()?.totalOrders ?? 0 }}</strong>
      </article>
      <article class="card">
        <div class="card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9 10.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5-1.3 2.5-3 2.5-3 1.1-3 2.5 1.3 2.5 3 2.5 3-1.1 3-2.5"/><path d="M12 6.5v11"/></svg>
        </div>
        <h3>Tổng doanh thu</h3>
        <strong>{{ revenue()?.totalSellingPrice ?? 0 | number }}</strong>
      </article>
      <article class="card">
        <div class="card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h3l2.2 10.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L22 6H6"/></svg>
        </div>
        <h3>Tổng giá nhập</h3>
        <strong>{{ revenue()?.totalImportPrice ?? 0 | number }}</strong>
      </article>
      <article class="card">
        <div class="card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>
        </div>
        <h3>Lợi nhuận ước tính</h3>
        <strong>{{ revenue()?.estimatedProfit ?? 0 | number }}</strong>
      </article>
    </section>

    <section class="grid-2">
      <article class="card">
        <h3>Thống kê trạng thái đơn hàng</h3>
        @if (orderStatus(); as stats) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Trạng thái</th>
                  <th>Số lượng</th>
                </tr>
              </thead>
              <tbody>
                <tr><td data-label="STT">1</td><td data-label="Trạng thái">{{ statusLabels.DRAFT }}</td><td data-label="Số lượng">{{ stats.draft }}</td></tr>
                <tr><td data-label="STT">2</td><td data-label="Trạng thái">{{ statusLabels.NEW }}</td><td data-label="Số lượng">{{ stats.new }}</td></tr>
                <tr><td data-label="STT">3</td><td data-label="Trạng thái">{{ statusLabels.ORDERED }}</td><td data-label="Số lượng">{{ stats.ordered }}</td></tr>
                <tr><td data-label="STT">4</td><td data-label="Trạng thái">{{ statusLabels.ARRIVED }}</td><td data-label="Số lượng">{{ stats.arrived }}</td></tr>
                <tr><td data-label="STT">5</td><td data-label="Trạng thái">{{ statusLabels.CANCELLED }}</td><td data-label="Số lượng">{{ stats.cancelled }}</td></tr>
                <tr><td data-label="STT">6</td><td data-label="Trạng thái">{{ statusLabels.DELETED }}</td><td data-label="Số lượng">{{ stats.deleted }}</td></tr>
              </tbody>
            </table>
          </div>
        }
      </article>

      <article class="card">
        <h3>Đơn hàng theo ngày</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Ngày</th>
                <th>Số đơn</th>
              </tr>
            </thead>
            <tbody>
              @for (item of ordersByDate(); track item.date; let rowIndex = $index) {
                <tr>
                  <td data-label="STT">{{ rowIndex + 1 }}</td>
                  <td data-label="Ngày">{{ item.date | date: 'yyyy-MM-dd' }}</td>
                  <td data-label="Số đơn">{{ item.count }}</td>
                </tr>
              }
              @if (!ordersByDate().length) {
                <tr class="table-empty-row">
                  <td colspan="3">Không có dữ liệu</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `,
  styles: `
    .toolbar {
      margin-bottom: 1rem;
      display: grid;
      gap: 0.85rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      background: #fff;
      padding: 1rem;
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
    }

    .page-loading-spinner {
      width: 0.9rem;
      height: 0.9rem;
      border-radius: 50%;
      border: 2px solid #c7dbfa;
      border-top-color: #3f8cff;
      animation: spin 0.8s linear infinite;
    }

    .toolbar h2 {
      font-size: 1.05rem;
    }

    .filters {
      display: flex;
      gap: 0.65rem;
      flex-wrap: wrap;
      align-items: end;
    }

    .filters label {
      display: grid;
      gap: 0.32rem;
      font-size: 0.84rem;
      color: var(--text-muted);
    }

    .filters input[type='date'] {
      background: linear-gradient(180deg, #ffffff, #f7faff);
      border-color: #d7e3f3;
      font-weight: 600;
      color: #334a6b;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.85rem;
      margin-bottom: 1rem;
    }

    .cards .card {
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      color: var(--text);
      padding: 1rem;
      overflow: hidden;
      position: relative;
      background: #fff;
    }

    .cards h3 {
      margin: 0 0 0.45rem;
      color: var(--text-muted);
      font-size: 0.86rem;
      font-weight: 600;
    }

    .card-icon {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: var(--surface-soft);
      color: #35507a;
      margin-bottom: 0.45rem;
    }

    .cards .card::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: #8cbdfd;
    }

    .card-icon svg {
      width: 0.95rem;
      height: 0.95rem;
    }

    .cards strong {
      font-size: 1.35rem;
      letter-spacing: 0.2px;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.85rem;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 1rem;
      box-shadow: var(--shadow-sm);
    }

    h2,
    h3 {
      margin: 0;
    }

    h3 {
      margin-bottom: 0.7rem;
      font-size: 0.98rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    .table-wrap {
      overflow: auto;
    }

    td,
    th {
      border-bottom: 1px solid #eef2f8;
      padding: 0.58rem 0.42rem;
      text-align: left;
      font-size: 0.88rem;
    }

    tr:hover td {
      background: #fafcff;
    }

    th {
      color: #d8e2ff;
      font-weight: 600;
      background: linear-gradient(180deg, #26314d 0%, #1f2940 100%);
    }

    input,
    button {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0.45rem 0.68rem;
      background: #fff;
    }

    button {
      background: #f8fbff;
      color: var(--text);
      border-color: #cfe0ff;
      cursor: pointer;
      font-weight: 600;
    }

    button:hover {
      background: #eef6ff;
    }

    @media (max-width: 1000px) {
      .cards,
      .grid-2 {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .table-wrap {
        border: none;
        background: transparent;
      }

      table {
        border-collapse: separate;
      }

      thead {
        display: none;
      }

      tbody {
        display: grid;
        gap: 0.55rem;
      }

      tbody tr {
        display: block;
        border: 1px solid #e6edf7;
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 4px 14px rgba(20, 39, 70, 0.06);
        padding: 0.15rem 0;
      }

      tbody tr td {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.7rem;
        padding: 0.46rem 0.66rem;
        white-space: normal;
        border-bottom: 1px solid #f2f5fa;
      }

      tbody tr td::before {
        content: attr(data-label);
        font-weight: 600;
        color: #5f708f;
        font-size: 0.77rem;
        min-width: 5.4rem;
      }

      tbody tr td:last-child {
        border-bottom: none;
      }

      .table-empty-row {
        padding: 0;
      }

      .table-empty-row td {
        display: block;
        text-align: center;
        border-bottom: none;
        padding: 0.84rem;
      }

      .table-empty-row td::before {
        display: none;
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `
})
export class DashboardPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dashboardService = inject(DashboardService);
  private readonly toastService = inject(ToastService);
  readonly statusLabels = ORDER_STATUS_LABELS;

  readonly form = this.fb.nonNullable.group({
    fromDate: [firstDayOfCurrentMonth()],
    toDate: [todayDate()]
  });

  readonly orderStatus = signal<DashboardOrderStatus | null>(null);
  readonly revenue = signal<DashboardRevenue | null>(null);
  readonly ordersByDate = signal<DashboardOrdersByDate[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const { fromDate, toDate } = this.form.getRawValue();

    this.loading.set(true);
    forkJoin({
      orderStatus: this.dashboardService.orderStatus(),
      revenue: this.dashboardService.revenue(fromDate || undefined, toDate || undefined),
      ordersByDate: this.dashboardService.ordersByDate(fromDate || undefined, toDate || undefined)
    })
      .pipe(
        timeout(20000),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (result) => {
          this.orderStatus.set(result.orderStatus);
          this.revenue.set(result.revenue);
          this.ordersByDate.set(result.ordersByDate);
        },
        error: () => {
          this.toastService.error('Không thể tải dữ liệu dashboard. Vui lòng thử lại.');
        }
      });
  }
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayDate(): string {
  return formatDateInput(new Date());
}

function firstDayOfCurrentMonth(): string {
  const now = new Date();
  return formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
}

