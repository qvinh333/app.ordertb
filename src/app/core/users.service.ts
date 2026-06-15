import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from './constants';
import { normalizePagedResult, unwrapApiResponse } from './helpers';
import { UserCreateRequest, UserProfile, UserRole, UserUpdateRequest } from './models';

export interface UserQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRole | '';
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly apiBase = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  list(query: UserQuery) {
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

    return this.http.get(`${this.apiBase}/api/users`, { params }).pipe(
      map((payload) => normalizePagedResult<UserProfile>(payload))
    );
  }

  create(request: UserCreateRequest) {
    return this.http
      .post(`${this.apiBase}/api/users`, request)
      .pipe(map((payload) => unwrapApiResponse<UserProfile>(payload as UserProfile)));
  }

  update(id: number, request: UserUpdateRequest) {
    return this.http
      .put(`${this.apiBase}/api/users/${id}`, request)
      .pipe(map((payload) => unwrapApiResponse<UserProfile>(payload as UserProfile)));
  }

  delete(id: number) {
    return this.http
      .delete(`${this.apiBase}/api/users/${id}`)
      .pipe(map((payload) => unwrapApiResponse<unknown>(payload as unknown)), map(() => void 0));
  }
}
