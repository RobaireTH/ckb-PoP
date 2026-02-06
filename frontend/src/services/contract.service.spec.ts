import { describe, it, expect } from 'vitest';
import { ChainRejectionError } from './contract.service';

describe('ChainRejectionError', () => {
  describe('fromCkbError', () => {
    it('should parse ValidationFailure with error code 1', () => {
      const err = new Error('ValidationFailure: error code 1');
      const result = ChainRejectionError.fromCkbError(err);
      expect(result.errorCode).toBe(1);
      expect(result.message).toBe('Invalid script args format');
    });

    it('should parse ValidationFailure with error code 2', () => {
      const err = new Error('ValidationFailure: error code 2');
      const result = ChainRejectionError.fromCkbError(err);
      expect(result.errorCode).toBe(2);
      expect(result.message).toBe('Duplicate output detected');
    });

    it('should parse ValidationFailure with error code 3', () => {
      const err = new Error('ValidationFailure: error code 3');
      const result = ChainRejectionError.fromCkbError(err);
      expect(result.errorCode).toBe(3);
      expect(result.message).toBe('Badge/Anchor already exists on-chain');
    });

    it('should handle ValidationFailure without code', () => {
      const err = new Error('ValidationFailure: something else');
      const result = ChainRejectionError.fromCkbError(err);
      expect(result.errorCode).toBeUndefined();
      expect(result.message).toBe('Transaction rejected by type script');
    });

    it('should handle non-ValidationFailure errors', () => {
      const err = new Error('Network timeout');
      const result = ChainRejectionError.fromCkbError(err);
      expect(result.message).toBe('Network timeout');
    });

    it('should handle non-Error values', () => {
      const result = ChainRejectionError.fromCkbError('string error');
      expect(result.message).toBe('string error');
    });

    it('should set name to ChainRejectionError', () => {
      const result = new ChainRejectionError('test');
      expect(result.name).toBe('ChainRejectionError');
      expect(result).toBeInstanceOf(Error);
    });

    it('should store scriptError for ValidationFailure', () => {
      const err = new Error('ValidationFailure: error code 3 in script');
      const result = ChainRejectionError.fromCkbError(err);
      expect(result.scriptError).toBe('ValidationFailure: error code 3 in script');
    });
  });
});
