import { Injectable, signal, computed } from '@angular/core';

export type WalletType = 'JoyID' | 'WalletConnect' | 'UniPass' | 'Neuron' | 'MetaMask' | null;

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  readonly connectedWallet = signal<WalletType>(null);
  readonly address = signal<string | null>(null);

  readonly isConnected = computed(() => this.connectedWallet() !== null);
  readonly shortAddress = computed(() => {
    const addr = this.address();
    return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
  });

  connect(type: WalletType) {
    // Simulate connection delay
    setTimeout(() => {
      this.connectedWallet.set(type);
      // Mock Address based on wallet type
      if (type === 'MetaMask' || type === 'WalletConnect') {
        this.address.set('0x71C...9A23'); // EVM style for display
      } else {
        this.address.set('ckb1qyqrdsefa43s6m882pcj53m4gdnj4k440axqswmu83');
      }
    }, 800);
  }

  disconnect() {
    this.connectedWallet.set(null);
    this.address.set(null);
  }
}