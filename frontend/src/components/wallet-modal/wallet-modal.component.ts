import { Component, output, inject, ElementRef, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletService, WalletOption } from '../../services/wallet.service';
import { ccc } from '@ckb-ccc/ccc';

@Component({
  selector: 'app-wallet-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
      (keydown.escape)="close.emit()"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" (click)="close.emit()"></div>

      <!-- Modal -->
      <div
        #modalPanel
        class="relative w-full max-w-xs bg-zinc-950 border border-zinc-800/50 rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
        tabindex="-1"
      >
        <!-- Header -->
        <div class="px-6 pt-6 pb-4 text-center">
          <h3 id="wallet-modal-title" class="text-lg font-medium text-white mb-1">
            {{ walletService.isConnecting() ? 'Connecting' : 'Connect Wallet' }}
          </h3>
          @if (walletService.error()) {
            <p class="text-xs text-red-400">{{ walletService.error() }}</p>
          } @else if (walletService.isConnecting()) {
            <div class="w-10 h-10 border-2 border-zinc-800 border-t-lime-400 rotate-45 mx-auto my-4 animate-spin"></div>
            <p class="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">Awaiting signature...</p>
          } @else {
            <p class="text-sm text-zinc-500">Choose your wallet to continue</p>
          }
        </div>

        <!-- Wallet List -->
        @if (!walletService.isConnecting()) {
          <div class="px-4 pb-4">
            <div class="space-y-2">
              @for (wallet of walletService.walletOptions(); track wallet.name) {
                <button
                  (click)="selectWallet(wallet)"
                  class="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700/50 transition-all duration-200 group"
                >
                  <!-- Wallet Icon -->
                  <div class="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                    @if (wallet.icon) {
                      <img [src]="wallet.icon" class="w-8 h-8 object-contain" [alt]="wallet.name">
                    } @else {
                      <span class="text-xl font-bold text-zinc-500">{{ wallet.name.charAt(0) }}</span>
                    }
                  </div>

                  <!-- Wallet Info -->
                  <div class="flex-1 text-left">
                    <div class="text-sm font-medium text-white group-hover:text-lime-400 transition-colors">{{ wallet.name }}</div>
                  </div>

                  <!-- Arrow -->
                  <svg class="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              } @empty {
                <div class="py-8 text-center">
                  <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-900 flex items-center justify-center">
                    <svg class="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                    </svg>
                  </div>
                  <p class="text-sm text-zinc-400 mb-1">No wallets detected</p>
                  <p class="text-xs text-zinc-600">Install a CKB-compatible wallet</p>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="px-4 pb-4">
            <button
              (click)="close.emit()"
              class="w-full py-3 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        }

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-zinc-800/50 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
            <span class="text-xs text-amber-500/80">Testnet</span>
          </div>
          @if (!walletService.isConnecting()) {
            <button
              (click)="close.emit()"
              class="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              Close
            </button>
          }
        </div>
      </div>
    </div>
  `
})
export class WalletModalComponent implements AfterViewInit, OnDestroy {
  close = output<void>();
  walletService = inject(WalletService);

  @ViewChild('modalPanel') modalPanel!: ElementRef<HTMLDivElement>;
  private previousActiveElement: Element | null = null;

  ngAfterViewInit() {
    this.previousActiveElement = document.activeElement;
    this.modalPanel.nativeElement.focus();
  }

  ngOnDestroy() {
    if (this.previousActiveElement instanceof HTMLElement) {
      this.previousActiveElement.focus();
    }
  }

  getSignerTypeLabel(type: ccc.SignerType): string {
    switch (type) {
      case ccc.SignerType.BTC:
        return 'Bitcoin';
      case ccc.SignerType.EVM:
        return 'Ethereum';
      case ccc.SignerType.CKB:
        return 'CKB Native';
      case ccc.SignerType.Nostr:
        return 'Nostr';
      case ccc.SignerType.Doge:
        return 'Dogecoin';
      default:
        return 'Unknown';
    }
  }

  async selectWallet(wallet: WalletOption) {
    const success = await this.walletService.connectWallet(wallet);
    if (success) {
      this.close.emit();
    }
  }
}
