import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class.error]="toast.type === 'error'" [class.success]="toast.type === 'success'">
          <span class="dot" aria-hidden="true"></span>
          <span>{{ toast.message }}</span>
          <button type="button" (click)="toastService.dismiss(toast.id)" aria-label="Đóng thông báo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 1000;
      display: grid;
      gap: 0.5rem;
      width: min(360px, calc(100vw - 2rem));
      pointer-events: none;
    }

    .toast {
      border: 1px solid #d0d5dd;
      border-left: 4px solid #1570ef;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.95);
      padding: 0.62rem 0.72rem;
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 0.6rem;
      box-shadow: 0 10px 26px rgba(16, 24, 40, 0.14);
      pointer-events: auto;
    }

    .toast.success {
      border-left-color: #12b76a;
    }

    .toast.error {
      border-color: #fecaca;
      border-left-color: #f04438;
      background: #fff7f7;
    }

    .dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #1570ef;
      flex: 0 0 auto;
      margin-top: 2px;
    }

    .toast.success .dot {
      background: #12b76a;
    }

    .toast.error .dot {
      background: #f04438;
    }

    .toast button {
      margin-left: auto;
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      color: #667085;
      padding: 0.2rem;
      line-height: 1;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .toast button svg {
      width: 0.85rem;
      height: 0.85rem;
    }

    .toast button:hover {
      background: rgba(0, 0, 0, 0.04);
    }

    .toast span {
      font-size: 0.9rem;
      color: #101828;
    }
  `
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
}


