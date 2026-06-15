import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from './constants';
import { normalizePagedResult, unwrapApiResponse } from './helpers';
import { Product, ProductUpsertRequest } from './models';

export interface ProductQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly apiBase = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  list(query: ProductQuery) {
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

    return this.http.get(`${this.apiBase}/api/products`, { params }).pipe(
      map((payload) => normalizePagedResult<Product>(payload))
    );
  }

  detail(id: number) {
    return this.http
      .get(`${this.apiBase}/api/products/${id}`)
      .pipe(map((payload) => unwrapApiResponse<Product>(payload as Product)));
  }

  create(request: ProductUpsertRequest) {
    return this.http
      .post(`${this.apiBase}/api/products`, request)
      .pipe(map((payload) => unwrapApiResponse<Product>(payload as Product)));
  }

  update(id: number, request: ProductUpsertRequest) {
    return this.http
      .put(`${this.apiBase}/api/products/${id}`, request)
      .pipe(map((payload) => unwrapApiResponse<Product>(payload as Product)));
  }

  delete(id: number) {
    return this.http
      .delete(`${this.apiBase}/api/products/${id}`)
      .pipe(map((payload) => unwrapApiResponse<unknown>(payload as unknown)), map(() => void 0));
  }
}

