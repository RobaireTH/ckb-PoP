import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly toastsSignal = signal<Toast[]>([]);
  readonly toasts = this.toastsSignal.asReadonly();

  show(message: string, type: ToastType = 'info', duration = 4000) {
    const id = crypto.randomUUID();
    const toast: Toast = { id, message, type, duration };

    this.toastsSignal.update(toasts => [...toasts, toast]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  success(message: string, duration = 4000) {
    return this.show(message, 'success', duration);
  }

  error(message: string, duration = 5000) {
    return this.show(message, 'error', duration);
  }

  info(message: string, duration = 4000) {
    return this.show(message, 'info', duration);
  }

  warning(message: string, duration = 4500) {
    return this.show(message, 'warning', duration);
  }

  dismiss(id: string) {
    this.toastsSignal.update(toasts => toasts.filter(t => t.id !== id));
  }

  clear() {
    this.toastsSignal.set([]);
  }
}
