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

      <!-- STEP INDICATOR -->
      <div class="w-full max-w-md mb-8">
        <div class="flex justify-between items-center mb-4">
          @for (step of ['Confirm', 'Sign', 'Mint']; track step; let i = $index) {
            <div class="flex flex-col items-center gap-2 flex-1" [class.opacity-50]="getStepIndex() > i">
              <!-- Step Circle -->
              <div
                class="w-8 h-8 flex items-center justify-center font-mono text-xs font-bold border-2 transition-all"
                [class.border-lime-400]="getStepIndex() >= i"
                [class.bg-lime-400]="getStepIndex() > i"
                [class.text-black]="getStepIndex() > i"
                [class.border-zinc-600]="getStepIndex() < i"
                [class.text-zinc-400]="getStepIndex() < i"
                [class.bg-zinc-900]="getStepIndex() < i"
                [class.text-lime-400]="getStepIndex() === i"
                [class.bg-zinc-950]="getStepIndex() === i"
              >
                {{ i + 1 }}
              </div>
              <!-- Step Label -->
              <span class="text-xs font-mono uppercase tracking-widest"
                [class.text-lime-400]="getStepIndex() >= i"
                [class.text-zinc-500]="getStepIndex() < i">
                {{ step }}
              </span>
              <!-- Connector -->
              @if (i < 2) {
                <div class="absolute w-12 h-0.5 mt-8 ml-12 -translate-y-16"
                  [class.bg-lime-400]="getStepIndex() > i"
                  [class.bg-zinc-700]="getStepIndex() <= i">
                </div>
              }
            </div>
          }
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
                 <button (click)="startMinting()" class="w-full bg-lime-400 hover:bg-lime-300 text-black font-bold py-4 uppercase tracking-widest transition-colors flex justify-center gap-2 items-center group">
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