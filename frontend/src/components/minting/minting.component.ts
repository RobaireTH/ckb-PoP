import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { WalletService } from '../../services/wallet.service';
import { PoapService, PoPEvent, Badge } from '../../services/poap.service';
import { WalletModalComponent } from '../wallet-modal/wallet-modal.component';

type Step = 'confirm' | 'signing' | 'minting' | 'success';

@Component({
  selector: 'app-minting',
  standalone: true,
  imports: [CommonModule, RouterLink, WalletModalComponent],
  template: `
    <div class="min-h-[80vh] flex flex-col items-center justify-center py-10 px-4">

      <!-- STEP INDICATOR - Web3 Style -->
      <div class="w-full max-w-lg mb-12 relative">
        <!-- Glass Container -->
        <div class="relative bg-zinc-900/50 backdrop-blur border border-zinc-800 p-6 overflow-hidden">
          <!-- Scan line effect -->
          <div class="scan-line"></div>

          <!-- Progress Track -->
          <div class="relative flex items-center justify-between">
            <!-- Background Track -->
            <div class="absolute left-0 right-0 h-[2px] bg-zinc-800 top-1/2 -translate-y-1/2 mx-8"></div>
            <!-- Filled Track -->
            <div class="absolute left-0 h-[2px] bg-gradient-to-r from-lime-400 to-lime-300 top-1/2 -translate-y-1/2 mx-8 transition-all duration-500 glow-line"
              [style.width]="(getStepIndex() * 44) + '%'"></div>

            <!-- Step Nodes -->
            @for (step of steps; track step.id; let i = $index) {
              <div class="relative z-10 flex flex-col items-center">
                <!-- Hex Node -->
                <div class="relative">
                  <!-- Outer glow ring for active -->
                  @if (getStepIndex() === i) {
                    <div class="absolute inset-0 -m-2 rotate-45 border-2 border-lime-400/50 animate-pulse"></div>
                    <div class="absolute inset-0 -m-3 rotate-45 border border-lime-400/20 animate-ping"></div>
                  }

                  <!-- Main Node -->
                  <div class="w-12 h-12 rotate-45 flex items-center justify-center transition-all duration-300"
                    [class.bg-lime-400]="getStepIndex() > i"
                    [class.bg-zinc-950]="getStepIndex() <= i"
                    [class.border-2]="true"
                    [class.border-lime-400]="getStepIndex() >= i"
                    [class.border-zinc-700]="getStepIndex() < i"
                    [class.shadow-[0_0_20px_rgba(163,230,53,0.5)]]="getStepIndex() === i">

                    <div class="-rotate-45 font-mono font-bold text-sm"
                      [class.text-black]="getStepIndex() > i"
                      [class.text-lime-400]="getStepIndex() === i"
                      [class.text-zinc-600]="getStepIndex() < i">
                      @if (getStepIndex() > i) {
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                      } @else {
                        {{ step.icon }}
                      }
                    </div>
                  </div>
                </div>

                <!-- Label -->
                <div class="mt-6 text-center">
                  <span class="font-mono text-[10px] uppercase tracking-[0.2em] block"
                    [class.text-lime-400]="getStepIndex() >= i"
                    [class.text-zinc-500]="getStepIndex() < i">
                    {{ step.label }}
                  </span>
                  @if (getStepIndex() === i) {
                    <span class="font-mono text-[10px] text-lime-400/60 block mt-1 animate-pulse">
                      {{ step.status }}<span class="blink">_</span>
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- CONFIRMATION STEP -->
      @if (currentStep() === 'confirm') {
        <div class="w-full max-w-md bg-zinc-950 border border-zinc-800 relative">
          <!-- Top Decorative Strip -->
          <div class="h-1 w-full bg-stripes"></div>

          <div class="p-8">
            <div class="flex items-center justify-between mb-8">
               <span class="font-mono text-xs text-lime-400 border border-lime-400/30 px-2 py-1">READY_TO_MINT</span>
               <span class="font-mono text-xs text-zinc-500">{{ event()?.date }}</span>
            </div>

            <h2 class="font-display text-3xl font-bold text-white mb-2">{{ event()?.name }}</h2>
            <p class="font-mono text-sm text-zinc-400 mb-8">{{ event()?.location }}</p>

            <div class="space-y-4 border-t border-b border-zinc-800 py-6 mb-8">
               <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Issuer</span>
                  <span class="font-mono text-zinc-300">{{ event()?.issuer | slice:0:10 }}...</span>
               </div>
               <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Network Fee</span>
                  <span class="font-mono text-zinc-300">0.0001 CKB</span>
               </div>
               <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Asset Type</span>
                  <span class="font-mono text-lime-400">SBT (Non-Transferable)</span>
               </div>
            </div>

            @if (!walletService.isConnected()) {
                 <button (click)="showWalletModal.set(true)" class="w-full bg-zinc-100 hover:bg-white text-black font-bold py-4 uppercase tracking-widest transition-colors">
                    Connect Wallet
                 </button>
            } @else {
                 <button (click)="showConfirmDialog.set(true)" class="w-full bg-lime-400 hover:bg-lime-300 text-black font-bold py-4 uppercase tracking-widest transition-colors flex justify-center gap-2 items-center group">
                    <span>Sign Transaction</span>
                    <span class="group-hover:translate-x-1 transition-transform">-></span>
                 </button>
            }
          </div>
        </div>
      }

      <!-- MINTING / SIGNING PROCESS -->
      @if (currentStep() === 'signing' || currentStep() === 'minting') {
        <div class="w-full max-w-md text-center p-8 border border-dashed border-zinc-800">
           <div class="mb-8 font-mono text-6xl font-light text-zinc-700 animate-pulse">
             {{ currentStep() === 'signing' ? '01' : '02' }}<span class="text-zinc-800">/02</span>
           </div>

           <h3 class="font-display text-2xl font-bold text-white mb-2">
             {{ currentStep() === 'signing' ? 'Awaiting Signature' : 'Verifying Proof' }}
           </h3>
           
           <div class="font-mono text-xs text-lime-400 mt-4">
              <span class="inline-block w-2 h-2 bg-lime-400 mr-2 animate-ping"></span>
              {{ currentStep() === 'signing' ? 'Please check your device...' : 'Interacting with CKB Node...' }}
           </div>
           
           <!-- Fake Terminal Output -->
           <div class="mt-8 text-left font-mono text-xs text-zinc-600 space-y-1 opacity-70">
              <p>> init_handshake(wallet)</p>
              @if (currentStep() === 'minting') {
                <p class="text-zinc-400">> signature_verified: OK</p>
                <p class="text-zinc-400">> construct_cell(output)</p>
                <p class="text-zinc-400 animate-pulse">> committing_tx...</p>
              }
           </div>
        </div>
      }

      <!-- SUCCESS STEP -->
      @if (currentStep() === 'success' && earnedBadge()) {
        <div class="w-full max-w-sm animate-fade-in-up">
           
           <!-- Holographic Card Container -->
           <div class="relative bg-zinc-900 border border-zinc-700 p-2 shadow-[0_0_50px_rgba(132,204,22,0.15)] group perspective-1000">
             
             <!-- Inner Content -->
             <div class="relative bg-black aspect-[3/4] overflow-hidden">
                <!-- Image -->
                <img [src]="earnedBadge()?.imageUrl" class="absolute inset-0 w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all duration-700">
                
                <!-- Overlay Data -->
                <div class="absolute inset-0 p-6 flex flex-col justify-between z-10">
                   <div class="flex justify-between items-start">
                      <div class="w-8 h-8 border border-white/20 flex items-center justify-center bg-black/50 backdrop-blur">
                         <span class="font-display font-bold text-white">P</span>
                      </div>
                      <span class="font-mono text-xs text-lime-400 border border-lime-400 px-1">VERIFIED</span>
                   </div>

                   <div class="bg-black/80 backdrop-blur p-4 border-l-2 border-lime-400">
                      <h3 class="font-display text-xl font-bold text-white leading-tight mb-1">{{ earnedBadge()?.eventName }}</h3>
                      <p class="font-mono text-xs text-zinc-400 uppercase">{{ earnedBadge()?.role }} • {{ earnedBadge()?.mintDate | date:'shortDate' }}</p>
                   </div>
                </div>

                <!-- Glitch/Holo Effect overlay -->
                <div class="absolute inset-0 bg-gradient-to-tr from-lime-500/10 to-transparent pointer-events-none mix-blend-overlay"></div>
             </div>

           </div>
           
           <div class="mt-8 flex gap-4">
             <a routerLink="/gallery" class="flex-1 text-center bg-white text-black font-bold text-sm py-3 uppercase tracking-wider hover:bg-zinc-200 transition-colors">
               View Badge
             </a>
           </div>

        </div>
      }

    </div>

    @if (showWalletModal()) {
      <app-wallet-modal (close)="showWalletModal.set(false)"></app-wallet-modal>
    }

    <!-- Confirmation Dialog -->
    @if (showConfirmDialog()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" (click)="showConfirmDialog.set(false)"></div>

        <div class="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 shadow-2xl p-6 animate-fade-in-up">
          <!-- Warning Icon -->
          <div class="w-16 h-16 mx-auto mb-6 bg-lime-400/10 border border-lime-400/30 flex items-center justify-center">
            <svg class="w-8 h-8 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h3 class="font-display text-xl font-bold text-white text-center mb-2">Confirm Minting</h3>
          <p class="font-mono text-sm text-zinc-400 text-center mb-6">
            Are you sure you want to mint this badge? This action will create an on-chain transaction.
          </p>

          <!-- Transaction Summary -->
          <div class="bg-zinc-900 border border-zinc-800 p-4 mb-6 space-y-2">
            <div class="flex justify-between text-xs">
              <span class="font-mono text-zinc-500">Event</span>
              <span class="font-mono text-white truncate ml-4">{{ event()?.name }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="font-mono text-zinc-500">Network Fee</span>
              <span class="font-mono text-lime-400">~0.0001 CKB</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="font-mono text-zinc-500">Type</span>
              <span class="font-mono text-zinc-300">Soulbound Token</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              (click)="showConfirmDialog.set(false)"
              class="flex-1 py-3 border border-zinc-700 text-zinc-300 font-bold uppercase tracking-wider text-sm hover:bg-zinc-900 hover:border-zinc-600 transition-colors"
            >
              Cancel
            </button>
            <button
              (click)="confirmAndMint()"
              class="flex-1 py-3 bg-lime-400 text-black font-bold uppercase tracking-wider text-sm hover:bg-lime-300 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .bg-stripes {
      background-image: linear-gradient(45deg, #27272a 25%, transparent 25%, transparent 50%, #27272a 50%, #27272a 75%, transparent 75%, transparent);
      background-size: 10px 10px;
    }
    @keyframes fade-in-up {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up {
      animation: fade-in-up 0.6s ease-out forwards;
    }
    .scan-line {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(163, 230, 53, 0.3), transparent);
      animation: scan 3s linear infinite;
    }
    @keyframes scan {
      0% { top: 0; opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { top: 100%; opacity: 0; }
    }
    .glow-line {
      box-shadow: 0 0 10px rgba(163, 230, 53, 0.5), 0 0 20px rgba(163, 230, 53, 0.3);
    }
    .blink {
      animation: blink 1s step-end infinite;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
  `]
})
export class MintingComponent implements OnInit {
  poapService = inject(PoapService);
  walletService = inject(WalletService);
  router = inject(Router);

  event = signal<PoPEvent | null>(null);
  currentStep = signal<Step>('confirm');
  earnedBadge = signal<Badge | null>(null);
  showWalletModal = signal(false);
  showConfirmDialog = signal(false);

  steps = [
    { id: 'confirm', label: 'Confirm', icon: '◈', status: 'READY' },
    { id: 'sign', label: 'Sign', icon: '⬡', status: 'SIGNING' },
    { id: 'mint', label: 'Mint', icon: '◇', status: 'MINTING' }
  ];

  ngOnInit() {
    const state = history.state;
    if (state && state.event) {
      this.event.set(state.event);
    } else {
      this.router.navigate(['/check-in']);
    }
  }

  getStepIndex() {
    const stepMap: Record<Step, number> = {
      'confirm': 0,
      'signing': 1,
      'minting': 1,
      'success': 2
    };
    return stepMap[this.currentStep()];
  }

  confirmAndMint() {
    this.showConfirmDialog.set(false);
    this.startMinting();
  }

  startMinting() {
    this.currentStep.set('signing');
    setTimeout(() => {
      this.currentStep.set('minting');
      this.poapService.mintBadge(this.event()!, this.walletService.address()!).then(badge => {
         setTimeout(() => {
           this.earnedBadge.set(badge);
           this.currentStep.set('success');
         }, 2000);
      });
    }, 1500);
  }
}