import { Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletService, WalletType } from '../../services/wallet.service';

@Component({
  selector: 'app-wallet-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" (click)="close.emit()"></div>

      <!-- Modal Panel -->
      <div class="relative transform overflow-hidden rounded-3xl bg-zinc-900 border border-white/10 px-4 pb-4 pt-5 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6 animate-scale-in">
        <div>
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10">
            <svg class="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          </div>
          <div class="mt-3 text-center sm:mt-5">
            <h3 class="text-base font-bold leading-6 text-white">Connect Wallet</h3>
            <div class="mt-2">
              <p class="text-sm text-zinc-400">Choose your preferred CKB wallet to continue.</p>
            </div>
          </div>
        </div>
        <div class="mt-5 sm:mt-6 grid gap-3">
          
          <!-- 1. JoyID -->
          <button (click)="select('JoyID')" class="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-200 shadow-sm hover:bg-white/10 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all">
            <span class="flex items-center gap-3">
              <img src="https://www.google.com/s2/favicons?domain=app.joy.id&sz=128" class="h-8 w-8 rounded-full bg-white p-0.5" alt="JoyID Logo">
              <span class="flex flex-col items-start">
                <span class="group-hover:text-cyan-400 transition-colors">JoyID</span>
                <span class="text-[10px] text-zinc-500 font-normal">Passkey & Biometrics</span>
              </span>
            </span>
          </button>

          <!-- 2. WalletConnect -->
          <button (click)="select('WalletConnect')" class="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-200 shadow-sm hover:bg-white/10 hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all">
             <span class="flex items-center gap-3">
              <img src="https://www.google.com/s2/favicons?domain=walletconnect.com&sz=128" class="h-8 w-8 rounded-full bg-white p-0.5" alt="WalletConnect Logo">
               <span class="flex flex-col items-start">
                <span class="group-hover:text-blue-400 transition-colors">WalletConnect</span>
                <span class="text-[10px] text-zinc-500 font-normal">Mobile & QR Code</span>
              </span>
            </span>
          </button>

          <!-- 3. UniPass -->
          <button (click)="select('UniPass')" class="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-200 shadow-sm hover:bg-white/10 hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all">
             <span class="flex items-center gap-3">
              <img src="https://www.google.com/s2/favicons?domain=wallet.unipass.id&sz=128" class="h-8 w-8 rounded-full bg-white p-0.5" alt="UniPass Logo">
               <span class="flex flex-col items-start">
                <span class="group-hover:text-purple-400 transition-colors">UniPass</span>
                <span class="text-[10px] text-zinc-500 font-normal">Email & Social</span>
              </span>
            </span>
          </button>

          <!-- 4. Neuron -->
          <button (click)="select('Neuron')" class="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-200 shadow-sm hover:bg-white/10 hover:border-green-500/50 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all">
             <span class="flex items-center gap-3">
              <img src="https://www.google.com/s2/favicons?domain=nervos.org&sz=128" class="h-8 w-8 rounded-full bg-white p-0.5" alt="Neuron Logo">
               <span class="flex flex-col items-start">
                <span class="group-hover:text-green-400 transition-colors">Neuron</span>
                <span class="text-[10px] text-zinc-500 font-normal">Desktop Node</span>
              </span>
            </span>
          </button>

          <!-- 5. MetaMask -->
          <button (click)="select('MetaMask')" class="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-200 shadow-sm hover:bg-white/10 hover:border-orange-500/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)] transition-all">
             <span class="flex items-center gap-3">
              <img src="https://www.google.com/s2/favicons?domain=metamask.io&sz=128" class="h-8 w-8 rounded-full bg-white p-0.5" alt="MetaMask Logo">
               <span class="flex flex-col items-start">
                <span class="group-hover:text-orange-400 transition-colors">MetaMask</span>
                <span class="text-[10px] text-zinc-500 font-normal">Browser Extension</span>
              </span>
            </span>
          </button>

        </div>
        
        <div class="mt-4 text-center">
            <button (click)="close.emit()" class="text-xs text-zinc-500 hover:text-white font-medium py-2 transition-colors">Cancel Connection</button>
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
export class WalletModalComponent {
  close = output<void>();
  walletService = inject(WalletService);

  select(type: WalletType) {
    this.walletService.connect(type);
    this.close.emit();
  }
}