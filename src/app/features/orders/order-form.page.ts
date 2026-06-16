import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, PAYMENT_STATUSES, PAYMENT_STATUS_LABELS } from '../../core/constants';
import { CurrencyRatesService } from '../../core/currency-rates.service';
import { OrderStatus, OrderUpsertRequest, PaymentStatus } from '../../core/models';
import { OrdersService } from '../../core/orders.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmModalComponent } from '../../shared/confirm-modal.component';
import { DatePickerComponent } from '../../shared/date-picker.component';

@Component({
  selector: 'app-order-form-page',
  imports: [ReactiveFormsModule, ConfirmModalComponent, DatePickerComponent],
  template: `
    <section class="card">
      <h2>{{ isEditMode() ? 'Cập nhật đơn hàng' : 'Tạo đơn hàng mới' }}</h2>

      <form [formGroup]="form" (ngSubmit)="requestSave()" class="grid">
        <label>
          Mã đơn *
          <input formControlName="orderCode" />
        </label>

        <label>
          Ngày tạo *
          <app-date-picker formControlName="orderDate" placeholder="Ngày tạo" />
        </label>

        <label>
          Khách hàng *
          <input formControlName="customerName" />
        </label>

        <label>
          Sản phẩm *
          <input formControlName="productName" />
        </label>

        <label>
          Số lượng *
          <input type="number" formControlName="quantity" />
        </label>

        <label>
          Giá bán *
          <input type="number" formControlName="sellingPrice" />
        </label>

        <label>
          Trạng thái *
          <select formControlName="status">
            @for (status of orderStatuses; track status) {
              <option [value]="status">{{ orderStatusLabels[status] }}</option>
            }
          </select>
        </label>

        <label>
          Thanh toán *
          <select formControlName="paymentStatus">
            @for (status of paymentStatuses; track status) {
              <option [value]="status">{{ paymentStatusLabels[status] }}</option>
            }
          </select>
        </label>

        <label>
          Giá tệ (Tệ)
          <input type="number" formControlName="yuanPrice" />
        </label>

        <label>
          Giá nhập
          <input type="number" formControlName="importPrice" />
        </label>

        <label>
          Nguồn hàng
          <input formControlName="supplier" />
        </label>

        <label>
          Tiền kho
          <input type="number" formControlName="warehousePayment" />
        </label>

        <label>
          Tiền cân
          <input type="number" formControlName="shippingWeightFee" />
        </label>

        <label>
          Ngày thanh toán cân
          <app-date-picker formControlName="shippingPaymentDate" placeholder="Ngày thanh toán cân" />
        </label>

        <label>
          Tiền hoàn
          <input type="number" formControlName="refundAmount" />
        </label>

        <label>
          Trạng thái hoàn
          <input formControlName="refundStatus" />
        </label>

        <label class="full">
          Mô tả
          <textarea rows="3" formControlName="specification"></textarea>
        </label>

        <label class="full">
          Ghi chú
          <textarea rows="4" formControlName="note"></textarea>
        </label>

        @if (errorMessage()) {
          <div class="error full">{{ errorMessage() }}</div>
        }

        <div class="actions full">
          <button type="button" (click)="onBack()">Quay lại</button>
          <button type="button" (click)="requestSave()" [disabled]="saving()">
            {{ saving() ? 'Đang lưu...' : 'Lưu' }}
          </button>
        </div>
      </form>
    </section>

    <app-confirm-modal
      [open]="showSaveConfirm()"
      [title]="isEditMode() ? 'Xác nhận cập nhật đơn hàng' : 'Xác nhận tạo đơn hàng'"
      [message]="isEditMode() ? 'Bạn có chắc chắn muốn lưu thay đổi đơn hàng này?' : 'Bạn có chắc chắn muốn tạo đơn hàng mới?'"
      (cancel)="closeSavePopup()"
      (confirm)="confirmSubmit()"
    />
  `,
  styles: `
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      padding: 1rem;
    }

    h2 {
      margin: 0;
      font-size: 1.08rem;
    }

    .grid {
      margin-top: 1rem;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }

    label {
      display: grid;
      gap: 0.35rem;
      font-size: 0.87rem;
      color: var(--text-muted);
    }

    .full {
      grid-column: 1 / -1;
    }

    input,
    textarea,
    select,
    button {
      border: 1px solid #d0d5dd;
      border-radius: 10px;
      padding: 0.5rem 0.65rem;
      font: inherit;
      background: #fff;
      color: var(--text);
    }

    .actions {
      margin-top: 0.25rem;
      display: flex;
      justify-content: end;
      gap: 0.5rem;
    }

    .actions button {
      min-width: 92px;
      cursor: pointer;
    }

    .actions button:first-child {
      background: #fff;
      border-color: #d0d5dd;
    }

    button[type='submit'] {
      background: var(--primary);
      color: #fff;
      border-color: transparent;
      font-weight: 600;
    }

    .error {
      color: #b42318;
      background: #fef3f2;
      border: 1px solid #fecdca;
      border-radius: 10px;
      padding: 0.58rem 0.68rem;
    }

    @media (max-width: 960px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class OrderFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currencyRatesService = inject(CurrencyRatesService);
  private readonly ordersService = inject(OrdersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly orderStatuses = ORDER_STATUSES;
  readonly paymentStatuses = PAYMENT_STATUSES;
  readonly orderStatusLabels = ORDER_STATUS_LABELS;
  readonly paymentStatusLabels = PAYMENT_STATUS_LABELS;

  readonly saving = signal(false);
  readonly showSaveConfirm = signal(false);
  readonly errorMessage = signal('');
  readonly isEditMode = signal(false);
  private currencyRate = 1;
  private orderId?: number;

  readonly form = this.fb.nonNullable.group({
    orderCode: ['', [Validators.required]],
    orderDate: ['', [Validators.required]],
    customerName: ['', [Validators.required]],
    productName: ['', [Validators.required]],
    specification: [''],
    quantity: [1, [Validators.required, Validators.min(1)]],
    sellingPrice: [0, [Validators.required, Validators.min(0)]],
    status: ['NEW' as OrderStatus, [Validators.required]],
    paymentStatus: ['UNPAID' as PaymentStatus, [Validators.required]],
    yuanPrice: [0],
    importPrice: [0],
    supplier: [''],
    warehousePayment: [0],
    shippingWeightFee: [0],
    shippingPaymentDate: [''],
    refundAmount: [0],
    refundStatus: [''],
    note: ['']
  });

  ngOnInit(): void {
    this.loadLatestCurrencyRate();
    this.form.controls.yuanPrice.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.updateImportPriceFromYuan(value));

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isNaN(id) && id > 0) {
      this.isEditMode.set(true);
      this.orderId = id;
      this.ordersService
        .detail(id)
        .pipe(timeout(20000))
        .subscribe({
          next: (order) => {
            this.form.patchValue({
              orderCode: order.orderCode,
              orderDate: order.orderDate?.slice(0, 10),
              customerName: order.customerName,
              productName: order.productName,
              specification: order.specification ?? '',
              quantity: order.quantity,
              sellingPrice: order.sellingPrice,
              status: order.status,
              paymentStatus: order.paymentStatus,
              yuanPrice: order.yuanPrice ?? 0,
              importPrice: order.importPrice ?? 0,
              supplier: order.supplier ?? '',
              warehousePayment: order.warehousePayment ?? 0,
              shippingWeightFee: order.shippingWeightFee ?? 0,
              shippingPaymentDate: order.shippingPaymentDate?.slice(0, 10) ?? '',
              refundAmount: order.refundAmount ?? 0,
              refundStatus: order.refundStatus ?? '',
              note: order.note ?? ''
            }, { emitEvent: false });
            this.form.markAsPristine();
          },
          error: () => {
            this.errorMessage.set('Không thể tải dữ liệu đơn hàng. Vui lòng thử lại.');
          }
        });
    }
  }

  requestSave(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Vui lòng nhập đầy đủ thông tin bắt buộc trước khi lưu.');
      return;
    }

    this.errorMessage.set('');
    this.showSaveConfirm.set(true);
  }

  closeSavePopup(): void {
    this.showSaveConfirm.set(false);
  }

  confirmSubmit(): void {
    if (this.form.invalid || this.saving()) {
      this.closeSavePopup();
      return;
    }

    this.closeSavePopup();

    this.saving.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    const payload: OrderUpsertRequest = {
      ...raw,
      shippingPaymentDate: raw.shippingPaymentDate || null
    };

    const request$ = this.isEditMode() && this.orderId
      ? this.ordersService.update(this.orderId, payload)
      : this.ordersService.create(payload);

    request$
      .pipe(
        timeout(20000),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: () => {
          this.toastService.success(this.isEditMode() ? 'Cập nhật đơn hàng thành công.' : 'Tạo đơn hàng thành công.');
          this.router.navigate(['/orders']);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message ?? 'Không thể lưu đơn hàng.');
        }
      });
  }

  onBack(): void {
    this.router.navigate(['/orders']);
  }

  private loadLatestCurrencyRate(): void {
    this.currencyRatesService
      .latest()
      .pipe(timeout(20000))
      .subscribe({
        next: (rate) => {
          this.currencyRate = Number(rate?.rate) > 0 ? Number(rate?.rate) : 1;
          if (this.form.controls.yuanPrice.dirty) {
            this.updateImportPriceFromYuan(this.form.controls.yuanPrice.value);
          }
        },
        error: () => {
          this.currencyRate = 1;
        }
      });
  }

  private updateImportPriceFromYuan(value: number): void {
    const yuanPrice = Number(value) || 0;
    this.form.controls.importPrice.setValue(Math.round(yuanPrice * this.currencyRate), { emitEvent: false });
  }
}

