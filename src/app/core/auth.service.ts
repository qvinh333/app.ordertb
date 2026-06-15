import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, timeout } from 'rxjs';
import { API_BASE_URL } from './constants';
import { SKIP_API_ERROR_TOAST } from './api-context';
import { LoginResponse, UserProfile } from './models';
import { unwrapApiResponse } from './helpers';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'sale_app_token';
  private readonly userKey = 'sale_app_user';
  private readonly apiBase = API_BASE_URL;

  private readonly currentUserSignal = signal<UserProfile | null>(this.readUserFromStorage());
  private readonly tokenSignal = signal<string | null>(this.readTokenFromStorage());

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'ADMIN');

  constructor(private readonly http: HttpClient) {}

  login(username: string, password: string): Observable<UserProfile> {
    return this.http
      .post(`${this.apiBase}/api/auth/login`, { username, password }, { context: new HttpContext().set(SKIP_API_ERROR_TOAST, true) })
      .pipe(
        map((payload) => unwrapApiResponse<LoginResponse>(payload as LoginResponse)),
        tap((response) => {
          this.persistSession(response.accessToken, response.user);
        }),
        map((response) => response.user)
      );
  }

  me(): Observable<UserProfile> {
    return this.http
      .get(`${this.apiBase}/api/auth/me`, { context: new HttpContext().set(SKIP_API_ERROR_TOAST, true) })
      .pipe(
      map((payload) => unwrapApiResponse<UserProfile>(payload as UserProfile)),
      tap((user) => {
        this.currentUserSignal.set(user);
        localStorage.setItem(this.userKey, JSON.stringify(user));
      })
      );
  }

  logout(): Observable<void> {
    this.clearSession();
    return this.http.post(`${this.apiBase}/api/auth/logout`, {}).pipe(
      timeout(8000),
      map(() => void 0),
      catchError(() => of(void 0))
    );
  }

  clearSession(): void {
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  getAccessToken(): string | null {
    return this.tokenSignal();
  }

  private persistSession(token: string, user: UserProfile): void {
    this.tokenSignal.set(token);
    this.currentUserSignal.set(user);
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  private readTokenFromStorage(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private readUserFromStorage(): UserProfile | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  }
}

