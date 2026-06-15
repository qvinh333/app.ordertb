import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSignal = signal<ToastItem[]>([]);
  private idSeed = 0;

  readonly toasts = this.toastsSignal.asReadonly();

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  dismiss(id: number): void {
    this.toastsSignal.update((items) => items.filter((item) => item.id !== id));
  }

  private push(type: ToastType, message: string): void {
    const id = ++this.idSeed;
    const toast: ToastItem = { id, type, message };

    this.toastsSignal.update((items) => [...items, toast]);

    setTimeout(() => {
      this.dismiss(id);
    }, 3500);
  }
}

