import { DecimalPipe, DatePipe, CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, map, of, switchMap, timeout } from 'rxjs';
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  SUPPLIER_OPTIONS
} from '../../core/constants';
import { CurrencyRatesService } from '../../core/currency-rates.service';
import {
  Customer,
  CustomerUpsertRequest,
  Order,
  OrderStatus,
  OrderUpsertRequest,
  PagedResult,
  PaymentStatus,
  Product,
  ProductUpsertRequest
} from '../../core/models';
import { CustomersService } from '../../core/customers.service';
import { OrdersService } from '../../core/orders.service';
import { ProductsService } from '../../core/products.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmModalComponent } from '../../shared/confirm-modal.component';
import { DatePickerComponent } from '../../shared/date-picker.component';
import { SearchSelectComponent, SearchSelectOption } from '../../shared/search-select.component';

@Component({
  selector: 'app-orders-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    ConfirmModalComponent,
    DatePickerComponent,
    SearchSelectComponent,
  ],
  template: `
    <section class="card">
      <div class="header">
        <h2>Đơn hàng</h2>
        <button type="button" class="btn-primary" (click)="openCreateModal()">
          <span class="btn-content">
            <svg
              class="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            <span>Tạo đơn</span>
          </span>
        </button>
      </div>

      @if (loading()) {
        <div class="page-loading" aria-live="polite">
          <span class="page-loading-spinner" aria-hidden="true"></span>
          <span>Đang tải dữ liệu...</span>
        </div>
      }

      <form class="filters" [formGroup]="form" (ngSubmit)="onSearch()">
        <input
          formControlName="customerName"
          placeholder="Tìm theo tên khách"
          style="display: none"
        />
        <input
          formControlName="productName"
          placeholder="Tìm theo tên sản phẩm"
          style="display: none"
        />
        <app-search-select
          [selectedLabel]="form.controls.customerName.value"
          [options]="customerLookupOptions()"
          [loading]="customerLookupLoading"
          [loadingMore]="customerLookupLoadingMore"
          [hasMore]="customerLookupHasMore"
          [allowCustomValue]="true"
          [allowClear]="true"
          customActionText="Dùng tên khách hàng này"
          placeholder="Chọn hoặc tìm khách hàng"
          searchPlaceholder="Tìm theo mã, tên hoặc số điện thoại"
          emptyText="Không tìm thấy khách hàng (vẫn có thể lưu để tự tạo mới)"
          (searchChange)="searchCustomers($event)"
          (loadMore)="loadMoreCustomers()"
          (optionSelected)="selectCustomerSearch($event)"
          (customValueSelected)="onCustomerTypedSearch($event)"
          (cleared)="clearCustomerSearch()"
        />
        <app-search-select
          [selectedLabel]="form.controls.productName.value"
          [options]="productLookupOptions()"
          [loading]="productLookupLoading"
          [loadingMore]="productLookupLoadingMore"
          [hasMore]="productLookupHasMore"
          [allowCustomValue]="true"
          [allowClear]="true"
          customActionText="Dùng tên sản phẩm này"
          placeholder="Chọn hoặc tìm sản phẩm"
          searchPlaceholder="Tìm theo mã hoặc tên sản phẩm"
          emptyText="Không tìm thấy sản phẩm (vẫn có thể lưu để tự tạo mới)"
          (searchChange)="searchProducts($event)"
          (loadMore)="loadMoreProducts()"
          (optionSelected)="selectProductSearch($event)"
          (customValueSelected)="onProductTypedSearch($event)"
          (cleared)="clearProductSearch()"
        />
        <app-search-select
          [selectedLabel]="selectedFilterStatusLabel()"
          [options]="filterStatusSelectOptions()"
          placeholder="Tất cả trạng thái"
          searchPlaceholder="Tìm trạng thái"
          emptyText="Không có trạng thái"
          (optionSelected)="selectFilterStatus($event)"
        />
        <app-date-picker formControlName="fromDate" placeholder="Từ ngày" />
        <app-date-picker formControlName="toDate" placeholder="Đến ngày" />
        <button type="submit">
          <span class="btn-content">
            <svg
              class="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span>Tìm kiếm</span>
          </span>
        </button>
      </form>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Sản phẩm</th>
              <th>Ngày tạo</th>
              <th>Mô tả</th>
              <th>Tổng giá bán</th>
              <th>Trạng thái</th>
              <th>Thanh toán</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            @for (order of pageData().items; track order.id; let rowIndex = $index) {
              <tr>
                <td data-label="STT">
                  {{ (pageData().page - 1) * pageData().pageSize + rowIndex + 1 }}
                </td>
                <td data-label="Mã đơn">{{ order.orderCode }}</td>
                <td data-label="Khách hàng">{{ order.customerName }}</td>
                <td data-label="Sản phẩm">{{ order.productName }}</td>
                <td data-label="Ngày tạo">{{ order.orderDate | date: 'yyyy-MM-dd' }}</td>
                <td data-label="Mô tả">{{ order.specification }}</td>
                <td data-label="Tổng giá bán">
                  {{ order.amountSellingPrice | number: '1.0-0' }} VNĐ
                </td>
                <td data-label="Trạng thái">
                  <app-search-select
                    [selectedLabel]="orderStatusLabels[order.status]"
                    [options]="rowStatusSelectOptions(order)"
                    [disabled]="isRowStatusReadonly(order)"
                    placeholder="Chọn trạng thái"
                    searchPlaceholder="Tìm trạng thái"
                    emptyText="Không có trạng thái"
                    (optionSelected)="requestStatusOptionChange(order, $event)"
                  />
                </td>
                <td data-label="Thanh toán">
                  <app-search-select
                    [selectedLabel]="paymentStatusLabels[order.paymentStatus]"
                    [options]="rowPaymentStatusSelectOptions(order)"
                    [disabled]="isRowPaymentStatusReadonly(order)"
                    placeholder="Chọn trạng thái thanh toán"
                    searchPlaceholder="Tìm trạng thái thanh toán"
                    emptyText="Không có trạng thái thanh toán"
                    (optionSelected)="requestPaymentStatusOptionChange(order, $event)"
                  />
                </td>
                <td data-label="Thao tác" class="actions actions-cell">
                  <button type="button" class="btn-view" (click)="openViewModal(order.id)">
                    <span class="btn-content">
                      <svg
                        class="btn-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                      >
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>Xem</span>
                    </span>
                  </button>
                  <button type="button" class="btn-ghost" (click)="openEditModal(order.id)">
                    <span class="btn-content">
                      <svg
                        class="btn-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                      <span>Sửa</span>
                    </span>
                  </button>
                  <button type="button" class="btn-danger" (click)="onDelete(order.id)">
                    <span class="btn-content">
                      <svg
                        class="btn-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                      <span>Xóa</span>
                    </span>
                  </button>
                </td>
              </tr>
            }
            @if (!pageData().items.length) {
              <tr class="table-empty-row">
                <td colspan="10">Không có đơn hàng.</td>
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
            <app-search-select
              [selectedLabel]="pageData().pageSize.toString()"
              [options]="pageSizeSelectOptions()"
              placeholder="10"
              searchPlaceholder="Tìm kích thước trang"
              emptyText="Không có kích thước trang"
              (optionSelected)="selectPageSize($event)"
            />
            / trang
          </label>
        </div>
        <div class="pager-controls">
          <button
            type="button"
            class="pager-btn"
            (click)="goToPage(pageData().page - 1)"
            [disabled]="pageData().page <= 1"
          >
            Trước
          </button>
          <span class="pager-current"
            >Trang {{ pageData().page }} / {{ pageData().totalPages }}</span
          >
          <button
            type="button"
            class="pager-btn"
            (click)="goToPage(pageData().page + 1)"
            [disabled]="pageData().page >= pageData().totalPages"
          >
            Sau
          </button>
        </div>
      </div>
    </section>

    @if (showFormModal()) {
      <div class="modal-overlay" [class.closing]="formModalClosing()" (click)="closeFormModal()">
        <section
          #orderModalRoot
          class="form-modal"
          [class.closing]="formModalClosing()"
          tabindex="-1"
          (click)="$event.stopPropagation()"
          (keydown.escape)="onFormEsc($event)"
          (keydown)="onFormKeydown($event)"
        >
          <h3>
            <span class="title-with-icon">
              <svg
                class="title-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="M3 7h18" />
                <path d="M6 3h12l1 4H5z" />
                <rect x="3" y="7" width="18" height="14" rx="2" />
                <path d="M9 12h6" />
              </svg>
              <span>{{ editingOrderId() ? 'Cập nhật đơn hàng' : 'Tạo đơn hàng mới' }}</span>
            </span>
            <button type="button" class="close-btn" (click)="closeFormModal()" aria-label="Close">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </h3>

          <form [formGroup]="orderForm" (ngSubmit)="requestSave()" class="form-sections">
            <section class="form-section general">
              <h4>Thông tin chung</h4>
              <div class="section-grid">
                <label>
                  Mã đơn *
                  <input formControlName="orderCode" />
                </label>
                <label>
                  Ngày tạo *
                  <app-date-picker formControlName="orderDate" placeholder="Ngày tạo" />
                </label>
                <label class="full">
                  Khách hàng *
                  <app-search-select
                    [selectedLabel]="orderForm.controls.customerName.value"
                    [options]="customerLookupOptions()"
                    [loading]="customerLookupLoading"
                    [loadingMore]="customerLookupLoadingMore"
                    [hasMore]="customerLookupHasMore"
                    [allowCustomValue]="true"
                    customActionText="Dùng tên khách hàng này"
                    placeholder="Chọn hoặc tìm khách hàng"
                    searchPlaceholder="Tìm theo mã, tên hoặc số điện thoại"
                    emptyText="Không tìm thấy khách hàng (vẫn có thể lưu để tự tạo mới)"
                    (searchChange)="searchCustomers($event)"
                    (loadMore)="loadMoreCustomers()"
                    (optionSelected)="selectCustomer($event)"
                    (customValueSelected)="onCustomerTyped($event)"
                  />
                </label>
              </div>
            </section>

            <section class="form-section product">
              <h4>Thông tin hàng</h4>
              <div class="section-grid product-grid">
                <label class="col-2">
                  Sản phẩm *
                  <app-search-select
                    [selectedLabel]="orderForm.controls.productName.value"
                    [options]="productLookupOptions()"
                    [loading]="productLookupLoading"
                    [loadingMore]="productLookupLoadingMore"
                    [hasMore]="productLookupHasMore"
                    [allowCustomValue]="true"
                    customActionText="Dùng tên sản phẩm này"
                    placeholder="Chọn hoặc tìm sản phẩm"
                    searchPlaceholder="Tìm theo mã hoặc tên sản phẩm"
                    emptyText="Không tìm thấy sản phẩm (vẫn có thể lưu để tự tạo mới)"
                    (searchChange)="searchProducts($event)"
                    (loadMore)="loadMoreProducts()"
                    (optionSelected)="selectProduct($event)"
                    (customValueSelected)="onProductTyped($event)"
                  />
                </label>
                <label>
                  Số lượng *
                  <input
                    (blur)="updateAmountSellingPriceFromSellingPrice()"
                    type="number"
                    formControlName="quantity"
                  />
                </label>
                <label>
                  Nguồn hàng
                  <app-search-select
                    [selectedLabel]="orderForm.controls.supplier.value"
                    [options]="supplierSelectOptions()"
                    placeholder="Chọn nguồn hàng"
                    searchPlaceholder="Tìm nguồn hàng"
                    emptyText="Không có nguồn hàng"
                    (optionSelected)="selectSupplier($event)"
                  />
                </label>
                <label class="full">
                  Mô tả
                  <input type="text" formControlName="specification" />
                </label>
              </div>
            </section>

            <section class="form-section pricing">
              <h4>Thông tin giá</h4>
              <div class="section-grid">
                <label>
                  Giá bán *
                  <div class="price-input-group">
                    <input
                      type="text"
                      inputmode="numeric"
                      formControlName="sellingPrice"
                      placeholder="Nhập giá bán"
                      (input)="onPriceInput($event, 'sellingPrice')"
                      (blur)="savePriceValue($event, 'sellingPrice')"
                    />
                    <span class="price-unit">VNĐ</span>
                  </div>
                </label>
                <label>
                  Giá tệ
                  <div class="price-input-group">
                    <input
                      type="text"
                      inputmode="numeric"
                      formControlName="yuanPrice"
                      placeholder="Nhập giá tệ"
                      (input)="onPriceInputFloat($event, 'yuanPrice')"
                      (blur)="savePriceValue($event, 'yuanPrice')"
                    />
                    <span class="price-unit">Tệ</span>
                  </div>
                </label>
                <label>
                  Giá nhập
                  <div class="price-input-group">
                    <input
                      type="text"
                      inputmode="numeric"
                      formControlName="importPrice"
                      placeholder="Nhập giá nhập"
                      (input)="onPriceInput($event, 'importPrice')"
                      (blur)="savePriceValue($event, 'importPrice')"
                    />
                    <span class="price-unit">VNĐ</span>
                  </div>
                </label>
                <label class="full">
                  Tổng tiền
                  <div class="price-input-group">
                    <input
                      type="text"
                      inputmode="numeric"
                      formControlName="amountSellingPrice"
                      placeholder="Nhập tổng tiền"
                      (input)="onPriceInput($event, 'amountSellingPrice')"
                      (blur)="savePriceValue($event, 'amountSellingPrice')"
                    />
                    <span class="price-unit">VNĐ</span>
                  </div>
                </label>
              </div>
            </section>

            <section class="form-section status">
              <h4>Thông tin trạng thái</h4>
              <div class="section-grid">
                <label>
                  Trạng thái *
                  <app-search-select
                    [selectedLabel]="orderStatusLabels[orderForm.controls.status.value]"
                    [options]="orderStatusSelectOptions()"
                    placeholder="Chọn trạng thái"
                    searchPlaceholder="Tìm trạng thái"
                    emptyText="Không có trạng thái"
                    (optionSelected)="selectOrderStatus($event)"
                  />
                </label>
                <label>
                  Thanh toán *
                  <app-search-select
                    [selectedLabel]="paymentStatusLabels[orderForm.controls.paymentStatus.value]"
                    [options]="paymentStatusSelectOptions()"
                    placeholder="Chọn thanh toán"
                    searchPlaceholder="Tìm trạng thái thanh toán"
                    emptyText="Không có trạng thái thanh toán"
                    (optionSelected)="selectPaymentStatus($event)"
                  />
                </label>
                <label>
                  Trạng thái hoàn
                  <input formControlName="refundStatus" />
                </label>
                <label>
                  Ngày thanh toán cân
                  <app-date-picker
                    formControlName="shippingPaymentDate"
                    placeholder="Ngày thanh toán cân"
                  />
                </label>
              </div>
            </section>

            <section class="form-section other full-row">
              <h4>Thông tin khác</h4>
              <div class="section-grid">
                <label class="full">
                  Ghi chú
                  <textarea rows="2" formControlName="note"></textarea>
                </label>
              </div>
            </section>

            @if (formError()) {
              <div class="error full-row">{{ formError() }}</div>
            }
            <div class="form-actions full-row">
              <button type="button" (click)="closeFormModal()">
                <span class="btn-content">
                  <svg
                    class="btn-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                  <span>Hủy</span>
                </span>
              </button>
              <button
                type="button"
                class="btn-primary"
                [disabled]="saving()"
                (click)="requestSave()"
              >
                <span class="btn-content">
                  <svg
                    class="btn-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                    <path d="M17 21v-8H7v8" />
                    <path d="M7 3v5h8" />
                  </svg>
                  <span>{{ saving() ? 'Đang lưu...' : 'Lưu' }}</span>
                </span>
              </button>
            </div>
          </form>
        </section>
      </div>
    }

    @if (showViewModal()) {
      <div class="modal-overlay" [class.closing]="viewModalClosing()" (click)="closeViewModal()">
        <section
          class="view-modal"
          [class.closing]="viewModalClosing()"
          tabindex="-1"
          (click)="$event.stopPropagation()"
          (keydown.escape)="closeViewModal()"
        >
          <h3>
            <span class="title-with-icon">
              <svg
                class="title-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>Chi tiết đơn hàng</span>
            </span>
            <button type="button" class="close-btn" (click)="closeViewModal()" aria-label="Close">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </h3>

          @if (viewingOrder(); as order) {
            <div class="view-grid">
              <div class="view-item">
                <div class="view-label">Mã đơn</div>
                <div class="view-value">{{ order.orderCode }}</div>
              </div>
              <div class="view-item">
                <div class="view-label">Ngày tạo</div>
                <div class="view-value">{{ order.orderDate | date: 'yyyy-MM-dd' }}</div>
              </div>
              <div class="view-item">
                <div class="view-label">Khách hàng</div>
                <div class="view-value">{{ order.customerName }}</div>
              </div>
              <div class="view-item">
                <div class="view-label">Sản phẩm</div>
                <div class="view-value">{{ order.productName }}</div>
              </div>
              <div class="view-item">
                <div class="view-label">Số lượng</div>
                <div class="view-value">{{ order.quantity }}</div>
              </div>
              <div class="view-item">
                <div class="view-label">Giá bán</div>
                <div class="view-value">{{ order.sellingPrice | number: '1.0-0' }} VNĐ</div>
              </div>
              <div class="view-item">
                <div class="view-label">Tổng Giá bán</div>
                <div class="view-value">{{ order.amountSellingPrice | number: '1.0-0' }} VNĐ</div>
              </div>
              <div class="view-item">
                <div class="view-label">Giá tệ</div>
                <div class="view-value">{{ order.yuanPrice | number: '1.0-0' }} Tệ</div>
              </div>
              <div class="view-item">
                <div class="view-label">Giá nhập</div>
                <div class="view-value">{{ order.importPrice | number: '1.0-0' }} VNĐ</div>
              </div>
              <div class="view-item">
                <div class="view-label">Trạng thái</div>
                <div class="view-value">{{ orderStatusLabels[order.status] }}</div>
              </div>
              <div class="view-item">
                <div class="view-label">Thanh toán</div>
                <div class="view-value">
                  <span [ngClass]="'payment-badge payment-' + order.paymentStatus.toLowerCase()">
                    {{ paymentStatusLabels[order.paymentStatus] }}
                  </span>
                </div>
              </div>
              <div class="view-item">
                <div class="view-label">Nguồn hàng</div>
                <div class="view-value">{{ order.supplier || '-' }}</div>
              </div>
              <div class="view-item full">
                <div class="view-label">Mô tả</div>
                <div class="view-value">{{ order.specification || '-' }}</div>
              </div>
              <div class="view-item full">
                <div class="view-label">Ghi chú</div>
                <div class="view-value">{{ order.note || '-' }}</div>
              </div>
              <div class="view-item full compact-meta">
                <div class="view-value">
                  Tạo bởi: {{ order.createdBy || '-' }} | Tạo lúc:
                  {{ order.createdAt | date: 'yyyy-MM-dd HH:mm' }} | Cập nhật:
                  {{ order.updatedAt | date: 'yyyy-MM-dd HH:mm' }}
                </div>
              </div>
            </div>
          }

          <div class="form-actions">
            <button type="button" (click)="closeViewModal()">
              <span class="btn-content">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
                <span>Đóng</span>
              </span>
            </button>
          </div>
        </section>
      </div>
    }

    <app-confirm-modal
      [open]="showSaveConfirm()"
      [loading]="saving()"
      [title]="editingOrderId() ? 'Xác nhận cập nhật đơn hàng' : 'Xác nhận tạo đơn hàng'"
      [message]="
        editingOrderId()
          ? 'Bạn có chắc chắn muốn lưu thay đổi đơn hàng này?'
          : 'Bạn có chắc chắn muốn tạo đơn hàng mới?'
      "
      (cancel)="showSaveConfirm.set(false)"
      (confirm)="confirmSave()"
    />

    <app-confirm-modal
      [open]="showDeleteModal()"
      [loading]="deleting()"
      title="Xóa đơn hàng"
      message="Bạn có chắc chắn muốn xóa đơn hàng đã chọn không?"
      (cancel)="cancelDelete()"
      (confirm)="confirmDelete()"
    />

    <app-confirm-modal
      [open]="showStatusConfirm()"
      [loading]="statusSaving()"
      title="Xác nhận cập nhật trạng thái"
      [message]="statusConfirmMessage()"
      (cancel)="cancelStatusChange()"
      (confirm)="confirmStatusChange()"
    />

    <app-confirm-modal
      [open]="showPaymentStatusConfirm()"
      [loading]="paymentStatusSaving()"
      title="Xác nhận cập nhật trạng thái thanh toán"
      [message]="paymentStatusConfirmMessage()"
      (cancel)="cancelPaymentStatusChange()"
      (confirm)="confirmPaymentStatusChange()"
    />
  `,
  styles: `
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      padding: 1rem;
      position: relative;
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

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.8rem;
      margin-bottom: 1rem;
    }

    .header .btn-content {
      font-size: 0.9rem;
    }

    h2 {
      margin: 0;
      font-size: 1.08rem;
      font-weight: 700;
    }

    .btn-primary {
      color: #fff;
      background: linear-gradient(90deg, var(--primary), var(--primary-600));
      border-radius: 10px;
      padding: 0.54rem 0.85rem;
      font-weight: 600;
      border: 1px solid transparent;
      cursor: pointer;
      box-shadow: 0 8px 18px rgba(64, 153, 255, 0.24);
    }

    .btn-primary:hover {
      transform: translateY(-1px);
    }

    .filters {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 0.55rem;
      margin-bottom: 1rem;
    }

    input,
    select,
    button,
    textarea {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0.48rem 0.64rem;
      background: #fff;
    }

    .page-size app-search-select {
      width: 76px;
    }

    td app-search-select {
      min-width: 126px;
      display: block;
    }

    .section-grid input,
    .section-grid app-search-select {
      min-height: 2.15rem;
      width: 100%;
      box-sizing: border-box;
    }

    .section-grid app-search-select {
      display: block;
      min-width: 0;
    }

    form button[type='submit'] {
      background: #f8fbff;
      font-weight: 600;
      color: var(--text);
      cursor: pointer;
    }

    form button[type='submit']:hover {
      border-color: #b8d8ff;
      background: #f0f7ff;
    }

    .filters input[type='date'] {
      background: linear-gradient(180deg, #ffffff, #f7faff);
      border-color: #d7e3f3;
      font-weight: 600;
      color: #334a6b;
    }

    .section-grid input[type='date'] {
      background: #fff;
      border-color: #d7e3f3;
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
      min-width: 1000px;
    }

    th,
    td {
      border-bottom: 1px solid #eef2f8;
      padding: 0.62rem 0.48rem;
      text-align: left;
      font-size: 0.88rem;
      white-space: nowrap;
    }

    th {
      color: #d8e2ff;
      font-weight: 600;
      background: linear-gradient(180deg, #26314d 0%, #1f2940 100%);
    }

    tbody tr:hover td {
      background: #fafcff;
    }

    .actions {
      display: flex;
      gap: 0.4rem;
    }

    .actions .btn-view,
    .actions .btn-ghost,
    .actions .btn-danger {
      padding: 0.4rem 0.62rem;
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 600;
    }

    .actions .btn-icon {
      width: 0.86rem;
      height: 0.86rem;
    }

    .actions .btn-ghost {
      border-color: #cfe0ff;
      color: #1d5fbf;
      background: #f0f7ff;
    }

    .actions .btn-danger {
      color: #fff;
      background: linear-gradient(90deg, #ff5370, #ff6f89);
      border-color: transparent;
    }

    .actions .btn-view {
      border-color: #d5e2f3;
      color: #35507a;
      background: #f5f8fd;
    }

    .pager {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.6rem;
      margin-top: 0.95rem;
      color: var(--text-muted);
      font-size: 0.88rem;
      flex-wrap: wrap;
      border-top: 1px solid #ecf1f8;
      padding-top: 0.72rem;
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

    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 1100;
      background: rgba(22, 31, 56, 0.42);
      backdrop-filter: blur(2px);
      display: grid;
      place-items: center;
      padding: 1rem;
      animation: fadeIn 0.2s ease;
    }

    .modal-overlay.closing {
      animation: fadeOut 0.18s ease forwards;
      pointer-events: none;
    }

    .form-modal {
      width: min(1240px, 100%);
      max-height: 90dvh;
      overflow: auto;
      background: #fff;
      border-radius: 14px;
      border: 1px solid var(--border);
      box-shadow: 0 22px 50px rgba(16, 24, 40, 0.25);
      padding: 1rem;
      --order-form-grid-gap: 0.75rem;
      animation: scaleIn 0.22s ease;
    }

    .form-modal.closing {
      animation: scaleOut 0.18s ease forwards;
      pointer-events: none;
    }

    .view-modal {
      width: min(1160px, 100%);
      background: #fff;
      border-radius: 14px;
      border: 1px solid var(--border);
      box-shadow: 0 22px 50px rgba(16, 24, 40, 0.25);
      padding: 0.85rem;
      animation: scaleIn 0.22s ease;
      display: grid;
      gap: 0.55rem;
    }

    .view-modal.closing {
      animation: scaleOut 0.18s ease forwards;
      pointer-events: none;
    }

    .view-modal h3 {
      margin: 0;
      font-size: 1rem;
      padding-bottom: 0.55rem;
      border-bottom: 1px solid #eef2f8;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .view-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.42rem;
      font-size: 0.82rem;
      color: var(--text);
      padding: 0.2rem 0;
    }

    .view-grid .full {
      grid-column: 1 / -1;
    }

    .view-item {
      background: #f8f9fb;
      border: 1px solid #eef2f8;
      border-radius: 8px;
      padding: 0.42rem 0.52rem;
      display: flex;
      flex-direction: column;
      gap: 0.18rem;
    }

    .view-item.full {
      grid-column: 1 / -1;
    }

    .view-label {
      font-size: 0.68rem;
      color: #667085;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }

    .view-value {
      font-size: 0.82rem;
      color: #1a202c;
      font-weight: 500;
      line-height: 1.18;
    }

    .compact-meta .view-value {
      font-size: 0.76rem;
      color: #5d6b82;
    }

    .payment-badge {
      display: inline-block;
      padding: 0.32rem 0.68rem;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .payment-badge.payment-paid {
      background: linear-gradient(135deg, #d1fae5, #a7f3d0);
      color: #065f46;
      border: 1px solid #6ee7b7;
    }

    .payment-badge.payment-pending {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      color: #92400e;
      border: 1px solid #fcd34d;
    }

    .payment-badge.payment_pending {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      color: #92400e;
      border: 1px solid #fcd34d;
    }

    .payment-badge.payment-unpaid {
      background: linear-gradient(135deg, #fee2e2, #fecaca);
      color: #991b1b;
      border: 1px solid #fca5a5;
    }

    .payment-badge.payment_unpaid {
      background: linear-gradient(135deg, #fee2e2, #fecaca);
      color: #991b1b;
      border: 1px solid #fca5a5;
    }

    .form-modal h3 {
      margin: 0 0 0.9rem;
      font-size: 1rem;
      padding-bottom: 0.65rem;
      border-bottom: 1px solid #eef2f8;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .title-with-icon {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
    }

    .title-icon {
      width: 1rem;
      height: 1rem;
      color: #2e4368;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #667085;
      transition: color 0.2s ease;
      margin-left: auto;
    }

    .close-btn:hover {
      color: #1a202c;
    }

    .close-btn svg {
      width: 1.25rem;
      height: 1.25rem;
    }

    .form-sections {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.6rem;
    }

    .form-section {
      border: 1px solid #eaf0f8;
      border-radius: 12px;
      padding: 0.6rem;
      background: #fcfdff;
    }

    .full-row {
      grid-column: 1 / -1;
    }

    .form-section h4 {
      margin: 0 0 0.5rem;
      font-size: 0.86rem;
      color: #2e4368;
    }

    .section-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: var(--order-form-grid-gap);
      row-gap: var(--order-form-grid-gap);
    }

    .section-grid.product-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .section-grid > * {
      min-width: 0;
    }

    .section-grid.product-grid .col-2 {
      grid-column: span 2;
    }

    .section-grid label {
      display: grid;
      gap: 0.32rem;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .section-grid .full {
      grid-column: 1 / -1;
    }

    .price-input-group {
      position: relative;
      width: 100%;
    }

    .price-input-group input {
      width: 100%;
      padding-right: 2.8rem !important;
      box-sizing: border-box;
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-feature-settings: 'tnum';
    }

    .price-unit {
      position: absolute;
      right: 0.62rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.78rem;
      color: #8a9ab8;
      font-weight: 600;
      pointer-events: none;
      line-height: 1;
    }

    .form-section.general .section-grid,
    .form-section.pricing .section-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .form-section.general .section-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .section-grid.product-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .section-grid.product-grid .col-2 {
      grid-column: span 2;
    }

    .form-section.status .section-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .form-actions {
      display: flex;
      justify-content: end;
      gap: 0.5rem;
      margin-top: 1.2rem;
      padding-top: 1rem;
      border-top: 1px solid #eef2f8;
    }

    .form-actions button {
      padding: 0.54rem 1rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 10px;
      font-size: 0.9rem;
    }

    .form-actions button:first-child {
      background: #f8fbff;
      border: 1px solid #d7e3f3;
      color: #334a6b;
    }

    .form-actions button:first-child:hover {
      background: #f0f7ff;
      border-color: #b8d8ff;
    }

    .error {
      color: #b42318;
      background: #fef3f2;
      border: 1px solid #fecdca;
      border-radius: 10px;
      padding: 0.58rem 0.68rem;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes scaleOut {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 1200px) {
      .filters {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 1180px) {
      .form-sections {
        grid-template-columns: 1fr;
      }

      .view-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .form-section.general .section-grid,
      .form-section.product .section-grid,
      .form-section.pricing .section-grid,
      .form-section.status .section-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .section-grid.product-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .section-grid.product-grid .col-2 {
        grid-column: span 2;
      }
    }

    @media (max-width: 960px) {
      .section-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .section-grid.product-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .section-grid.product-grid .col-2 {
        grid-column: span 2;
      }
    }

    @media (max-width: 768px) {
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
        padding: 0.52rem 0.72rem;
        white-space: normal;
        border-bottom: 1px solid #f2f5fa;
        min-width: 0;
        overflow: hidden;
      }

      tbody tr td > * {
        min-width: 0;
      }

      tbody tr td::before {
        content: attr(data-label);
        font-weight: 600;
        color: #5f708f;
        font-size: 0.78rem;
        min-width: 4rem;
      }

      tbody tr td:last-child {
        border-bottom: none;
      }

      td app-search-select {
        min-width: 0;
        width: auto;
      }

      .actions-cell {
        display: grid;
        gap: 0.4rem;
        justify-content: stretch;
      }

      .actions-cell::before {
        margin-top: 0.2rem;
      }

      .actions-cell button {
        width: 100%;
      }

      .table-empty-row {
        padding: 0;
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
      .modal-overlay {
        padding: 0;
      }

      .form-modal {
        width: 100%;
        height: 100dvh;
        max-height: 100dvh;
        border-radius: 0;
        padding: 0.75rem 0.65rem 0.9rem;
      }

      .form-modal h3 {
        position: sticky;
        top: 0;
        z-index: 2;
        background: #fff;
        padding-top: 0.08rem;
        margin-bottom: 0.65rem;
      }

      .form-sections {
        gap: 0.5rem;
      }

      .form-section {
        padding: 0.52rem;
        border-radius: 10px;
      }

      .form-section h4 {
        margin-bottom: 0.42rem;
        font-size: 0.83rem;
      }

      .section-grid label {
        font-size: 0.82rem;
      }

      .form-actions {
        position: sticky;
        bottom: 0;
        z-index: 2;
        background: #fff;
        margin-top: 0.8rem;
        padding-top: 0.65rem;
        padding-bottom: 0.2rem;
        box-shadow: 0 -8px 16px rgba(22, 31, 56, 0.08);
      }

      .form-actions button {
        flex: 1 1 0;
      }

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

      .section-grid {
        grid-template-columns: 1fr;
      }

      .section-grid.product-grid {
        grid-template-columns: 1fr;
      }

      .section-grid.product-grid .col-2 {
        grid-column: span 1;
      }

      .view-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class OrdersPage implements OnInit {
  @ViewChild('orderModalRoot') private orderModalRoot?: ElementRef<HTMLElement>;

  private static readonly LOOKUP_PAGE_SIZE = 15;

  private readonly fb = inject(FormBuilder);
  private readonly currencyRatesService = inject(CurrencyRatesService);
  private readonly customersService = inject(CustomersService);
  private readonly ordersService = inject(OrdersService);
  private readonly productsService = inject(ProductsService);
  private readonly toastService = inject(ToastService);

  readonly orderStatuses = ORDER_STATUSES;
  readonly statusUpdateOptions: OrderStatus[] = ORDER_STATUSES.filter(
    (status) => status !== 'DELETED',
  ) as OrderStatus[];
  readonly paymentStatuses = PAYMENT_STATUSES;
  readonly orderStatusLabels = ORDER_STATUS_LABELS;
  readonly paymentStatusLabels = PAYMENT_STATUS_LABELS;
  readonly supplierOptions: string[] = [...SUPPLIER_OPTIONS];

  readonly showFormModal = signal(false);
  readonly formModalClosing = signal(false);
  readonly showSaveConfirm = signal(false);
  readonly showDeleteModal = signal(false);
  readonly showStatusConfirm = signal(false);
  readonly showPaymentStatusConfirm = signal(false);
  readonly showViewModal = signal(false);
  readonly viewModalClosing = signal(false);
  readonly editingOrderId = signal<number | null>(null);
  readonly viewingOrder = signal<Order | null>(null);
  readonly originalEditStatus = signal<OrderStatus | null>(null);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly statusSaving = signal(false);
  readonly paymentStatusSaving = signal(false);
  readonly loading = signal(false);
  readonly loadingEdit = signal(false);
  readonly formError = signal('');
  readonly customerLookupOptions = signal<SearchSelectOption[]>([]);
  readonly customerLookupLoading = signal(false);
  readonly customerLookupLoadingMore = signal(false);
  readonly customerLookupHasMore = signal(false);
  readonly productLookupOptions = signal<SearchSelectOption[]>([]);
  readonly productLookupLoading = signal(false);
  readonly productLookupLoadingMore = signal(false);
  readonly productLookupHasMore = signal(false);

  private deletingOrderId: number | null = null;
  private pendingStatusOrderId: number | null = null;
  private pendingStatusOrderCode: string | null = null;
  private pendingStatusValue: OrderStatus | null = null;
  private pendingPaymentStatusOrderId: number | null = null;
  private pendingPaymentStatusOrderCode: string | null = null;
  private pendingPaymentStatusValue: PaymentStatus | null = null;
  private currencyRate = 1;
  private customerLookupPage = 0;
  private customerLookupSearch = '';
  private productLookupPage = 0;
  private productLookupSearch = '';

  readonly form = this.fb.nonNullable.group({
    customerName: [''],
    productName: [''],
    status: [''],
    fromDate: [firstDayOfYear()],
    toDate: [today()],
  });

  readonly orderForm = this.fb.nonNullable.group({
    orderCode: ['', [Validators.required]],
    orderDate: ['', [Validators.required]],
    customerName: ['', [Validators.required]],
    productName: ['', [Validators.required]],
    specification: [''],
    quantity: [1, [Validators.required, Validators.min(1)]],
    sellingPrice: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    amountSellingPrice: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    status: ['NEW' as OrderStatus, [Validators.required]],
    paymentStatus: ['UNPAID' as PaymentStatus, [Validators.required]],
    yuanPrice: this.fb.control<number | null>(null),
    importPrice: this.fb.control<number | null>(null),
    supplier: [''],
    warehousePayment: [0],
    shippingWeightFee: [0],
    shippingPaymentDate: [''],
    refundAmount: [0],
    refundStatus: [''],
    note: [''],
  });

  readonly pageData = signal<PagedResult<Order>>({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });

  ngOnInit(): void {
    this.loadLatestCurrencyRate();
    this.fetch(1);
  }

  onSearch(): void {
    this.fetch(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pageData().totalPages) {
      return;
    }

    this.fetch(page);
  }

  onPageSizeChange(rawValue: string): void {
    const nextSize = Number(rawValue);
    if (!Number.isNaN(nextSize) && nextSize > 0) {
      this.pageData.update((data) => ({ ...data, pageSize: nextSize }));
      this.fetch(1);
    }
  }

  selectedFilterStatusLabel(): string {
    const status = this.form.controls.status.value as OrderStatus | '';
    return status ? this.orderStatusLabels[status] : 'Tất cả trạng thái';
  }

  filterStatusSelectOptions(): SearchSelectOption[] {
    return [
      { id: 0, label: 'Tất cả trạng thái', raw: '' },
      ...this.orderStatuses.map((status, index) => ({
        id: index + 1,
        label: this.orderStatusLabels[status],
        raw: status,
      })),
    ];
  }

  selectFilterStatus(option: SearchSelectOption): void {
    this.form.patchValue({ status: (option.raw as OrderStatus | '') ?? '' });
  }

  pageSizeSelectOptions(): SearchSelectOption[] {
    return [10, 20, 50].map((size, index) => ({
      id: index + 1,
      label: String(size),
      raw: String(size),
    }));
  }

  selectPageSize(option: SearchSelectOption): void {
    const raw = String(option.raw ?? option.label);
    this.onPageSizeChange(raw);
  }

  supplierSelectOptions(): SearchSelectOption[] {
    return this.supplierOptionsForForm().map((source, index) => ({
      id: index + 1,
      label: source,
      raw: source,
    }));
  }

  selectSupplier(option: SearchSelectOption): void {
    this.orderForm.patchValue({ supplier: String(option.raw ?? option.label) });
  }

  orderStatusSelectOptions(): SearchSelectOption[] {
    return this.orderStatuses.map((status, index) => ({
      id: index + 1,
      label: this.orderStatusLabels[status],
      raw: status,
    }));
  }

  selectOrderStatus(option: SearchSelectOption): void {
    const status = option.raw as OrderStatus | undefined;
    if (!status) {
      return;
    }
    this.orderForm.patchValue({ status });
  }

  paymentStatusSelectOptions(): SearchSelectOption[] {
    return this.paymentStatuses.map((status, index) => ({
      id: index + 1,
      label: this.paymentStatusLabels[status],
      raw: status,
    }));
  }

  selectPaymentStatus(option: SearchSelectOption): void {
    const paymentStatus = option.raw as PaymentStatus | undefined;
    if (!paymentStatus) {
      return;
    }
    this.orderForm.patchValue({ paymentStatus });
  }

  openCreateModal(): void {
    this.editingOrderId.set(null);
    this.originalEditStatus.set(null);
    this.formError.set('');
    this.loadLatestCurrencyRate();
    this.orderForm.reset({
      orderCode: generateOrderCode(),
      orderDate: today(),
      customerName: '',
      productName: '',
      specification: '',
      quantity: 1,
      sellingPrice: null,
      amountSellingPrice: null,
      status: 'NEW',
      paymentStatus: 'UNPAID',
      yuanPrice: null,
      importPrice: null,
      supplier: this.supplierOptions[0],
      warehousePayment: 0,
      shippingWeightFee: 0,
      shippingPaymentDate: '',
      refundAmount: 0,
      refundStatus: '',
      note: '',
    });
    this.orderForm.markAsPristine();
    this.showFormModal.set(true);
    this.formModalClosing.set(false);
    this.searchCustomers('');
    this.searchProducts('');
    this.focusOrderModal();
  }

  openEditModal(id: number): void {
    if (this.loadingEdit()) {
      return;
    }

    this.editingOrderId.set(id);
    this.formError.set('');
    this.loadingEdit.set(true);
    this.ordersService
      .detail(id)
      .pipe(
        timeout(20000),
        finalize(() => this.loadingEdit.set(false)),
      )
      .subscribe({
        next: (order) => {
          this.originalEditStatus.set(order.status);
          this.orderForm.patchValue({
            orderCode: order.orderCode,
            orderDate: order.orderDate?.slice(0, 10),
            customerName: order.customerName,
            productName: order.productName,
            specification: order.specification ?? '',
            quantity: order.quantity,
            sellingPrice: order.sellingPrice,
            amountSellingPrice: order.amountSellingPrice,
            status: order.status,
            paymentStatus: order.paymentStatus,
            yuanPrice: order.yuanPrice ?? 0,
            importPrice: order.importPrice ?? 0,
            supplier: normalizeSupplier(order.supplier, this.supplierOptions),
            warehousePayment: order.warehousePayment ?? 0,
            shippingWeightFee: order.shippingWeightFee ?? 0,
            shippingPaymentDate: order.shippingPaymentDate?.slice(0, 10) ?? '',
            refundAmount: order.refundAmount ?? 0,
            refundStatus: order.refundStatus ?? '',
            note: order.note ?? '',
          });
          this.orderForm.markAsPristine();
          this.loadLatestCurrencyRate();
          this.showFormModal.set(true);
          this.formModalClosing.set(false);
          this.focusOrderModal();
          setTimeout(() => this.formatPriceInputsDisplay(), 50);
        },
        error: () => {
          this.editingOrderId.set(null);
          this.originalEditStatus.set(null);
          this.toastService.error('Không thể tải chi tiết đơn hàng. Vui lòng thử lại.');
        },
      });
  }

  closeFormModal(): void {
    this.formModalClosing.set(true);
    this.showSaveConfirm.set(false);
    this.formError.set('');
    this.saving.set(false);
    this.originalEditStatus.set(null);
    setTimeout(() => {
      this.showFormModal.set(false);
      this.formModalClosing.set(false);
    }, 180);
  }

  onFormEsc(event: Event): void {
    event.preventDefault();
    this.closeFormModal();
  }

  onFormKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }

    const host = this.orderModalRoot?.nativeElement;
    if (!host) {
      return;
    }

    const focusables = host.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (!focusables.length) {
      event.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  requestSave(): void {
    if (this.saving()) {
      return;
    }

    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      this.formError.set('Vui lòng nhập đầy đủ thông tin bắt buộc trước khi lưu.');
      return;
    }

    this.formError.set('');
    this.showSaveConfirm.set(true);
  }

  confirmSave(): void {
    if (this.orderForm.invalid || this.saving()) {
      this.showSaveConfirm.set(false);
      return;
    }

    this.showSaveConfirm.set(false);
    this.saving.set(true);

    const raw = this.orderForm.getRawValue();
    const orderCode =
      raw.orderCode?.trim() || (!this.editingOrderId() ? generateOrderCode() : raw.orderCode);
    const payload: OrderUpsertRequest = {
      ...raw,
      orderCode,
      sellingPrice: Number(raw.sellingPrice ?? 0),
      yuanPrice: Number(raw.yuanPrice ?? 0),
      importPrice: Number(raw.importPrice ?? 0),
      shippingPaymentDate: raw.shippingPaymentDate || null,
    };

    const editingId = this.editingOrderId();
    const previousStatus = this.originalEditStatus();
    const shouldSyncStatus =
      editingId !== null && previousStatus !== null && payload.status !== previousStatus;

    const request$ =
      editingId !== null
        ? this.ordersService
            .update(editingId, payload)
            .pipe(
              switchMap((updatedOrder) =>
                shouldSyncStatus
                  ? this.ordersService.updateStatus(editingId, payload.status)
                  : of(updatedOrder),
              ),
            )
        : this.ensureMasterDataForCreate(payload).pipe(
            switchMap(() => this.ordersService.create(payload)),
          );

    request$
      .pipe(
        timeout(20000),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toastService.success(
            editingId !== null ? 'Cập nhật đơn hàng thành công.' : 'Tạo đơn hàng thành công.',
          );
          this.closeFormModal();
          this.fetch(this.pageData().page);
        },
        error: (error) => {
          this.formError.set(resolveOrderSaveError(error));
        },
      });
  }

  onDelete(id: number): void {
    this.deletingOrderId = id;
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.deletingOrderId = null;
  }

  requestStatusChange(order: Order, rawStatus: string, target?: HTMLSelectElement): void {
    target?.blur();
    if (target) {
      target.value = order.status;
    }

    const nextStatus = rawStatus as OrderStatus;
    if (
      !this.statusUpdateOptions.includes(nextStatus) ||
      nextStatus === order.status ||
      this.statusSaving()
    ) {
      return;
    }

    this.pendingStatusOrderId = order.id;
    this.pendingStatusOrderCode = order.orderCode;
    this.pendingStatusValue = nextStatus;
    this.showStatusConfirm.set(true);
  }

  cancelStatusChange(): void {
    this.showStatusConfirm.set(false);
    this.pendingStatusOrderId = null;
    this.pendingStatusOrderCode = null;
    this.pendingStatusValue = null;
  }

  confirmStatusChange(): void {
    const targetId = this.pendingStatusOrderId;
    const nextStatus = this.pendingStatusValue;
    if (!targetId || !nextStatus || this.statusSaving()) {
      this.cancelStatusChange();
      return;
    }

    this.showStatusConfirm.set(false);
    this.statusSaving.set(true);

    this.ordersService
      .updateStatus(targetId, nextStatus)
      .pipe(
        timeout(20000),
        finalize(() => this.statusSaving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toastService.success('Cập nhật trạng thái đơn hàng thành công.');
          this.cancelStatusChange();
          this.fetch(this.pageData().page);
        },
        error: () => {
          this.cancelStatusChange();
          this.toastService.error('Không thể cập nhật trạng thái. Vui lòng thử lại.');
        },
      });
  }

  statusConfirmMessage(): string {
    if (!this.pendingStatusOrderCode || !this.pendingStatusValue) {
      return 'Bạn có chắc chắn muốn cập nhật trạng thái đơn hàng?';
    }

    return `Bạn có chắc chắn muốn cập nhật đơn ${this.pendingStatusOrderCode} sang trạng thái "${this.orderStatusLabels[this.pendingStatusValue]}"?`;
  }

  requestPaymentStatusChange(order: Order, nextStatus: PaymentStatus): void {
    if (
      !this.paymentStatuses.includes(nextStatus) ||
      nextStatus === order.paymentStatus ||
      this.paymentStatusSaving()
    ) {
      return;
    }

    this.pendingPaymentStatusOrderId = order.id;
    this.pendingPaymentStatusOrderCode = order.orderCode;
    this.pendingPaymentStatusValue = nextStatus;
    this.showPaymentStatusConfirm.set(true);
  }

  cancelPaymentStatusChange(): void {
    this.showPaymentStatusConfirm.set(false);
    this.pendingPaymentStatusOrderId = null;
    this.pendingPaymentStatusOrderCode = null;
    this.pendingPaymentStatusValue = null;
  }

  confirmPaymentStatusChange(): void {
    const targetId = this.pendingPaymentStatusOrderId;
    const nextStatus = this.pendingPaymentStatusValue;
    if (targetId === null || !nextStatus || this.paymentStatusSaving()) {
      this.cancelPaymentStatusChange();
      return;
    }

    this.showPaymentStatusConfirm.set(false);
    this.paymentStatusSaving.set(true);

    this.ordersService
      .updatePaymentStatus(targetId, nextStatus)
      .pipe(
        timeout(20000),
        finalize(() => this.paymentStatusSaving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toastService.success('Cập nhật trạng thái thanh toán thành công.');
          this.cancelPaymentStatusChange();
          this.fetch(this.pageData().page);
        },
        error: () => {
          this.cancelPaymentStatusChange();
          this.toastService.error(
            'Không thể cập nhật trạng thái thanh toán. Vui lòng thử lại.',
          );
        },
      });
  }

  paymentStatusConfirmMessage(): string {
    if (!this.pendingPaymentStatusOrderCode || !this.pendingPaymentStatusValue) {
      return 'Bạn có chắc chắn muốn cập nhật trạng thái thanh toán?';
    }

    return `Bạn có chắc chắn muốn cập nhật thanh toán đơn ${this.pendingPaymentStatusOrderCode} sang "${this.paymentStatusLabels[this.pendingPaymentStatusValue]}"?`;
  }

  onCustomerTyped(value: string): void {
    const customerName = value.trim();
    if (!customerName) {
      return;
    }

    this.orderForm.patchValue({ customerName });
  }

  onProductTyped(value: string): void {
    const productName = value.trim();
    if (!productName) {
      return;
    }

    this.orderForm.patchValue({ productName });
    this.tryApplyMatchedProduct(productName);
  }

  private tryApplyMatchedProductSearch(productName: string): void {
    const normalizedName = normalizeText(productName);
    if (!normalizedName) {
      return;
    }

    const matched = this.productLookupOptions().find(
      (option) => normalizeText(option.label) === normalizedName,
    );
    if (!matched) {
      return;
    }

    const product = matched.raw as Product | undefined;
    if (!product) {
      return;
    }

    this.form.patchValue({
      productName: product?.name?.trim() || productName,
    });
  }

  onProductTypedSearch(value: string): void {
    const productName = value.trim();
    if (!productName) {
      return;
    }

    this.form.patchValue({ productName });
    this.tryApplyMatchedProductSearch(productName);
  }

  selectCustomerSearch(option: SearchSelectOption): void {
    const customer = option.raw as Customer | undefined;
    const customerName = customer?.fullName?.trim() || option.label;
    this.form.patchValue({ customerName });
  }

  onCustomerTypedSearch(value: string): void {
    const customerName = value.trim();
    if (!customerName) {
      return;
    }

    this.form.patchValue({ customerName });
  }

  selectProductSearch(option: SearchSelectOption): void {
    const product = option.raw as Product | undefined;
    this.form.patchValue({
      productName: product?.name?.trim() || option.label,
    });
  }

  clearProductSearch(): void {
    this.form.patchValue({
      productName: '',
    });
  }

  clearCustomerSearch(): void {
    this.form.patchValue({
      customerName: '',
    });
  }

  onPriceInput(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;

    const rawValue = input.value.replace(/[^0-9]/g, '');
    input.value = this.formatNumberDisplay(rawValue);
  }

  onPriceInputFloat(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;

    let value = input.value;

    // Chỉ cho phép số và dấu .
    value = value.replace(/[^0-9.]/g, '');

    // Chỉ giữ lại 1 dấu .
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    input.value = value;
  }

  savePriceValue(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;

    let rawValue = input.value;

    // Cho phép số và dấu .
    rawValue = rawValue.replace(/[^0-9.]/g, '');

    // Chỉ giữ lại 1 dấu .
    const parts = rawValue.split('.');
    if (parts.length > 2) {
      rawValue = parts[0] + '.' + parts.slice(1).join('');
    }

    if (!rawValue) {
      this.orderForm.get(fieldName)?.setValue(null);
      input.value = '';

      if (fieldName === 'yuanPrice') {
        this.orderForm.controls.importPrice.setValue(null);
        this.clearPriceInputDisplay('importPrice');
      }

      if (fieldName === 'sellingPrice') {
        this.orderForm.controls.amountSellingPrice.setValue(null);
        this.clearPriceInputDisplay('amountSellingPrice');
      }
      return;
    }

    const numValue = parseFloat(rawValue);

    this.orderForm.get(fieldName)?.setValue(numValue);

    // Hiển thị lại giá trị
    input.value = numValue.toString();

    if (fieldName === 'yuanPrice') {
      this.updateImportPriceFromYuan(numValue);
    }

    if (fieldName === 'sellingPrice') {
      this.updateAmountSellingPriceFromSellingPrice();
    }
  }

  private formatNumberDisplay(value: string): string {
    if (!value) return '';
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  private clearPriceInputDisplay(fieldName: string): void {
    const input = document.querySelector(
      `input[formControlName="${fieldName}"]`,
    ) as HTMLInputElement | null;
    if (input) {
      input.value = '';
    }
  }

  private formatPriceInputsDisplay(): void {
    const priceFields = [
      'sellingPrice',
      'amountSellingPrice',
      'yuanPrice',
      'importPrice',
      'warehousePayment',
      'shippingWeightFee',
      'refundAmount',
    ];
    priceFields.forEach((fieldName) => {
      const control = this.orderForm.get(fieldName);
      if (control?.value) {
        const input = document.querySelector(
          `input[formControlName="${fieldName}"]`,
        ) as HTMLInputElement;
        if (input) {
          input.value = this.formatNumberDisplay(control.value.toString());
        }
      }
    });
  }

  private loadLatestCurrencyRate(): void {
    this.currencyRatesService
      .latest()
      .pipe(timeout(20000))
      .subscribe({
        next: (rate) => {
          this.currencyRate = Number(rate?.rate) > 0 ? Number(rate?.rate) : 1;
          if (this.orderForm.controls.yuanPrice.dirty) {
            this.updateImportPriceFromYuan(Number(this.orderForm.controls.yuanPrice.value) || 0);
          }
        },
        error: () => {
          this.currencyRate = 1;
        },
      });
  }

  private updateImportPriceFromYuan(yuanPrice: number): void {
    const importPrice = Math.round(yuanPrice * this.currencyRate);
    this.orderForm.controls.importPrice.setValue(importPrice);

    const input = document.querySelector(
      'input[formControlName="importPrice"]',
    ) as HTMLInputElement | null;
    if (input) {
      input.value = this.formatNumberDisplay(String(importPrice));
    }
  }

  public updateAmountSellingPriceFromSellingPrice(): void {
    const quantity = Number(this.orderForm.get('quantity')?.value || 0);
    const sellingPrice = Number(this.orderForm.get('sellingPrice')?.value || 0);

    // Làm tròn 2 chữ số thập phân
    const amountSellingPrice = Math.round(sellingPrice * quantity * 100) / 100;

    this.orderForm.controls.amountSellingPrice.setValue(amountSellingPrice, { emitEvent: false });

    const input = document.querySelector(
      'input[formControlName="amountSellingPrice"]',
    ) as HTMLInputElement | null;

    if (input) {
      input.value = amountSellingPrice.toLocaleString('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
  }

  searchCustomers(term: string): void {
    this.customerLookupSearch = term;
    this.loadCustomerOptions(1, term, false);
  }

  loadMoreCustomers(): void {
    if (
      !this.customerLookupHasMore() ||
      this.customerLookupLoading() ||
      this.customerLookupLoadingMore()
    ) {
      return;
    }

    this.loadCustomerOptions(this.customerLookupPage + 1, this.customerLookupSearch, true);
  }

  selectCustomer(option: SearchSelectOption): void {
    const customer = option.raw as Customer | undefined;
    const customerName = customer?.fullName?.trim() || option.label;
    this.orderForm.patchValue({ customerName });
  }

  searchProducts(term: string): void {
    this.productLookupSearch = term;
    this.loadProductOptions(1, term, false);
  }

  loadMoreProducts(): void {
    if (
      !this.productLookupHasMore() ||
      this.productLookupLoading() ||
      this.productLookupLoadingMore()
    ) {
      return;
    }

    this.loadProductOptions(this.productLookupPage + 1, this.productLookupSearch, true);
  }

  selectProduct(option: SearchSelectOption): void {
    const product = option.raw as Product | undefined;
    const currentSpecification = this.orderForm.controls.specification.value?.trim();
    const currentSellingPrice = Number(this.orderForm.controls.sellingPrice.value) || 0;

    this.orderForm.patchValue({
      productName: product?.name?.trim() || option.label,
      specification: currentSpecification || product?.specification || '',
      sellingPrice: Number(product?.defaultSellingPrice ?? 0),
    });

    const input = document.querySelector('input[formControlName="sellingPrice"]',) as HTMLInputElement | null;
    if (input) {
      input.value = this.formatNumberDisplay(String(product?.defaultSellingPrice ?? 0));
      this.updateAmountSellingPriceFromSellingPrice();
    }
  }

  supplierOptionsForForm(): string[] {
    const currentSupplier = this.orderForm.controls.supplier.value?.trim();
    if (!currentSupplier || this.supplierOptions.includes(currentSupplier)) {
      return this.supplierOptions;
    }

    return [currentSupplier, ...this.supplierOptions];
  }

  rowStatusOptions(order: Order): OrderStatus[] {
    // Always include current status first, then other available statuses
    const hasCurrentStatus = this.statusUpdateOptions.includes(order.status);
    if (hasCurrentStatus) {
      // Put current status first for better UX
      return [order.status, ...this.statusUpdateOptions.filter((s) => s !== order.status)];
    }
    // Current status not in standard options, add it first
    return [order.status, ...this.statusUpdateOptions];
  }

  rowStatusSelectOptions(order: Order): SearchSelectOption[] {
    return this.rowStatusOptions(order).map((status, index) => ({
      id: index + 1,
      label: this.orderStatusLabels[status],
      raw: status,
    }));
  }

  requestStatusOptionChange(order: Order, option: SearchSelectOption): void {
    const status = option.raw as OrderStatus | undefined;
    if (!status) {
      return;
    }
    this.requestStatusChange(order, status);
  }

  rowPaymentStatusSelectOptions(order: Order): SearchSelectOption[] {
    const statuses = [
      order.paymentStatus,
      ...this.paymentStatuses.filter((status) => status !== order.paymentStatus),
    ];
    return statuses.map((status, index) => ({
      id: index + 1,
      label: this.paymentStatusLabels[status],
      raw: status,
    }));
  }

  requestPaymentStatusOptionChange(order: Order, option: SearchSelectOption): void {
    const paymentStatus = option.raw as PaymentStatus | undefined;
    if (paymentStatus) {
      this.requestPaymentStatusChange(order, paymentStatus);
    }
  }

  isRowPaymentStatusReadonly(order: Order): boolean {
    return this.paymentStatusSaving() || order.status === 'DELETED';
  }

  isRowStatusReadonly(order: Order): boolean {
    return this.statusSaving() || order.status === 'DELETED';
  }

  openViewModal(id: number): void {
    if (this.loadingEdit()) {
      return;
    }

    this.loadingEdit.set(true);
    this.ordersService
      .detail(id)
      .pipe(
        timeout(20000),
        finalize(() => this.loadingEdit.set(false)),
      )
      .subscribe({
        next: (order) => {
          this.viewingOrder.set(order);
          this.showViewModal.set(true);
          this.viewModalClosing.set(false);
        },
        error: () => {
          this.toastService.error('Không thể tải chi tiết đơn hàng. Vui lòng thử lại.');
        },
      });
  }

  closeViewModal(): void {
    this.viewModalClosing.set(true);
    setTimeout(() => {
      this.showViewModal.set(false);
      this.viewModalClosing.set(false);
      this.viewingOrder.set(null);
    }, 180);
  }

  confirmDelete(): void {
    const targetOrderId = this.deletingOrderId;
    if (!targetOrderId || this.deleting()) {
      this.cancelDelete();
      return;
    }

    this.cancelDelete();
    this.deleting.set(true);
    this.ordersService
      .softDelete(targetOrderId)
      .pipe(
        timeout(20000),
        finalize(() => this.deleting.set(false)),
      )
      .subscribe({
        next: () => {
          this.toastService.success('Đã xóa đơn hàng.');
          this.fetch(this.pageData().page);
        },
        error: () => {
          this.toastService.error('Không thể xóa đơn hàng. Vui lòng thử lại.');
        },
      });
  }

  pagingSummary(): string {
    const data = this.pageData();
    if (!data.totalItems) {
      return '0 kết quả';
    }

    const from = (data.page - 1) * data.pageSize + 1;
    const to = Math.min(data.page * data.pageSize, data.totalItems);
    return `${from}-${to} / ${data.totalItems}`;
  }

  private generateCustomerCode(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `CUS${yyyy}${mm}${dd}${hh}${mi}${ss}${ms}`;
  }

  private generateProductCode(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `PRD${yyyy}${mm}${dd}${hh}${mi}${ss}${ms}`;
  }

  private ensureMasterDataForCreate(payload: OrderUpsertRequest) {
    return this.ensureCustomerExists(payload.customerName).pipe(
      switchMap(() =>
        this.ensureProductExists(payload.productName, payload.specification, payload.sellingPrice),
      ),
    );
  }

  private ensureCustomerExists(customerName: string) {
    const normalizedName = customerName.trim();
    if (!normalizedName) {
      return of(void 0);
    }

    return this.customersService
      .list({ page: 1, pageSize: OrdersPage.LOOKUP_PAGE_SIZE, search: normalizedName })
      .pipe(
        switchMap((result) => {
          const exists = result.items.some(
            (customer) => normalizeText(customer.fullName) === normalizeText(normalizedName),
          );
          if (exists) {
            return of(void 0);
          }

          const request: CustomerUpsertRequest = {
            customerCode: this.generateCustomerCode(),
            fullName: normalizedName,
            phone: '',
            email: '',
            address: '',
            note: 'Tự động tạo từ đơn hàng',
          };

          return this.customersService.create(request).pipe(
            map(() => void 0),
            switchMap(() => {
              this.toastService.success(`Đã tự động thêm khách hàng mới: ${normalizedName}`);
              return of(void 0);
            }),
          );
        }),
      );
  }

  private ensureProductExists(productName: string, specification?: string, sellingPrice?: number) {
    const normalizedName = productName.trim();
    if (!normalizedName) {
      return of(void 0);
    }

    return this.productsService
      .list({ page: 1, pageSize: OrdersPage.LOOKUP_PAGE_SIZE, search: normalizedName })
      .pipe(
        switchMap((result) => {
          const exists = result.items.some(
            (product) => normalizeText(product.name) === normalizeText(normalizedName),
          );
          if (exists) {
            return of(void 0);
          }

          const request: ProductUpsertRequest = {
            productCode: this.generateProductCode(),
            name: normalizedName,
            specification: specification?.trim() || '',
            unit: '',
            defaultSellingPrice: Number(sellingPrice ?? 0),
            note: 'Tự động tạo từ đơn hàng',
          };

          return this.productsService.create(request).pipe(
            map(() => void 0),
            switchMap(() => {
              this.toastService.success(`Đã tự động thêm sản phẩm mới: ${normalizedName}`);
              return of(void 0);
            }),
          );
        }),
      );
  }

  private tryApplyMatchedProduct(productName: string): void {
    const normalizedName = normalizeText(productName);
    if (!normalizedName) {
      return;
    }

    const matched = this.productLookupOptions().find(
      (option) => normalizeText(option.label) === normalizedName,
    );
    if (!matched) {
      return;
    }

    const product = matched.raw as Product | undefined;
    if (!product) {
      return;
    }

    const currentSpecification = this.orderForm.controls.specification.value?.trim();
    const currentSellingPrice = Number(this.orderForm.controls.sellingPrice.value) || 0;
    this.orderForm.patchValue({
      specification: currentSpecification || product.specification || '',
      sellingPrice:
        currentSellingPrice > 0 ? currentSellingPrice : Number(product.defaultSellingPrice ?? 0),
    });
  }

  private fetch(page: number): void {
    const filters = this.form.getRawValue();
    this.loading.set(true);

    this.ordersService
      .list({
        page,
        pageSize: this.pageData().pageSize,
        customerName: filters.customerName,
        productName: filters.productName,
        status: filters.status as OrderStatus | '',
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        sort: 'desc',
      })
      .pipe(
        timeout(20000),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (result) => this.pageData.set(result),
        error: () => {
          // Keep current data and avoid uncaught errors that can lock interaction flows.
          this.toastService.error('Không thể tải danh sách đơn hàng. Vui lòng thử lại.');
        },
      });
  }

  private loadCustomerOptions(page: number, search: string, append: boolean): void {
    (append ? this.customerLookupLoadingMore : this.customerLookupLoading).set(true);

    this.customersService
      .list({
        page,
        pageSize: OrdersPage.LOOKUP_PAGE_SIZE,
        search,
      })
      .pipe(
        timeout(20000),
        finalize(() => {
          this.customerLookupLoading.set(false);
          this.customerLookupLoadingMore.set(false);
        }),
      )
      .subscribe({
        next: (result) => {
          this.customerLookupPage = result.page;
          this.customerLookupOptions.set(
            append
              ? [
                  ...this.customerLookupOptions(),
                  ...result.items.map((customer) => toCustomerLookupOption(customer)),
                ]
              : result.items.map((customer) => toCustomerLookupOption(customer)),
          );
          this.customerLookupHasMore.set(result.page < result.totalPages);
        },
        error: () => {
          this.customerLookupHasMore.set(false);
          this.toastService.error('Không thể tải danh sách khách hàng. Vui lòng thử lại.');
        },
      });
  }

  private loadProductOptions(page: number, search: string, append: boolean): void {
    (append ? this.productLookupLoadingMore : this.productLookupLoading).set(true);

    this.productsService
      .list({
        page,
        pageSize: OrdersPage.LOOKUP_PAGE_SIZE,
        search,
      })
      .pipe(
        timeout(20000),
        finalize(() => {
          this.productLookupLoading.set(false);
          this.productLookupLoadingMore.set(false);
        }),
      )
      .subscribe({
        next: (result) => {
          this.productLookupPage = result.page;
          this.productLookupOptions.set(
            append
              ? [
                  ...this.productLookupOptions(),
                  ...result.items.map((product) => toProductLookupOption(product)),
                ]
              : result.items.map((product) => toProductLookupOption(product)),
          );
          this.productLookupHasMore.set(result.page < result.totalPages);
        },
        error: () => {
          this.productLookupHasMore.set(false);
          this.toastService.error('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
        },
      });
  }

  private focusOrderModal(): void {
    setTimeout(() => this.orderModalRoot?.nativeElement.focus(), 0);
  }
}

function today(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function firstDayOfYear(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  return `${yyyy}-01-01`;
}

function generateOrderCode(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `OD${yyyy}${mm}${dd}${hh}${mi}${ss}${ms}`;
}

function resolveOrderSaveError(error: unknown): string {
  const fallback = 'Không thể lưu đơn hàng. Vui lòng thử lại.';

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const asRecord = error as Record<string, unknown>;
  const body = asRecord['error'];

  if (typeof body === 'string' && body.trim()) {
    return body;
  }

  if (body && typeof body === 'object') {
    const bodyRecord = body as Record<string, unknown>;
    const message = bodyRecord['message'];
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  const message = asRecord['message'];
  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return fallback;
}

function toCustomerLookupOption(customer: Customer): SearchSelectOption {
  const descriptionParts = [customer.customerCode, customer.phone].filter((value) => !!value?.trim());
  return {
    id: customer.id,
    label: customer.fullName,
    description: descriptionParts.join(' • '),
    raw: customer
  };
}

function toProductLookupOption(product: Product): SearchSelectOption {
  const descriptionParts = [product.productCode, product.unit, product.defaultSellingPrice ? `${product.defaultSellingPrice}` : ''].filter((value) => !!value?.trim());
  return {
    id: product.id,
    label: product.name,
    description: descriptionParts.join(' • '),
    raw: product
  };
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function normalizeSupplier(value: string | undefined, supplierOptions: readonly string[]): string {
  const normalized = value?.trim();
  if (!normalized) {
    return supplierOptions[0] ?? '';
  }

  return normalized;
}
