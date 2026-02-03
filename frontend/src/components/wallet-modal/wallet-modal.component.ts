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
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
      (keydown.escape)="close.emit()"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/90" (click)="close.emit()"></div>

      <!-- Modal -->
      <div
        #modalPanel
        class="relative w-full max-w-sm bg-black border border-white/[0.06] max-h-[80vh] overflow-y-auto"
        tabindex="-1"
      >
        <!-- Header -->
        <div class="p-4 border-b border-white/[0.04]">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 border border-lime-400/30 flex items-center justify-center">
              @if (walletService.isConnecting()) {
                <div class="w-4 h-4 border-2 border-lime-400 border-t-transparent animate-spin"></div>
              } @else {
                <svg class="w-4 h-4 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                </svg>
              }
            </div>
            <div>
              <h3 id="wallet-modal-title" class="font-display text-sm text-white">
                {{ walletService.isConnecting() ? 'Connecting' : 'Connect Wallet' }}
              </h3>
              <div class="font-mono text-[9px] text-zinc-600 uppercase tracking-wider">
                @if (walletService.error()) {
                  <span class="text-red-400">{{ walletService.error() }}</span>
                } @else if (walletService.isConnecting()) {
                  Awaiting signature...
                } @else {
                  Select signer
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="p-4">
          @if (!walletService.isConnecting()) {
            <div class="space-y-3">
              @for (wallet of walletService.wallets(); track wallet.name) {
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    @if (wallet.icon) {
                      <img [src]="wallet.icon" class="w-4 h-4" [alt]="wallet.name">
                    }
                    <span class="font-mono text-[9px] text-zinc-500 uppercase tracking-wider">{{ wallet.name }}</span>
                  </div>

                  <div class="space-y-1">
                    @for (signerInfo of wallet.signers; track signerInfo.name) {
                      <button
                        (click)="select(wallet.name, signerInfo)"
                        [disabled]="walletService.isConnecting()"
                        class="w-full flex items-center justify-between p-3 border border-white/[0.04] hover:border-lime-400/20 bg-zinc-900/50 hover:bg-zinc-900 transition-colors disabled:opacity-50 group"
                      >
                        <span class="flex items-center gap-3">
                          @if (signerInfo.signer.icon) {
                            <img [src]="signerInfo.signer.icon" class="w-6 h-6 bg-white p-0.5" [alt]="signerInfo.name">
                          } @else {
                            <div class="w-6 h-6 bg-zinc-800 flex items-center justify-center">
                              <span class="font-mono text-[10px] text-zinc-500">{{ signerInfo.name.charAt(0) }}</span>
                            </div>
                          }
                          <span class="text-left">
                            <span class="block text-xs text-zinc-300 group-hover:text-white transition-colors">{{ signerInfo.name }}</span>
                            <span class="block font-mono text-[9px] text-zinc-600 uppercase tracking-wider">{{ getSignerTypeLabel(signerInfo.signer.type) }}</span>
                          </span>
                        </span>
                        <svg class="w-3 h-3 text-zinc-700 group-hover:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    }
                  </div>
                </div>
              } @empty {
                <div class="text-center py-6">
                  <div class="w-10 h-10 border border-zinc-800 mx-auto mb-3 flex items-center justify-center">
                    <svg class="w-4 h-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div class="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">No wallets detected</div>
                  <div class="font-mono text-[9px] text-zinc-600 mt-1">Install CKB wallet extension</div>
                </div>
              }
            </div>
          } @else {
            <div class="py-8 text-center">
              <div class="w-10 h-10 border-2 border-zinc-800 border-t-lime-400 mx-auto mb-4 animate-spin"></div>
              <div class="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">Awaiting signature...</div>
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-white/[0.04] flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
            <span class="font-mono text-[9px] text-amber-500/80 uppercase tracking-wider">Testnet</span>
          </div>
          <button
            (click)="close.emit()"
            class="font-mono text-[10px] text-zinc-500 hover:text-white uppercase tracking-wider transition-colors"
          >
            {{ walletService.isConnecting() ? 'Cancel' : 'Close' }}
          </button>
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
