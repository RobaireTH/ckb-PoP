import { Injectable, signal, computed, inject } from '@angular/core';
import { ccc } from '@ckb-ccc/ccc';
import { ToastService } from './toast.service';

export type WalletType = string | null;

// Suggested wallets with install URLs
const WALLET_INSTALL_URLS: Record<string, string> = {
  'joyid': 'https://joy.id',
  'metamask': 'https://metamask.io/download/',
  'unisat': 'https://unisat.io/download',
  'okx': 'https://www.okx.com/web3',
};

// Wallet icons via Google Favicon API
const WALLET_ICONS: Record<string, string> = {
  'joyid': 'https://www.google.com/s2/favicons?domain=joy.id&sz=128',
  'metamask': 'https://www.google.com/s2/favicons?domain=metamask.io&sz=128',
  'unisat': 'https://www.google.com/s2/favicons?domain=unisat.io&sz=128',
  'okx': 'https://www.google.com/s2/favicons?domain=okx.com&sz=128',
};

/**
 * Custom SignersController that only shows real installed wallets
 */
class CustomSignersController extends ccc.SignersController {
  async addRealSigners(context: ccc.SignersControllerRefreshContext): Promise<void> {
    await super.addRealSigners(context);
  }

  async addDummySigners(_context: ccc.SignersControllerRefreshContext): Promise<void> {
    // Don't add dummy signers - we handle suggestions separately
  }
}

// Flat wallet option for the modal - one button per wallet
export interface WalletOption {
  name: string;
  icon: string;
  signer: ccc.Signer;
  signerType: ccc.SignerType;
}

// Wallet suggestion for uninstalled wallets
export interface WalletSuggestion {
  name: string;
  icon: string;
  installUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private toast = inject(ToastService);

  // CKB Client - using testnet for development
  private client = new ccc.ClientPublicTestnet();

  // Custom signers controller for wallet discovery
  private signersController = new CustomSignersController();

  // Internal state
  private signerSignal = signal<ccc.Signer | null>(null);
  private walletsSignal = signal<ccc.WalletWithSigners[]>([]);

  // Public state
  readonly connectedWallet = signal<WalletType>(null);
  readonly address = signal<string | null>(null);
  readonly isConnecting = signal(false);
  readonly error = signal<string | null>(null);
  readonly wallets = this.walletsSignal.asReadonly();

  // Flattened wallet options - each wallet appears once with preferred signer
  readonly walletOptions = computed<WalletOption[]>(() => {
    const rawWallets = this.walletsSignal();
    const options: WalletOption[] = [];

    for (const wallet of rawWallets) {
      const preferred = this.getPreferredSigner(wallet);
      if (preferred) {
        options.push({
          name: wallet.name,
          icon: wallet.icon,
          signer: preferred.signer,
          signerType: preferred.signer.type
        });
      }
    }
    return options;
  });

  // Wallet suggestions for wallets that aren't installed
  readonly walletSuggestions = computed<WalletSuggestion[]>(() => {
    const installedNames = this.walletOptions().map(w => w.name.toLowerCase());
    const suggestions: WalletSuggestion[] = [];

    for (const [key, installUrl] of Object.entries(WALLET_INSTALL_URLS)) {
      // Check if this wallet is already installed (exact match or contains)
      const isInstalled = installedNames.some(name =>
        name === key || name.includes(key) || key.includes(name)
      );
      if (!isInstalled) {
        suggestions.push({
          name: key === 'joyid' ? 'JoyID' : key === 'okx' ? 'OKX Wallet' : key === 'metamask' ? 'MetaMask' : key === 'unisat' ? 'UniSat' : key,
          icon: WALLET_ICONS[key] || '',
          installUrl
        });
      }
    }
    return suggestions;
  });

  readonly isConnected = computed(() => this.signerSignal() !== null);
  readonly shortAddress = computed(() => {
    const addr = this.address();
    if (!addr) return '';
    return `${addr.slice(0, 12)}...${addr.slice(-8)}`;
  });

  constructor() {
    // Initialize wallet discovery
    this.refreshWallets();
  }

  // Pick the best signer for each wallet
  private getPreferredSigner(wallet: ccc.WalletWithSigners): ccc.SignerInfo | null {
    if (!wallet.signers.length) return null;

    const walletLower = wallet.name.toLowerCase();

    // JoyID: only CKB native
    if (walletLower.includes('joyid')) {
      return wallet.signers.find(s => s.signer.type === ccc.SignerType.CKB) || null;
    }

    // MetaMask, imToken, SafePal: EVM signer
    if (walletLower.includes('metamask') || walletLower.includes('imtoken') || walletLower.includes('safepal')) {
      return wallet.signers.find(s => s.signer.type === ccc.SignerType.EVM) || wallet.signers[0];
    }

    // UniSat, OKX BTC: BTC signer
    if (walletLower.includes('unisat') || walletLower.includes('okx')) {
      return wallet.signers.find(s => s.signer.type === ccc.SignerType.BTC) || wallet.signers[0];
    }

    // Default: prefer CKB native, then first available
    return wallet.signers.find(s => s.signer.type === ccc.SignerType.CKB) || wallet.signers[0];
  }

  // Get the current signer for transactions
  get signer(): ccc.Signer | null {
    return this.signerSignal();
  }

  // Get the CKB client
  get ckbClient(): ccc.Client {
    return this.client;
  }

  // Refresh available wallets
  async refreshWallets(): Promise<void> {
    await this.signersController.refresh(
      this.client,
      (wallets) => {
        this.walletsSignal.set(wallets);
      },
      {
        name: 'CKB-PoP',
        icon: 'https://pop.nervos.org/logo.png'
      }
    );
  }

  // Connect using a WalletOption (new simplified API)
  async connectWallet(wallet: WalletOption): Promise<boolean> {
    this.isConnecting.set(true);
    this.error.set(null);

    try {
      // Connect the signer
      await wallet.signer.connect();

      // Get the recommended CKB address
      const addr = await wallet.signer.getRecommendedAddress();

      // Update state
      this.signerSignal.set(wallet.signer);
      this.connectedWallet.set(wallet.name);
      this.address.set(addr);
      this.isConnecting.set(false);

      this.toast.success(`${wallet.name} connected`);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      this.error.set(message);
      this.isConnecting.set(false);
      this.toast.error(message);
      console.error('Wallet connection error:', err);
      return false;
    }
  }

  // Legacy connect method (kept for compatibility)
  async connect(walletName: string, signerInfo: ccc.SignerInfo): Promise<boolean> {
    return this.connectWallet({
      name: walletName,
      icon: '',
      signer: signerInfo.signer,
      signerType: signerInfo.signer.type
    });
  }

  disconnect() {
    this.signersController.disconnect();
    this.signerSignal.set(null);
    this.connectedWallet.set(null);
    this.address.set(null);
    this.error.set(null);
    this.toast.info('Wallet disconnected');
  }

  // Get wallet balance in CKB
  async getBalance(): Promise<string> {
    const signer = this.signerSignal();
    if (!signer) throw new Error('Wallet not connected');

    const balance = await signer.getBalance();
    return ccc.fixedPointToString(balance);
  }

  // Sign and send a transaction
  async sendTransaction(tx: ccc.Transaction): Promise<string> {
    const signer = this.signerSignal();
    if (!signer) throw new Error('Wallet not connected');

    // Auto-complete inputs and fees
    await tx.completeInputsByCapacity(signer);
    await tx.completeFeeBy(signer);

    // Send transaction
    return signer.sendTransaction(tx);
  }

  // Sign a message (returns hex signature)
  async signMessage(message: string): Promise<string> {
    const signer = this.signerSignal();
    if (!signer) throw new Error('Wallet not connected');

    const signature = await signer.signMessage(message);
    return signature.signature;
  }
}
