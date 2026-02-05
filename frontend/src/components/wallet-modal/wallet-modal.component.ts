import { Component, output, inject, ElementRef, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletService, WalletOption, WalletSuggestion } from '../../services/wallet.service';
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
        class="relative w-full max-w-xs bg-zinc-950 border border-zinc-800/50 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 max-h-[80vh] overflow-y-auto"
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
            <!-- Installed Wallets -->
            @if (walletService.walletOptions().length > 0) {
              <div class="flex items-center gap-3 mb-3">
                <div class="flex-1 h-px bg-zinc-800"></div>
                <span class="text-[10px] text-zinc-500 uppercase tracking-wider">Installed</span>
                <div class="flex-1 h-px bg-zinc-800"></div>
              </div>
              <div class="space-y-2 mb-4">
                @for (wallet of walletService.walletOptions(); track wallet.name) {
                  <button
                    (click)="selectWallet(wallet)"
                    class="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-lime-400/30 transition-all duration-200 group"
                  >
                    <div class="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                      @if (wallet.icon) {
                        <img [src]="wallet.icon" class="w-8 h-8 object-contain" [alt]="wallet.name">
                      } @else {
                        <span class="text-xl font-bold text-zinc-500">{{ wallet.name.charAt(0) }}</span>
                      }
                    </div>
                    <div class="flex-1 text-left">
                      <div class="text-sm font-medium text-white group-hover:text-lime-400 transition-colors">{{ wallet.name }}</div>
                    </div>
                    <svg class="w-5 h-5 text-zinc-600 group-hover:text-lime-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                }
              </div>
            }

            <!-- Suggestions Divider -->
            @if (walletService.walletSuggestions().length > 0) {
              <div class="flex items-center gap-3 my-4">
                <div class="flex-1 h-px bg-zinc-800"></div>
                <span class="text-[10px] text-zinc-600 uppercase tracking-wider">Or get a wallet</span>
                <div class="flex-1 h-px bg-zinc-800"></div>
              </div>

              <!-- Wallet Suggestions -->
              <div class="space-y-2">
                @for (suggestion of walletService.walletSuggestions(); track suggestion.name) {
                  <a
                    [href]="suggestion.installUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/30 hover:bg-zinc-900/50 hover:border-zinc-700/50 transition-all duration-200 group"
                  >
                    <div class="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center overflow-hidden shrink-0">
                      @if (suggestion.icon) {
                        <img [src]="suggestion.icon" class="w-8 h-8 object-contain opacity-60 group-hover:opacity-100 transition-opacity" [alt]="suggestion.name">
                      } @else {
                        <span class="text-xl font-bold text-zinc-600">{{ suggestion.name.charAt(0) }}</span>
                      }
                    </div>
                    <div class="flex-1 text-left">
                      <div class="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">{{ suggestion.name }}</div>
                    </div>
                    <svg class="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                }
              </div>
            }
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

  async selectWallet(wallet: WalletOption) {
    const success = await this.walletService.connectWallet(wallet);
    if (success) {
      this.close.emit();
    }
  }
}
