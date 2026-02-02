import { Component, output, inject, ElementRef, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletService } from '../../services/wallet.service';
import { ccc } from '@ckb-ccc/ccc';

@Component({
  selector: 'app-wallet-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
      (keydown.escape)="close.emit()"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        (click)="close.emit()"
        aria-hidden="true"
      ></div>

      <!-- Modal Panel -->
      <div
        #modalPanel
        class="relative transform overflow-hidden rounded-3xl bg-zinc-900 border border-white/10 px-4 pb-4 pt-5 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6 animate-scale-in max-h-[80vh] overflow-y-auto"
        tabindex="-1"
      >
        <div>
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lime-400/10" aria-hidden="true">
            @if (walletService.isConnecting()) {
              <svg class="h-6 w-6 text-lime-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            } @else {
              <svg class="h-6 w-6 text-lime-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            }
          </div>
          <div class="mt-3 text-center sm:mt-5">
            <h3 id="wallet-modal-title" class="text-base font-bold leading-6 text-white">
              {{ walletService.isConnecting() ? 'Connecting...' : 'Connect Wallet' }}
            </h3>
            <div class="mt-2">
              @if (walletService.error()) {
                <p class="text-sm text-red-400" role="alert">{{ walletService.error() }}</p>
              } @else if (walletService.isConnecting()) {
                <p class="text-sm text-zinc-400" aria-live="polite">Please confirm in your wallet...</p>
              } @else {
                <p class="text-sm text-zinc-400">Select a wallet to continue.</p>
              }
            </div>
          </div>
        </div>

        @if (!walletService.isConnecting()) {
          <div class="mt-5 sm:mt-6 space-y-4" role="list" aria-label="Available wallets">
            @for (wallet of walletService.wallets(); track wallet.name) {
              <div class="space-y-2" role="listitem">
                <div class="flex items-center gap-2 px-1">
                  @if (wallet.icon) {
                    <img [src]="wallet.icon" class="h-5 w-5 rounded" [alt]="wallet.name + ' icon'">
                  }
                  <span class="text-xs font-medium text-zinc-400 uppercase tracking-wider">{{ wallet.name }}</span>
                </div>

                <div class="grid gap-2" role="group" [attr.aria-label]="wallet.name + ' connection options'">
                  @for (signerInfo of wallet.signers; track signerInfo.name) {
                    <button
                      (click)="select(wallet.name, signerInfo)"
                      [disabled]="walletService.isConnecting()"
                      [attr.aria-label]="'Connect with ' + signerInfo.name + ' (' + getSignerTypeLabel(signerInfo.signer.type) + ')'"
                      class="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-200 shadow-sm hover:bg-white/10 hover:border-lime-400/30 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span class="flex items-center gap-3">
                        @if (signerInfo.signer.icon) {
                          <img [src]="signerInfo.signer.icon" class="h-8 w-8 rounded-full bg-white p-0.5" [alt]="signerInfo.name + ' icon'" aria-hidden="true">
                        } @else {
                          <div class="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center" aria-hidden="true">
                            <span class="text-xs font-bold text-zinc-400">{{ signerInfo.name.charAt(0) }}</span>
                          </div>
                        }
                        <span class="flex flex-col items-start">
                          <span class="group-hover:text-white transition-colors">{{ signerInfo.name }}</span>
                          <span class="text-xs text-zinc-500 font-normal">{{ getSignerTypeLabel(signerInfo.signer.type) }}</span>
                        </span>
                      </span>
                      <svg class="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  }
                </div>
              </div>
            } @empty {
              <div class="text-center py-8">
                <div class="mx-auto h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4" aria-hidden="true">
                  <svg class="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p class="text-sm text-zinc-400 mb-2">No wallets detected</p>
                <p class="text-xs text-zinc-500">Install a CKB-compatible wallet extension to continue.</p>
              </div>
            }
          </div>
        } @else {
          <!-- Loading state -->
          <div class="mt-8 flex flex-col items-center gap-4" aria-live="polite">
            <div class="h-16 w-16 rounded-full border-2 border-zinc-800 border-t-lime-400 animate-spin" aria-hidden="true"></div>
            <p class="text-sm text-zinc-500 font-mono">Awaiting signature...</p>
          </div>
        }

        <div class="mt-4 text-center">
          <button
            (click)="close.emit()"
            class="text-xs text-zinc-500 hover:text-white font-medium py-2 px-4 transition-colors focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-zinc-900 rounded"
            [attr.aria-label]="walletService.isConnecting() ? 'Cancel wallet connection' : 'Close wallet dialog'"
          >
            {{ walletService.isConnecting() ? 'Cancel' : 'Close' }}
          </button>
        </div>

        <!-- Testnet indicator -->
        <div class="mt-4 pt-4 border-t border-zinc-800 text-center">
          <span class="inline-flex items-center gap-1.5 text-xs text-amber-500/80 font-mono">
            <span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" aria-hidden="true"></span>
            CKB Testnet
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes scale-in {
      0% { opacity: 0; transform: scale(0.95); }
      100% { opacity: 1; transform: scale(1); }
    }
    .animate-scale-in {
      animation: scale-in 0.2s ease-out forwards;
    }
  `]
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
      default:
        return 'Unknown';
    }
  }

  async select(walletName: string, signerInfo: ccc.SignerInfo) {
    const success = await this.walletService.connect(walletName, signerInfo);
    if (success) {
      this.close.emit();
    }
  }
}
