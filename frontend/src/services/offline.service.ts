import { Injectable, signal, inject, NgZone } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class OfflineService {
  private toastService = inject(ToastService);
  private ngZone = inject(NgZone);

  private readonly isOfflineSignal = signal(!navigator.onLine);
  readonly isOffline = this.isOfflineSignal.asReadonly();

  private wasOffline = !navigator.onLine;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    window.addEventListener('online', () => {
      this.ngZone.run(() => {
        this.isOfflineSignal.set(false);
        if (this.wasOffline) {
          this.toastService.success('Connection restored');
        }
        this.wasOffline = false;
      });
    });

    window.addEventListener('offline', () => {
      this.ngZone.run(() => {
        this.isOfflineSignal.set(true);
        this.wasOffline = true;
      });
    });
  }
}
