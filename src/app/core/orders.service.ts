import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from './constants';
import { normalizePagedResult, unwrapApiResponse } from './helpers';
import { Order, OrderMoneySummary, OrderStatus, OrderUpsertRequest, PaymentStatus } from './models';

export interface OrderQuery {
  page?: number;
  pageSize?: number;
  customerName?: string;
  productName?: string;
  status?: OrderStatus | '';
  paymentStatus?: PaymentStatus | '';
  fromDate?: string;
  toDate?: string;
  sort?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly apiBase = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  list(query: OrderQuery) {
    const params = toOrderParams(query);

    return this.http.get(`${this.apiBase}/api/orders`, { params }).pipe(
      map((payload) => normalizePagedResult<Order>(payload)),
      map((result) => ({
        ...result,
        items: result.items.map((item) => normalizeOrder(item))
      }))
    );
  }

  moneySummary(query: OrderQuery) {
    return this.http
      .get(`${this.apiBase}/api/orders/money-summary`, { params: toOrderParams(query) })
      .pipe(map((payload) => normalizeMoneySummary(payload)));
  }

  detail(id: number) {
    return this.http
      .get(`${this.apiBase}/api/orders/${id}`)
      .pipe(map((payload) => normalizeOrder(unwrapApiResponse<Order>(payload as Order))));
  }

  create(request: OrderUpsertRequest) {
    return this.http
      .post(`${this.apiBase}/api/orders`, request)
      .pipe(map((payload) => normalizeOrder(unwrapApiResponse<Order>(payload as Order))));
  }

  update(id: number, request: OrderUpsertRequest) {
    return this.http
      .put(`${this.apiBase}/api/orders/${id}`, request)
      .pipe(map((payload) => normalizeOrder(unwrapApiResponse<Order>(payload as Order))));
  }

  updateStatus(id: number, status: OrderStatus) {
    return this.http
      .patch(`${this.apiBase}/api/orders/${id}/status`, { status })
      .pipe(map((payload) => normalizeOrder(unwrapApiResponse<Order>(payload as Order))));
  }

  updatePaymentStatus(id: number, paymentStatus: PaymentStatus) {
    return this.http
      .patch(`${this.apiBase}/api/orders/${id}/payment-status`, { paymentStatus })
      .pipe(map((payload) => normalizeOrder(unwrapApiResponse<Order>(payload as Order))));
  }

  softDelete(id: number) {
    return this.http
      .delete(`${this.apiBase}/api/orders/${id}`)
      .pipe(map((payload) => unwrapApiResponse<unknown>(payload as unknown)), map(() => void 0));
  }
}

function toOrderParams(query: OrderQuery): HttpParams {
  let params = new HttpParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  });

  if (query.page !== undefined) {
    params = params.set('pageNumber', String(query.page));
  }

  if (query.pageSize !== undefined) {
    params = params.set('size', String(query.pageSize));
    params = params.set('limit', String(query.pageSize));
  }

  return params;
}

function normalizeMoneySummary(payload: unknown): OrderMoneySummary {
  const data = unwrapApiResponse(payload as OrderMoneySummary | number);
  if (typeof data === 'number' && Number.isFinite(data)) {
    return { totalMoney: data };
  }

  const source = asRecord(data);
  return {
    totalMoney:
      toFiniteNumber(
        pickFirst(source, [
          'totalMoney',
          'total_money',
          'totalAmount',
          'total_amount',
          'totalAmountSellingPrice',
          'total_amount_selling_price',
          'amountSellingPrice',
          'amount_selling_price',
          'amountSellingPriceSum',
          'amount_selling_price_sum',
          'totalSellingPrice',
          'total_selling_price',
          'totalRevenue',
          'total_revenue',
          'revenue',
          'money',
          'total',
          'sum',
        ]),
      ) ?? 0,
  };
}

const ORDER_STATUS_VALUES: readonly OrderStatus[] = [
  'DRAFT',
  'NEW',
  'ORDERED',
  'ARRIVED',
  'CANCELLED',
  'DELETED'
];

const PAYMENT_STATUS_VALUES: readonly PaymentStatus[] = ['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED'];

const ORDER_STATUS_ALIAS_MAP: Record<string, OrderStatus> = {
  DRAFT: 'DRAFT',
  NHAP: 'DRAFT',
  NEW: 'NEW',
  MOI_TAO: 'NEW',
  MOI: 'NEW',
  ORDERED: 'ORDERED',
  DA_DAT_HANG: 'ORDERED',
  ARRIVED: 'ARRIVED',
  DA_VE_KHO: 'ARRIVED',
  CANCELLED: 'CANCELLED',
  DA_HUY: 'CANCELLED',
  DELETED: 'DELETED',
  DA_XOA: 'DELETED'
};

const PAYMENT_STATUS_ALIAS_MAP: Record<string, PaymentStatus> = {
  UNPAID: 'UNPAID',
  CHUA_THANH_TOAN: 'UNPAID',
  PARTIAL: 'PARTIAL',
  THANH_TOAN_MOT_PHAN: 'PARTIAL',
  PAID: 'PAID',
  DA_THANH_TOAN: 'PAID',
  REFUNDED: 'REFUNDED',
  DA_HOAN_TIEN: 'REFUNDED'
};

function normalizeOrder(order: Order): Order {
  const source = asRecord(order);
  return {
    ...order,
    status: normalizeOrderStatus(
      pickFirst(source, ['status', 'orderStatus', 'order_status', 'order_state']) ?? order.status
    ),
    paymentStatus: normalizePaymentStatus(
      pickFirst(source, ['paymentStatus', 'payment_status', 'payment', 'paymentState']) ?? order.paymentStatus
    )
  };
}

function normalizeOrderStatus(value: unknown): OrderStatus {
  const numericValue = toFiniteNumber(value);
  if (numericValue !== null) {
    const fromIndex = ORDER_STATUS_VALUES[numericValue];
    if (fromIndex) {
      return fromIndex;
    }
  }

  const textValue = toTextValue(value);
  if (textValue !== null) {
    const normalized = normalizeEnumText(textValue);
    const mapped = ORDER_STATUS_ALIAS_MAP[normalized];
    if (mapped) {
      return mapped;
    }

    const found = ORDER_STATUS_VALUES.find((item) => item === normalized);
    if (found) {
      return found;
    }
  }

  return 'DRAFT';
}

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const numericValue = toFiniteNumber(value);
  if (numericValue !== null) {
    const fromIndex = PAYMENT_STATUS_VALUES[numericValue];
    if (fromIndex) {
      return fromIndex;
    }
  }

  const textValue = toTextValue(value);
  if (textValue !== null) {
    const normalized = normalizeEnumText(textValue);
    const mapped = PAYMENT_STATUS_ALIAS_MAP[normalized];
    if (mapped) {
      return mapped;
    }

    const found = PAYMENT_STATUS_VALUES.find((item) => item === normalized);
    if (found) {
      return found;
    }
  }

  return 'UNPAID';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function pickFirst(obj: Record<string, unknown> | null, keys: string[]): unknown {
  if (!obj) {
    return undefined;
  }

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }

  return undefined;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (typeof value === 'object' && value !== null) {
    const candidate = pickFirst(value as Record<string, unknown>, ['value', 'id', 'code', 'status', 'paymentStatus']);
    if (candidate !== undefined) {
      return toFiniteNumber(candidate);
    }
  }

  return null;
}

function toTextValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    const candidate = pickFirst(value as Record<string, unknown>, ['name', 'label', 'text', 'value', 'status', 'paymentStatus']);
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate;
    }
  }

  return null;
}

function normalizeEnumText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

