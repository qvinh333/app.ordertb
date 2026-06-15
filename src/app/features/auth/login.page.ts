import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-page">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="card">
        <h1>
          <span class="title-with-icon">
            <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 19V5"/></svg>
            <span>Đăng nhập</span>
          </span>
        </h1>
        <p>Sử dụng tài khoản ADMIN hoặc SELLER để truy cập hệ thống.</p>

        <label>
          Tên đăng nhập
          <input formControlName="username" placeholder="admin" />
        </label>

        <label>
          Mật khẩu
          <input type="password" formControlName="password" placeholder="******" />
        </label>

        @if (errorMessage()) {
          <div class="error">{{ errorMessage() }}</div>
        }

        <button type="submit" [disabled]="form.invalid || loading()">
          <span class="btn-content">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 19V5"/></svg>
            <span>{{ loading() ? 'Đang xử lý...' : 'Đăng nhập' }}</span>
          </span>
        </button>
      </form>
    </div>
  `,
  styles: `
    .login-page {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: radial-gradient(circle at top right, #dbeafe 0%, #eef4ff 35%, #f4f7fc 100%);
    }

    .card {
      width: min(420px, 100%);
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: var(--shadow-md);
      backdrop-filter: blur(8px);
      padding: 1.3rem;
      display: grid;
      gap: 0.9rem;
    }

    h1 {
      margin: 0;
      font-size: 1.35rem;
    }

    .title-with-icon {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
    }

    .title-icon {
      width: 1.1rem;
      height: 1.1rem;
      color: var(--primary);
    }

    p {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    label {
      display: grid;
      gap: 0.35rem;
      font-size: 0.9rem;
      color: #344054;
    }

    input {
      border: 1px solid #d0d5dd;
      border-radius: 10px;
      padding: 0.56rem 0.68rem;
      font-size: 0.95rem;
    }

    button {
      border: 0;
      border-radius: 10px;
      padding: 0.64rem;
      background: linear-gradient(90deg, var(--primary), var(--primary-600));
      color: #fff;
      cursor: pointer;
      font-weight: 600;
      box-shadow: 0 8px 18px rgba(64, 153, 255, 0.24);
      transition: transform 0.15s ease;
    }

    button:hover:enabled {
      transform: translateY(-1px);
    }

    button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .error {
      color: #b42318;
      background: #fef3f2;
      border: 1px solid #fecdca;
      border-radius: 0.45rem;
      padding: 0.55rem;
      font-size: 0.88rem;
    }
  `
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  onSubmit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const { username, password } = this.form.getRawValue();
    this.authService
      .login(username, password)
      .pipe(
        timeout(20000),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.toastService.success('Đăng nhập thành công.');
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message ?? 'Đăng nhập thất bại. Vui lòng kiểm tra tài khoản.');
        }
      });
  }
}

