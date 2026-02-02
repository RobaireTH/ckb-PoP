import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[100] flex flex-col gap-3 pointer-events-none"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="toast-item pointer-events-auto min-w-[280px] sm:min-w-[320px] max-w-md p-4 border backdrop-blur-md shadow-2xl flex items-start gap-3 animate-slide-in"
          [class.bg-zinc-900/95]="toast.type === 'info'"
          [class.border-zinc-700]="toast.type === 'info'"
          [class.bg-lime-950/95]="toast.type === 'success'"
          [class.border-lime-500/50]="toast.type === 'success'"
          [class.bg-red-950/95]="toast.type === 'error'"
          [class.border-red-500/50]="toast.type === 'error'"
          [class.bg-amber-950/95]="toast.type === 'warning'"
          [class.border-amber-500/50]="toast.type === 'warning'"
          [attr.role]="toast.type === 'error' ? 'alert' : 'status'"
          [attr.aria-live]="toast.type === 'error' ? 'assertive' : 'polite'"
        >
          <!-- Icon -->
          <div class="flex-shrink-0 mt-0.5" aria-hidden="true">
            @switch (toast.type) {
              @case ('success') {
                <div class="w-5 h-5 rounded-full bg-lime-400 flex items-center justify-center">
                  <svg class="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              }
              @case ('error') {
                <div class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                  <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              }
              @case ('warning') {
                <div class="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                  <svg class="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01" />
                  </svg>
                </div>
              }
              @default {
                <div class="w-5 h-5 rounded-full bg-zinc-600 flex items-center justify-center">
                  <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              }
            }
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p class="font-mono text-sm text-white leading-tight">{{ toast.message }}</p>
          </div>

          <!-- Close Button -->
          <button
            (click)="toastService.dismiss(toast.id)"
            class="flex-shrink-0 w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors rounded -mr-1 -mt-1 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Dismiss notification"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Progress Bar -->
          <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-black/20 overflow-hidden" aria-hidden="true">
            <div
              class="h-full animate-shrink origin-left"
              [class.bg-lime-400]="toast.type === 'success'"
              [class.bg-red-500]="toast.type === 'error'"
              [class.bg-amber-500]="toast.type === 'warning'"
              [class.bg-zinc-500]="toast.type === 'info'"
              [style.animation-duration.ms]="toast.duration"
            ></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      0% {
        opacity: 0;
        transform: translateX(100%);
      }
      100% {
        opacity: 1;
        transform: translateX(0);
      }
    }
    .animate-slide-in {
      animation: slide-in 0.3s ease-out forwards;
    }
    @keyframes shrink {
      0% { width: 100%; }
      100% { width: 0%; }
    }
    .animate-shrink {
      animation: shrink linear forwards;
    }
    .toast-item {
      position: relative;
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}
