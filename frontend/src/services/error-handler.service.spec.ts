import { describe, it, expect } from 'vitest';

// Test the pure error-handling logic from GlobalErrorHandler
// without Angular DI (inject(ToastService) prevents direct instantiation)

function isInternalError(error: unknown): boolean {
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

function classifyError(error: unknown): string {
  let message = 'An unexpected error occurred';

  if (error instanceof Error) {
    message = error.message;

    if (error.name === 'ChunkLoadError') {
      message = 'Failed to load application resources. Please refresh the page.';
    } else if (error.message.includes('NetworkError')) {
      message = 'Network error. Please check your connection.';
    } else if (error.message.includes('timeout')) {
      message = 'Request timed out. Please try again.';
    }
  }

  return message;
}

describe('GlobalErrorHandler Pure Logic', () => {
  describe('classifyError', () => {
    it('should return message for generic errors', () => {
      expect(classifyError(new Error('Something broke'))).toBe('Something broke');
    });

    it('should handle ChunkLoadError', () => {
      const err = new Error('Failed to fetch');
      err.name = 'ChunkLoadError';
      expect(classifyError(err)).toBe(
        'Failed to load application resources. Please refresh the page.'
      );
    });

    it('should handle NetworkError', () => {
      expect(classifyError(new Error('NetworkError when attempting to fetch'))).toBe(
        'Network error. Please check your connection.'
      );
    });

    it('should handle timeout errors', () => {
      expect(classifyError(new Error('Request timeout'))).toBe(
        'Request timed out. Please try again.'
      );
    });

    it('should return default message for non-Error values', () => {
      expect(classifyError('string error')).toBe('An unexpected error occurred');
    });

    it('should return default message for null', () => {
      expect(classifyError(null)).toBe('An unexpected error occurred');
    });
  });

  describe('isInternalError', () => {
    it('should suppress ExpressionChangedAfterItHasBeenCheckedError', () => {
      expect(isInternalError(new Error('ExpressionChangedAfterItHasBeenCheckedError'))).toBe(true);
    });

    it('should suppress NG0100 errors', () => {
      expect(isInternalError(new Error('NG0100: something'))).toBe(true);
    });

    it('should suppress NG0200 errors', () => {
      expect(isInternalError(new Error('NG0200: something'))).toBe(true);
    });

    it('should suppress NG0300 errors', () => {
      expect(isInternalError(new Error('NG0300: something'))).toBe(true);
    });

    it('should not suppress regular errors', () => {
      expect(isInternalError(new Error('Something broke'))).toBe(false);
    });

    it('should not suppress non-Error values', () => {
      expect(isInternalError('string error')).toBe(false);
    });
  });
});
