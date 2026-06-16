import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from './constants';
import { unwrapApiResponse } from './helpers';
import { CurrencyRate, CurrencyRateCreateRequest } from './models';

@Injectable({ providedIn: 'root' })
export class CurrencyRatesService {
  private readonly apiBase = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http
      .get(`${this.apiBase}/api/currencyrates`)
      .pipe(map((payload) => unwrapApiResponse<CurrencyRate[]>(payload as CurrencyRate[])));
  }

  latest() {
    return this.http
      .get(`${this.apiBase}/api/currencyrates/latest`)
      .pipe(map((payload) => unwrapApiResponse<CurrencyRate | null>(payload as CurrencyRate | null)));
  }

  create(request: CurrencyRateCreateRequest) {
    return this.http
      .post(`${this.apiBase}/api/currencyrates`, request)
      .pipe(map((payload) => unwrapApiResponse<CurrencyRate>(payload as CurrencyRate)));
  }
}
