import { OrderStatus, PaymentStatus, UserRole } from './models';

// export const API_BASE_URL = 'https://adventures-orlando-continuity-sharp.trycloudflare.com';
export const API_BASE_URL = 'https://api-ordertb.onrender.com';

export const USER_ROLES: UserRole[] = ['ADMIN', 'SELLER'];

export const ORDER_STATUSES: OrderStatus[] = [
  'DRAFT',
  'NEW',
  'ORDERED',
  'ARRIVED',
  'CANCELLED',
  'DELETED'
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'UNPAID',
  'PARTIAL',
  'PAID',
  'REFUNDED'
];

export const SUPPLIER_OPTIONS = ['Kho', 'Tự túc'] as const;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Quản trị viên',
  SELLER: 'Nhân viên bán hàng'
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Nháp',
  NEW: 'Mới tạo',
  ORDERED: 'Đã đặt hàng',
  ARRIVED: 'Đã về kho',
  CANCELLED: 'Đã hủy',
  DELETED: 'Đã xóa'
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PARTIAL: 'Thanh toán một phần',
  PAID: 'Đã thanh toán',
  REFUNDED: 'Đã hoàn tiền'
};

