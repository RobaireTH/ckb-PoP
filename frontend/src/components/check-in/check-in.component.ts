import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { PoapService, PoPEvent } from '../../services/poap.service';
import { WalletService } from '../../services/wallet.service';
import { WalletModalComponent } from '../wallet-modal/wallet-modal.component';

@Component({
  selector: 'app-check-in',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, WalletModalComponent],
  template: `
    <div class="min-h-[80vh] flex flex-col items-center justify-start py-8 pt-24 px-4 sm:px-6 lg:px-8">
      
      @if (!walletService.isConnected()) {
        <div class="w-full max-w-md text-center mt-8 sm:mt-12 animate-fade-in-up">
           <div class="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-zinc-900 border border-white/10 mb-6 shadow-2xl">
             <svg class="h-8 w-8 sm:h-10 sm:w-10 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
             </svg>
           </div>
           <h2 class="text-2xl font-bold tracking-tight text-white font-display">Login Required</h2>
           <p class="mt-2 text-zinc-400 mb-8 text-base">Connect your wallet to establish identity.</p>
           <button (click)="showModal.set(true)" class="w-full sm:w-auto rounded-full bg-lime-400 px-8 py-3.5 text-base font-bold text-black shadow-[0_0_20px_rgba(163,230,53,0.4)] hover:bg-lime-300 hover:scale-105 transition-all active:scale-95">
             Connect Wallet
           </button>
        </div>
      } @else {
        <div class="w-full max-w-md space-y-8 animate-fade-in-up">
          <div>
            <h2 class="mt-4 sm:mt-6 text-center text-3xl font-bold tracking-tight text-white font-display">Event Check-In</h2>
            <p class="mt-2 text-center text-sm text-zinc-400 leading-relaxed">
              Align QR code within the frame or enter protocol ID manually.
            </p>
          </div>

          @if (errorMsg()) {
            <div class="rounded-xl bg-red-900/20 border border-red-500/20 p-4 animate-fade-in-up">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-red-400">Scan Failed</h3>
                  <div class="text-sm text-red-300/80 mt-1">{{ errorMsg() }}</div>
                </div>
              </div>
            </div>
          }

          <!-- Scanner View -->
          <div class="relative overflow-hidden rounded-3xl bg-black aspect-square shadow-2xl border border-white/10 group">
            
            @if (isScanning()) {
              <div class="absolute inset-0 flex items-center justify-center">
                 <!-- Mock Camera Feed Background -->
                 <div class="absolute inset-0 bg-zinc-900 opacity-50 animate-pulse bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000&auto=format&fit=crop')] bg-cover grayscale opacity-20"></div>
                 
                 <div class="relative z-10 flex gap-2 items-center bg-black/60 backdrop-blur border border-white/10 px-3 py-1 rounded-full">
                    <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span class="text-xs font-mono text-zinc-300">REC • LIVE</span>
                 </div>
                 
                 <!-- Scan Line Animation -->
                 <div class="absolute inset-x-0 h-0.5 bg-lime-400 shadow-[0_0_20px_#a3e635] scan-line z-20"></div>

                 <!-- HUD Markers -->
                 <div class="absolute top-8 left-8 w-12 h-12 border-l-2 border-t-2 border-lime-400 rounded-tl-lg drop-shadow-[0_0_5px_#a3e635]"></div>
                 <div class="absolute top-8 right-8 w-12 h-12 border-r-2 border-t-2 border-lime-400 rounded-tr-lg drop-shadow-[0_0_5px_#a3e635]"></div>
                 <div class="absolute bottom-8 left-8 w-12 h-12 border-l-2 border-b-2 border-lime-400 rounded-bl-lg drop-shadow-[0_0_5px_#a3e635]"></div>
                 <div class="absolute bottom-8 right-8 w-12 h-12 border-r-2 border-b-2 border-lime-400 rounded-br-lg drop-shadow-[0_0_5px_#a3e635]"></div>
              </div>
            } @else {
               <div class="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 backdrop-blur-sm">
                  <div class="p-5 sm:p-6 rounded-full bg-white/5 mb-6 border border-white/5 group-hover:border-lime-400/30 transition-colors">
                    <svg class="h-10 w-10 sm:h-12 sm:w-12 text-zinc-400 group-hover:text-lime-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <button (click)="startScanning()" class="rounded-full bg-zinc-800 border border-zinc-700 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700 hover:border-zinc-500 transition-all active:scale-95">
                    Initialize Scanner
                  </button>
               </div>
            }

            <!-- Simulators for Demo -->
            <div class="absolute bottom-4 inset-x-4 flex gap-2 justify-center z-30">
               <button (click)="simulateScan('demo')" class="px-4 py-2 bg-black/60 hover:bg-lime-900/30 backdrop-blur text-xs uppercase font-mono tracking-wider text-lime-200 rounded-lg border border-lime-500/20 hover:border-lime-400/50 transition-colors">Debug: "Demo"</button>
            </div>
          </div>

          <!-- Manual Code Entry -->
          <div class="relative py-2">
            <div class="absolute inset-0 flex items-center" aria-hidden="true">
              <div class="w-full border-t border-zinc-800"></div>
            </div>
            <div class="relative flex justify-center">
              <span class="bg-zinc-950 px-3 text-xs uppercase tracking-widest text-zinc-500 font-mono">Manual Override</span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3">
             <input
               [formControl]="manualCode"
               type="text"
               placeholder="Enter Event ID..."
               class="block w-full rounded-xl border-0 bg-zinc-900/50 py-3.5 sm:py-3 px-4 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-zinc-600 focus:ring-2 focus:ring-inset focus:ring-lime-500 text-base sm:text-sm leading-6 font-mono transition-shadow"
             >
             <button
               (click)="submitManual()"
               [disabled]="manualCode.invalid || isValidating()"
               class="w-full sm:w-auto rounded-xl bg-lime-400 px-8 py-3.5 sm:py-3 text-sm font-bold text-black shadow-lg hover:bg-lime-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500 disabled:opacity-50 disabled:grayscale transition-all active:scale-95">
               {{ isValidating() ? '...' : 'GO' }}
             </button>
          </div>

        </div>
      }
    </div>

    @if (showModal()) {
      <app-wallet-modal (close)="showModal.set(false)"></app-wallet-modal>
    }
  `,
  styles: [`
    @keyframes fade-in-up {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up {
      animation: fade-in-up 0.6s ease-out forwards;
    }
  `]
})
export class CheckInComponent {
  poapService = inject(PoapService);
  walletService = inject(WalletService);
  router = inject(Router);

  isScanning = signal(false);
  isValidating = signal(false);
  errorMsg = signal<string | null>(null);
  showModal = signal(false);
  
  manualCode = new FormControl('', [Validators.required, Validators.minLength(3)]);

  startScanning() {
    this.isScanning.set(true);
  }

  simulateScan(code: string) {
    this.validateCode(code);
  }

  submitManual() {
    if (this.manualCode.valid && this.manualCode.value) {
      this.validateCode(this.manualCode.value);
    }
  }

  async validateCode(code: string) {
    this.isValidating.set(true);
    this.errorMsg.set(null);
    this.isScanning.set(false); // Stop scan on attempt

    try {
      const event = await this.poapService.getEventByCode(code);
      this.router.navigate(['/minting'], { state: { event } });
    } catch (err: any) {
      this.errorMsg.set(err.message || 'Invalid protocol ID. Access denied.');
    } finally {
      this.isValidating.set(false);
    }
  }
}