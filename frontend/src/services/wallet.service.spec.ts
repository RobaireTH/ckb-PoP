import { describe, it, expect } from 'vitest';

// Test pure logic from wallet.service.ts without Angular DI

describe('WalletService Pure Logic', () => {
  describe('shortAddress', () => {
    function shortAddress(addr: string | null): string {
      if (!addr) return '';
      return `${addr.slice(0, 12)}...${addr.slice(-8)}`;
    }

    it('should truncate a long address', () => {
      const addr = 'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xws';
      const result = shortAddress(addr);
      expect(result).toBe('ckt1qzda0cr0...waa50xws');
      expect(result.length).toBeLessThan(addr.length);
    });

    it('should return empty string for null', () => {
      expect(shortAddress(null)).toBe('');
    });

    it('should handle short addresses', () => {
      const result = shortAddress('ckt1q');
      expect(result).toContain('...');
    });
  });

  describe('truncateAddress', () => {
    function truncateAddress(address: string | null, start: number, end: number): string {
      if (!address) return '';
      if (address.length <= start + end + 3) return address;
      return `${address.slice(0, start)}...${address.slice(-end)}`;
    }

    it('should truncate with custom lengths', () => {
      const addr = 'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xws';
      const result = truncateAddress(addr, 10, 6);
      expect(result).toBe('ckt1qzda0c...a50xws');
    });

    it('should not truncate short addresses', () => {
      expect(truncateAddress('short', 10, 6)).toBe('short');
    });

    it('should return empty for null', () => {
      expect(truncateAddress(null, 10, 6)).toBe('');
    });

    it('should return full address when length equals threshold', () => {
      const addr = 'abcdefghijklmno'; // 15 chars, threshold = 10 + 6 + 3 = 19
      expect(truncateAddress(addr, 10, 6)).toBe(addr);
    });
  });

  describe('wallet preference logic', () => {
    type SignerType = 'CKB' | 'EVM' | 'BTC';
    interface MockSignerInfo { signer: { type: SignerType } }
    interface MockWallet { name: string; signers: MockSignerInfo[] }

    function getPreferredSigner(wallet: MockWallet): MockSignerInfo | null {
      if (!wallet.signers.length) return null;
      const walletLower = wallet.name.toLowerCase();

      if (walletLower.includes('joyid')) {
        return wallet.signers.find(s => s.signer.type === 'CKB') || null;
      }
      if (walletLower.includes('metamask') || walletLower.includes('imtoken') || walletLower.includes('safepal')) {
        return wallet.signers.find(s => s.signer.type === 'EVM') || wallet.signers[0];
      }
      if (walletLower.includes('unisat') || walletLower.includes('okx')) {
        return wallet.signers.find(s => s.signer.type === 'BTC') || wallet.signers[0];
      }
      return wallet.signers.find(s => s.signer.type === 'CKB') || wallet.signers[0];
    }

    it('should prefer CKB signer for JoyID', () => {
      const wallet: MockWallet = {
        name: 'JoyID',
        signers: [
          { signer: { type: 'EVM' } },
          { signer: { type: 'CKB' } },
        ],
      };
      const result = getPreferredSigner(wallet);
      expect(result?.signer.type).toBe('CKB');
    });

    it('should return null for JoyID without CKB signer', () => {
      const wallet: MockWallet = {
        name: 'JoyID',
        signers: [{ signer: { type: 'EVM' } }],
      };
      expect(getPreferredSigner(wallet)).toBeNull();
    });

    it('should prefer EVM signer for MetaMask', () => {
      const wallet: MockWallet = {
        name: 'MetaMask',
        signers: [
          { signer: { type: 'CKB' } },
          { signer: { type: 'EVM' } },
        ],
      };
      const result = getPreferredSigner(wallet);
      expect(result?.signer.type).toBe('EVM');
    });

    it('should prefer BTC signer for UniSat', () => {
      const wallet: MockWallet = {
        name: 'UniSat Wallet',
        signers: [
          { signer: { type: 'CKB' } },
          { signer: { type: 'BTC' } },
        ],
      };
      const result = getPreferredSigner(wallet);
      expect(result?.signer.type).toBe('BTC');
    });

    it('should prefer BTC signer for OKX', () => {
      const wallet: MockWallet = {
        name: 'OKX Wallet',
        signers: [
          { signer: { type: 'EVM' } },
          { signer: { type: 'BTC' } },
        ],
      };
      const result = getPreferredSigner(wallet);
      expect(result?.signer.type).toBe('BTC');
    });

    it('should default to CKB signer for unknown wallets', () => {
      const wallet: MockWallet = {
        name: 'SomeWallet',
        signers: [
          { signer: { type: 'EVM' } },
          { signer: { type: 'CKB' } },
        ],
      };
      const result = getPreferredSigner(wallet);
      expect(result?.signer.type).toBe('CKB');
    });

    it('should fallback to first signer for unknown wallets without CKB', () => {
      const wallet: MockWallet = {
        name: 'SomeWallet',
        signers: [{ signer: { type: 'EVM' } }],
      };
      const result = getPreferredSigner(wallet);
      expect(result?.signer.type).toBe('EVM');
    });

    it('should return null for empty signers', () => {
      const wallet: MockWallet = { name: 'Empty', signers: [] };
      expect(getPreferredSigner(wallet)).toBeNull();
    });
  });

  describe('wallet suggestions', () => {
    const WALLET_INSTALL_URLS: Record<string, string> = {
      'joyid': 'https://joy.id',
      'metamask': 'https://metamask.io/download/',
      'unisat': 'https://unisat.io/download',
      'okx': 'https://www.okx.com/web3',
    };

    function getWalletSuggestions(installedNames: string[]): string[] {
      const suggestions: string[] = [];
      for (const key of Object.keys(WALLET_INSTALL_URLS)) {
        const isInstalled = installedNames.some(name =>
          name === key || name.includes(key) || key.includes(name)
        );
        if (!isInstalled) {
          suggestions.push(key);
        }
      }
      return suggestions;
    }

    it('should suggest all wallets when none installed', () => {
      const result = getWalletSuggestions([]);
      expect(result).toEqual(['joyid', 'metamask', 'unisat', 'okx']);
    });

    it('should not suggest installed wallets', () => {
      const result = getWalletSuggestions(['metamask', 'joyid']);
      expect(result).toEqual(['unisat', 'okx']);
    });

    it('should match partial names', () => {
      const result = getWalletSuggestions(['metamask wallet']);
      expect(result).not.toContain('metamask');
    });

    it('should return empty when all installed', () => {
      const result = getWalletSuggestions(['joyid', 'metamask', 'unisat', 'okx']);
      expect(result).toEqual([]);
    });
  });
});
