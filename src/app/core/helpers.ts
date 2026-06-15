import { ApiResponse, PagedResult } from './models';

export function unwrapApiResponse<T>(payload: ApiResponse<T> | T): T {
  const asRecord = payload as Record<string, unknown>;
  if (typeof payload === 'object' && payload !== null && 'data' in asRecord) {
    return asRecord['data'] as T;
  }
  return payload as T;
}

export function normalizePagedResult<T>(input: unknown): PagedResult<T> {
  const payload = unwrapApiResponse(input as ApiResponse<unknown>);
  const root = asObject(payload);

  if (Array.isArray(payload)) {
    return {
      items: payload as T[],
      totalItems: payload.length,
      page: 1,
      pageSize: payload.length || 10,
      totalPages: 1
    };
  }

  const dataNode = asObject(get(root, 'data'));
  const pagination = asObject(get(root, 'pagination')) ?? asObject(get(root, 'meta')) ?? asObject(get(root, 'pageInfo')) ?? asObject(get(root, 'page_info'));

  const items =
    pickArray<T>(root, ['items', 'records', 'results', 'list', 'content', 'users', 'orders', 'products', 'customers']) ??
    pickArray<T>(dataNode, ['items', 'records', 'results', 'list', 'content', 'users', 'orders', 'products', 'customers']) ??
    [];

  const totalItems = pickNumber([
    get(root, 'totalItems'),
    get(root, 'totalCount'),
    get(root, 'total'),
    get(root, 'totalRecords'),
    get(root, 'total_items'),
    get(root, 'total_count'),
    get(root, 'total_records'),
    get(pagination, 'totalItems'),
    get(pagination, 'totalCount'),
    get(pagination, 'total'),
    get(pagination, 'totalRecords'),
    get(pagination, 'total_items'),
    get(pagination, 'total_count'),
    get(pagination, 'total_records'),
    get(pagination, 'count'),
    items.length
  ]);

  const pageSize = Math.max(
    1,
    pickNumber([
      get(root, 'pageSize'),
      get(root, 'size'),
      get(root, 'limit'),
      get(root, 'perPage'),
      get(root, 'page_size'),
      get(root, 'per_page'),
      get(pagination, 'pageSize'),
      get(pagination, 'size'),
      get(pagination, 'limit'),
      get(pagination, 'perPage'),
      get(pagination, 'page_size'),
      get(pagination, 'per_page'),
      items.length || 10
    ])
  );

  const rawPage = pickNumber([
    get(root, 'page'),
    get(root, 'pageNumber'),
    get(root, 'currentPage'),
    get(root, 'page_number'),
    get(root, 'current_page'),
    get(pagination, 'page'),
    get(pagination, 'pageNumber'),
    get(pagination, 'currentPage'),
    get(pagination, 'page_number'),
    get(pagination, 'current_page')
  ]);

  const pageIndex = pickNumber([
    get(root, 'pageIndex'),
    get(root, 'page_index'),
    get(pagination, 'pageIndex'),
    get(pagination, 'page_index')
  ]);

  const page = rawPage > 0 ? rawPage : pageIndex + 1;

  const totalPages = Math.max(
    1,
    pickNumber([
      get(root, 'totalPages'),
      get(root, 'pageCount'),
      get(root, 'total_pages'),
      get(root, 'page_count'),
      get(pagination, 'totalPages'),
      get(pagination, 'pageCount'),
      get(pagination, 'total_pages'),
      get(pagination, 'page_count')
    ]) || Math.ceil(totalItems / pageSize)
  );

  return {
    items,
    totalItems,
    page,
    pageSize,
    totalPages
  };
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function get(obj: Record<string, unknown> | null, key: string): unknown {
  return obj ? obj[key] : undefined;
}

function pickArray<T>(obj: Record<string, unknown> | null, keys: string[]): T[] | null {
  if (!obj) {
    return null;
  }

  for (const key of keys) {
    const value = obj[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return null;
}

function pickNumber(values: unknown[]): number {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return 0;
}
