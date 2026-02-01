import { Injectable, signal, computed } from '@angular/core';
import { ccc } from '@ckb-ccc/ccc';

export type WalletType = string | null;

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  // CKB Client - using testnet for development
  private client = new ccc.ClientPublicTestnet();

  // Signers controller for wallet discovery
  private signersController = new ccc.SignersController();

  // Internal state
  private signerSignal = signal<ccc.Signer | null>(null);
  private walletsSignal = signal<ccc.WalletWithSigners[]>([]);

  // Public state
  readonly connectedWallet = signal<WalletType>(null);
  readonly address = signal<string | null>(null);
  readonly isConnecting = signal(false);
  readonly error = signal<string | null>(null);
  readonly wallets = this.walletsSignal.asReadonly();

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

  async connect(walletName: string, signerInfo: ccc.SignerInfo): Promise<boolean> {
    this.isConnecting.set(true);
    this.error.set(null);

    try {
      const signer = signerInfo.signer;

      // Connect the signer
      await signer.connect();

      // Get the recommended CKB address
      const addr = await signer.getRecommendedAddress();

      // Update state
      this.signerSignal.set(signer);
      this.connectedWallet.set(walletName);
      this.address.set(addr);
      this.isConnecting.set(false);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      this.error.set(message);
      this.isConnecting.set(false);
      console.error('Wallet connection error:', err);
      return false;
    }
  }

  disconnect() {
    this.signersController.disconnect();
    this.signerSignal.set(null);
    this.connectedWallet.set(null);
    this.address.set(null);
    this.error.set(null);
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
