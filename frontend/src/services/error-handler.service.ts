import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private toast = inject(ToastService);

  handleError(error: unknown): void {
    // Log to console for debugging
    console.error('Unhandled error:', error);

    // Extract error message
    let message = 'An unexpected error occurred';

    if (error instanceof Error) {
      message = error.message;

      // Handle specific error types
      if (error.name === 'ChunkLoadError') {
        message = 'Failed to load application resources. Please refresh the page.';
      } else if (error.message.includes('NetworkError')) {
        message = 'Network error. Please check your connection.';
      } else if (error.message.includes('timeout')) {
        message = 'Request timed out. Please try again.';
      }
    }

    // Show toast notification for user-facing errors
    // Avoid showing internal Angular errors to users
    if (!this.isInternalError(error)) {
      this.toast.error(message);
    }
  }

  private isInternalError(error: unknown): boolean {
    if (error instanceof Error) {
      const internalPatterns = [
        'ExpressionChangedAfterItHasBeenCheckedError',
        'NG0100',
        'NG0200',
        'NG0300'
      ];
      return internalPatterns.some(pattern => error.message.includes(pattern));
    }
    return false;
  }
}
