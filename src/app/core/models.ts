export type UserRole = 'ADMIN' | 'SELLER';

export type OrderStatus =
  | 'DRAFT'
  | 'NEW'
  | 'ORDERED'
  | 'ARRIVED'
  | 'CANCELLED'
  | 'DELETED';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PagedResult<T> {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: UserProfile;
}

export interface UserCreateRequest {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
}

export interface UserUpdateRequest {
  fullName: string;
  role: UserRole;
  isActive?: boolean;
}

export interface Order {
  id: number;
  orderCode: string;
  orderDate: string;
  customerName: string;
  productName: string;
  specification?: string;
  quantity: number;
  sellingPrice: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  yuanPrice?: number;
  importPrice?: number;
  supplier?: string;
  warehousePayment?: number;
  shippingWeightFee?: number;
  shippingPaymentDate?: string | null;
  refundAmount?: number;
  refundStatus?: string;
  note?: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface OrderUpsertRequest {
  orderCode: string;
  orderDate: string;
  customerName: string;
  productName: string;
  specification?: string;
  quantity: number;
  sellingPrice: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  yuanPrice?: number;
  importPrice?: number;
  supplier?: string;
  warehousePayment?: number;
  shippingWeightFee?: number;
  shippingPaymentDate?: string | null;
  refundAmount?: number;
  refundStatus?: string;
  note?: string;
}

export interface Product {
  id: number;
  productCode: string;
  name: string;
  specification?: string;
  unit?: string;
  defaultSellingPrice?: number;
  note?: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface ProductUpsertRequest {
  productCode: string;
  name: string;
  specification?: string;
  unit?: string;
  defaultSellingPrice?: number;
  note?: string;
}

export interface Customer {
  id: number;
  customerCode: string;
  fullName: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface CustomerUpsertRequest {
  customerCode: string;
  fullName: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
}

export interface CurrencyRate {
  id: number;
  rate: number;
  note?: string;
  createdBy?: number;
  createdAt?: string;
}

export interface CurrencyRateCreateRequest {
  rate: number;
  note?: string;
}

export interface DashboardOrderStatus {
  draft: number;
  new: number;
  ordered: number;
  arrived: number;
  cancelled: number;
  deleted: number;
}

export interface DashboardRevenue {
  totalOrders: number;
  totalSellingPrice: number;
  totalImportPrice: number;
  estimatedProfit: number;
}

export interface DashboardOrdersByDate {
  date: string;
  count: number;
}

