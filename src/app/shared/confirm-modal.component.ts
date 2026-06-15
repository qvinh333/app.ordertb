import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  template: `
    @if (render) {
      <div class="overlay" [class.closing]="closing" [class.locked]="loading" (click)="onCancel()">
        <section
          #modalRoot
          class="modal"
          [class.closing]="closing"
          tabindex="-1"
          (click)="$event.stopPropagation()"
          (keydown.escape)="onEsc($event)"
          (keydown)="onKeydown($event)"
        >
          <div class="modal-header">
            <h3>{{ title }}</h3>
            <button type="button" class="close-btn" [disabled]="loading" (click)="onCancel()" aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <p>{{ message }}</p>

           <div class="actions">
             <button type="button" class="btn-ghost" [disabled]="loading" (click)="onCancel()">
               <span class="btn-content">
                 <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                 <span>{{ cancelText }}</span>
               </span>
             </button>
             <button type="button" class="btn-primary" [disabled]="loading" (click)="onConfirm()">
               <span class="btn-content">
                  @if (loading) {
                    <span class="btn-spinner" aria-hidden="true"></span>
                    <span>Đang xử lý...</span>
                  } @else {
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m20 6-11 11-5-5"/></svg>
                    <span>{{ confirmText }}</span>
                  }
               </span>
             </button>
           </div>
        </section>
      </div>
    }
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(22, 31, 56, 0.42);
      display: grid;
      place-items: center;
      z-index: 1200;
      padding: 1rem;
      backdrop-filter: blur(2px);
      animation: fadeIn 0.2s ease;
    }

    .overlay.closing {
      animation: fadeOut 0.18s ease forwards;
      pointer-events: none;
    }

    .overlay.locked {
      cursor: wait;
    }

    .modal {
      width: min(430px, 100%);
      background: #fff;
      border-radius: 14px;
      border: 1px solid var(--border);
      box-shadow: 0 18px 45px rgba(16, 24, 40, 0.22);
      padding: 1rem;
      display: grid;
      gap: 0.82rem;
      animation: scaleIn 0.22s ease;
    }

    .modal.closing {
      animation: scaleOut 0.18s ease forwards;
      pointer-events: none;
    }

     h3 {
       margin: 0;
       font-size: 1rem;
       color: var(--text);
     }

     .modal-header {
       display: flex;
       align-items: center;
       gap: 0.5rem;
       margin-bottom: 0.5rem;
     }

     .close-btn {
       background: none;
       border: none;
       cursor: pointer;
       padding: 0.3rem;
       display: flex;
       align-items: center;
       justify-content: center;
       color: #667085;
       transition: color 0.2s ease;
       margin-left: auto;
     }

     .close-btn:hover {
       color: #1a202c;
     }

     .close-btn:disabled {
       opacity: 0.55;
       cursor: not-allowed;
     }

     .close-btn svg {
       width: 1.25rem;
       height: 1.25rem;
     }

    p {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.91rem;
      line-height: 1.45;
    }

    .actions {
      display: flex;
      justify-content: end;
      gap: 0.5rem;
      margin-top: 0.1rem;
    }

    button {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0.45rem 0.75rem;
      cursor: pointer;
      background: #fff;
      font-weight: 600;
    }

    .btn-ghost {
      background: #f8fbff;
    }

    .btn-primary {
      background: linear-gradient(90deg, var(--primary), var(--primary-600));
      border-color: transparent;
      color: #fff;
      box-shadow: 0 8px 18px rgba(64, 153, 255, 0.24);
    }

    button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-spinner {
      width: 0.9rem;
      height: 0.9rem;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.45);
      border-top-color: #fff;
      animation: spin 0.8s linear infinite;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes scaleOut {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `
})
export class ConfirmModalComponent {
  @ViewChild('modalRoot') private modalRoot?: ElementRef<HTMLElement>;

  private _open = false;
  render = false;
  closing = false;

  @Input()
  set open(value: boolean) {
    this._open = value;
    if (value) {
      this.render = true;
      this.closing = false;
      setTimeout(() => this.modalRoot?.nativeElement.focus(), 0);
      return;
    }

    if (this.render) {
      this.closing = true;
      setTimeout(() => {
        this.render = false;
        this.closing = false;
      }, 180);
    }
  }

  get open(): boolean {
    return this._open;
  }

   @Input() title = 'Xác nhận thao tác';
   @Input() message = 'Bạn có chắc chắn muốn tiếp tục?';
   @Input() cancelText = 'Hủy';
   @Input() confirmText = 'Xác nhận';
   @Input() loading = false;

   @Output() cancel = new EventEmitter<void>();
   @Output() confirm = new EventEmitter<void>();

  onCancel(): void {
    if (this.loading) {
      return;
    }
    this.cancel.emit();
  }

  onConfirm(): void {
    if (this.loading) {
      return;
    }
    this.confirm.emit();
  }

  onEsc(event: Event): void {
    event.preventDefault();
    this.onCancel();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }

    const host = this.modalRoot?.nativeElement;
    if (!host) {
      return;
    }

    const focusables = host.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusables.length) {
      event.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
