import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from './constants';
import { unwrapApiResponse } from './helpers';
import { DashboardOrdersByDate, DashboardOrderStatus, DashboardRevenue } from './models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiBase = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  orderStatus() {
    return this.http
      .get(`${this.apiBase}/api/dashboard/order-status`)
      .pipe(map((payload) => unwrapApiResponse<DashboardOrderStatus>(payload as DashboardOrderStatus)));
  }

  revenue(fromDate?: string, toDate?: string) {
    let params = new HttpParams();
    if (fromDate) {
      params = params.set('fromDate', fromDate);
    }
    if (toDate) {
      params = params.set('toDate', toDate);
    }

    return this.http.get(`${this.apiBase}/api/dashboard/revenue`, { params }).pipe(
      map((payload) => unwrapApiResponse<DashboardRevenue>(payload as DashboardRevenue))
    );
  }

  ordersByDate(fromDate?: string, toDate?: string) {
    let params = new HttpParams();
    if (fromDate) {
      params = params.set('fromDate', fromDate);
    }
    if (toDate) {
      params = params.set('toDate', toDate);
    }

    return this.http.get(`${this.apiBase}/api/dashboard/orders-by-date`, { params }).pipe(
      map((payload) => unwrapApiResponse<DashboardOrdersByDate[]>(payload as DashboardOrdersByDate[]))
    );
  }
}

