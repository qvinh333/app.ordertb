import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from './constants';
import { normalizePagedResult, unwrapApiResponse } from './helpers';
import { Customer, CustomerUpsertRequest } from './models';

export interface CustomerQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly apiBase = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  list(query: CustomerQuery) {
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

    return this.http.get(`${this.apiBase}/api/customers`, { params }).pipe(
      map((payload) => normalizePagedResult<Customer>(payload))
    );
  }

  detail(id: number) {
    return this.http
      .get(`${this.apiBase}/api/customers/${id}`)
      .pipe(map((payload) => unwrapApiResponse<Customer>(payload as Customer)));
  }

  create(request: CustomerUpsertRequest) {
    return this.http
      .post(`${this.apiBase}/api/customers`, request)
      .pipe(map((payload) => unwrapApiResponse<Customer>(payload as Customer)));
  }

  update(id: number, request: CustomerUpsertRequest) {
    return this.http
      .put(`${this.apiBase}/api/customers/${id}`, request)
      .pipe(map((payload) => unwrapApiResponse<Customer>(payload as Customer)));
  }

  delete(id: number) {
    return this.http
      .delete(`${this.apiBase}/api/customers/${id}`)
      .pipe(map((payload) => unwrapApiResponse<unknown>(payload as unknown)), map(() => void 0));
  }
}

