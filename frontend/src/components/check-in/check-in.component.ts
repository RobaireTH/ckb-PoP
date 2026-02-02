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
              <div class="absolute inset-0">
                 <!-- Gradient Background -->
                 <div class="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900"></div>

                 <!-- Grid Pattern -->
                 <div class="absolute inset-0 opacity-10" style="background-image: linear-gradient(rgba(163,230,53,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(163,230,53,0.3) 1px, transparent 1px); background-size: 20px 20px;"></div>

                 <!-- Center QR Frame -->
                 <div class="absolute inset-0 flex items-center justify-center">
                   <div class="relative w-48 h-48">
                     <!-- Animated Corner Brackets -->
                     <div class="absolute top-0 left-0 w-8 h-8 border-l-3 border-t-3 border-lime-400 animate-pulse"></div>
                     <div class="absolute top-0 right-0 w-8 h-8 border-r-3 border-t-3 border-lime-400 animate-pulse"></div>
                     <div class="absolute bottom-0 left-0 w-8 h-8 border-l-3 border-b-3 border-lime-400 animate-pulse"></div>
                     <div class="absolute bottom-0 right-0 w-8 h-8 border-r-3 border-b-3 border-lime-400 animate-pulse"></div>

                     <!-- Inner glow -->
                     <div class="absolute inset-4 border border-lime-400/20 bg-lime-400/5"></div>

                     <!-- Scanning line -->
                     <div class="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-lime-400 to-transparent shadow-[0_0_15px_#a3e635] scan-line"></div>
                   </div>
                 </div>

                 <!-- Status Bar -->
                 <div class="absolute top-4 inset-x-4 flex justify-between items-center">
                   <div class="flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-white/10">
                     <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                     <span class="text-[10px] font-mono text-zinc-300 uppercase tracking-wider">Scanning</span>
                   </div>
                   <div class="bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-white/10">
                     <span class="text-[10px] font-mono text-lime-400">READY</span>
                   </div>
                 </div>

                 <!-- Instructions -->
                 <div class="absolute bottom-16 inset-x-4 text-center">
                   <p class="text-xs font-mono text-zinc-400">Position QR code within frame</p>
                 </div>
              </div>
            } @else {
               <div class="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 backdrop-blur-sm">
                  <div class="p-5 sm:p-6 rounded-full bg-white/5 mb-6 border border-white/5 group-hover:border-lime-400/30 transition-colors">
                    <svg class="h-10 w-10 sm:h-12 sm:w-12 text-zinc-400 group-hover:text-lime-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <button (click)="startScanning()" class="rounded-full bg-zinc-800 border border-zinc-700 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700 hover:border-zinc-500 transition-all active:scale-95">
                    Start Scanner
                  </button>
                  <p class="mt-4 text-xs text-zinc-500 font-mono">Camera access required</p>
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

          <div class="flex flex-col gap-2">
            <div class="flex flex-col sm:flex-row gap-3">
               <input
                 [formControl]="manualCode"
                 type="text"
                 placeholder="Enter Event ID..."
                 maxlength="12"
                 class="block w-full rounded-xl border-0 bg-zinc-900/50 py-3.5 sm:py-3 px-4 text-white shadow-sm ring-1 ring-inset placeholder:text-zinc-600 focus:ring-2 focus:ring-inset text-base sm:text-sm leading-6 font-mono transition-shadow uppercase"
                 [class.ring-red-500]="manualCode.invalid && manualCode.touched"
                 [class.ring-white/10]="manualCode.valid || !manualCode.touched"
                 [class.focus:ring-red-500]="manualCode.invalid && manualCode.touched"
                 [class.focus:ring-lime-500]="manualCode.valid || !manualCode.touched"
               >
               <button
                 (click)="submitManual()"
                 [disabled]="manualCode.invalid || isValidating()"
                 class="w-full sm:w-auto rounded-xl bg-lime-400 px-8 py-3.5 sm:py-3 text-sm font-bold text-black shadow-lg hover:bg-lime-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500 disabled:opacity-50 disabled:grayscale transition-all active:scale-95 min-h-[44px]">
                 {{ isValidating() ? '...' : 'GO' }}
               </button>
            </div>
            @if (manualCode.invalid && manualCode.touched) {
              <div class="flex items-center gap-2 text-red-400 text-xs font-mono">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  @if (manualCode.errors?.['required']) {
                    Event ID is required
                  } @else if (manualCode.errors?.['minlength']) {
                    Event ID must be at least 4 characters
                  } @else if (manualCode.errors?.['maxlength']) {
                    Event ID must be at most 12 characters
                  } @else if (manualCode.errors?.['pattern']) {
                    Event ID must be alphanumeric only
                  }
                </span>
              </div>
            }
          </div>

        </div>
      }
    </div>

    <!-- Event Details Modal -->
    @if (pendingEvent()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" (click)="cancelCheckIn()"></div>

        <div class="relative w-full max-w-md bg-zinc-950 border border-zinc-800 shadow-2xl animate-fade-in-up overflow-hidden">
          <!-- Event Image Header -->
          <div class="relative h-40 bg-zinc-900 overflow-hidden">
            <img [src]="pendingEvent()?.imageUrl" class="absolute inset-0 w-full h-full object-cover opacity-50">
            <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent"></div>
            <div class="absolute top-4 right-4">
              <span class="font-mono text-[10px] bg-lime-400 text-black px-2 py-1 uppercase tracking-wider">Event Found</span>
            </div>
          </div>

          <!-- Event Details -->
          <div class="p-6 -mt-8 relative z-10">
            <h2 class="font-display text-2xl font-bold text-white mb-2">{{ pendingEvent()?.name }}</h2>

            <div class="space-y-3 mb-6">
              <!-- Location -->
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span class="font-mono text-sm text-zinc-300">{{ pendingEvent()?.location }}</span>
              </div>

              <!-- Date -->
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span class="font-mono text-sm text-zinc-300">{{ pendingEvent()?.date }}</span>
              </div>

              <!-- Issuer -->
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span class="font-mono text-sm text-zinc-300 truncate">{{ pendingEvent()?.issuer }}</span>
              </div>

              <!-- Attendee Count -->
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                @if (loadingAttendees()) {
                  <span class="font-mono text-sm text-zinc-500 animate-pulse">Loading...</span>
                } @else {
                  <span class="font-mono text-sm text-zinc-300">{{ attendeeCount() }} {{ attendeeCount() === 1 ? 'attendee' : 'attendees' }} checked in</span>
                }
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
              <button
                (click)="cancelCheckIn()"
                class="flex-1 py-3 border border-zinc-700 text-zinc-300 font-bold uppercase tracking-wider text-sm hover:bg-zinc-900 hover:border-zinc-600 transition-colors"
              >
                Cancel
              </button>
              <button
                (click)="confirmCheckIn()"
                class="flex-1 py-3 bg-lime-400 text-black font-bold uppercase tracking-wider text-sm hover:bg-lime-300 transition-colors"
              >
                Check In
              </button>
            </div>
          </div>
        </div>
      </div>
    }

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
    @keyframes scan {
      0%, 100% { top: 0; }
      50% { top: calc(100% - 2px); }
    }
    .scan-line {
      animation: scan 2s ease-in-out infinite;
    }
    .border-l-3 { border-left-width: 3px; }
    .border-r-3 { border-right-width: 3px; }
    .border-t-3 { border-top-width: 3px; }
    .border-b-3 { border-bottom-width: 3px; }
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

  // Event details modal state
  pendingEvent = signal<PoPEvent | null>(null);
  attendeeCount = signal(0);
  loadingAttendees = signal(false);

  manualCode = new FormControl('', [
    Validators.required,
    Validators.minLength(4),
    Validators.maxLength(12),
    Validators.pattern(/^[a-zA-Z0-9]+$/)
  ]);

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
    this.isScanning.set(false);

    try {
      const event = await this.poapService.getEventByCode(code);
      // Show event details modal instead of navigating directly
      this.pendingEvent.set(event);
      this.loadAttendeeCount(event.id);
    } catch (err: any) {
      this.errorMsg.set(err.message || 'Invalid protocol ID. Access denied.');
    } finally {
      this.isValidating.set(false);
    }
  }

  async loadAttendeeCount(eventId: string) {
    this.loadingAttendees.set(true);
    try {
      const attendees = await this.poapService.getAttendees(eventId);
      this.attendeeCount.set(attendees.length);
    } catch {
      this.attendeeCount.set(0);
    } finally {
      this.loadingAttendees.set(false);
    }
  }

  confirmCheckIn() {
    const event = this.pendingEvent();
    if (event) {
      this.pendingEvent.set(null);
      this.router.navigate(['/minting'], { state: { event } });
    }
  }

  cancelCheckIn() {
    this.pendingEvent.set(null);
  }
}