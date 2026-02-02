import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AsyncState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-async-boundary',
  standalone: true,
  imports: [CommonModule],
  template: `
    @switch (state()) {
      @case ('loading') {
        <div class="min-h-[200px] flex items-center justify-center p-6">
          <div class="text-center">
            <div class="w-10 h-10 border-2 border-zinc-700 border-t-lime-400 rounded-full animate-spin mx-auto mb-4"></div>
            <p class="font-mono text-sm text-zinc-500 uppercase tracking-wider">{{ loadingMessage }}</p>
          </div>
        </div>
      }
      @case ('error') {
        <div class="min-h-[200px] flex items-center justify-center p-6">
          <div class="max-w-md w-full bg-zinc-900/80 border border-red-500/20 rounded-xl p-6 text-center">
            <div class="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="font-display text-lg text-white mb-2">{{ errorTitle }}</h3>
            <p class="font-mono text-sm text-zinc-400 mb-4">{{ errorMessage() || fallbackErrorMessage }}</p>
            @if (showRetry) {
              <button
                (click)="handleRetry()"
                class="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-mono text-sm uppercase tracking-wider transition-colors min-h-[44px]"
              >
                Try Again
              </button>
            }
          </div>
        </div>
      }
      @default {
        <ng-content></ng-content>
      }
    }
  `
})
export class AsyncBoundaryComponent {
  @Input() loadingMessage = 'Loading...';
  @Input() errorTitle = 'Failed to load';
  @Input() fallbackErrorMessage = 'Something went wrong. Please try again.';
  @Input() showRetry = true;
  @Input() onRetry?: () => void;

  state = signal<AsyncState>('idle');
  errorMessage = signal<string | null>(null);

  setLoading() {
    this.state.set('loading');
    this.errorMessage.set(null);
  }

  setSuccess() {
    this.state.set('success');
    this.errorMessage.set(null);
  }

  setError(message?: string) {
    this.state.set('error');
    this.errorMessage.set(message || null);
  }

  reset() {
    this.state.set('idle');
    this.errorMessage.set(null);
  }

  handleRetry() {
    this.reset();
    if (this.onRetry) {
      this.onRetry();
    }
  }
}
