import { Injectable, signal, computed, inject } from '@angular/core';
import { ccc } from '@ckb-ccc/ccc';
import { ToastService } from './toast.service';

export type WalletType = string | null;

// SVG icons for mobile wallets (base64 encoded data URIs)
const IMTOKEN_SVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMjQiIGZpbGw9IiMxMTgzRkUiLz4KPHBhdGggZD0iTTY0IDI0QzQxLjkwOSAyNCAyNCA0MS45MDkgMjQgNjRDMjQgODYuMDkxIDQxLjkwOSAxMDQgNjQgMTA0Qzg2LjA5MSAxMDQgMTA0IDg2LjA5MSAxMDQgNjRDMTA0IDQxLjkwOSA4Ni4wOTEgMjQgNjQgMjRaTTY0IDM2QzYwLjY4NiAzNiA1OCAzOC42ODYgNTggNDJDNTggNDUuMzE0IDYwLjY4NiA0OCA2NCA0OEM2Ny4zMTQgNDggNzAgNDUuMzE0IDcwIDQyQzcwIDM4LjY4NiA2Ny4zMTQgMzYgNjQgMzZaTTU2IDU2SDcyVjkySDU2VjU2WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+';

const SAFEPAL_SVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMjQiIGZpbGw9IiM1QjVFRkYiLz4KPHBhdGggZD0iTTY0IDIwTDEwMCA0MFY2MEMxMDAgODQuNTMzIDg1LjMzMyAxMDAgNjQgMTA4QzQyLjY2NyAxMDAgMjggODQuNTMzIDI4IDYwVjQwTDY0IDIwWiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI2IiBmaWxsPSJub25lIi8+CjxwYXRoIGQ9Ik01MiA2NEw2MCA3Mkw3NiA1NiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';

/**
 * Custom SignersController that extends the default CCC SignersController
 * to add support for additional mobile wallets (imToken, SafePal)
 */
class CustomSignersController extends ccc.SignersController {
  async addRealSigners(context: ccc.SignersControllerRefreshContext): Promise<void> {
    // Call the parent implementation to add all default wallets
    await super.addRealSigners(context);
  }

  async addDummySigners(context: ccc.SignersControllerRefreshContext): Promise<void> {
    // Call the parent implementation to add default dummy signers
    await super.addDummySigners(context);

    // Add imToken mobile deep link
    await this.addLinkSigners(
      'imToken',
      IMTOKEN_SVG,
      [ccc.SignerType.EVM],
      `imtokenv2://navigate/DappView?url=${encodeURIComponent(window.location.href)}`,
      context
    );

    // Add SafePal mobile deep link
    await this.addLinkSigners(
      'SafePal',
      SAFEPAL_SVG,
      [ccc.SignerType.EVM],
      `https://link.safepal.io/dapp?url=${encodeURIComponent(window.location.href)}`,
      context
    );
  }
}

// Flat wallet option for the modal - one button per wallet
export interface WalletOption {
  name: string;
  icon: string;
  signer: ccc.Signer;
  signerType: ccc.SignerType;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private toast = inject(ToastService);

  // CKB Client - using testnet for development
  private client = new ccc.ClientPublicTestnet();

  // Custom signers controller for wallet discovery (extends default with imToken & SafePal)
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
