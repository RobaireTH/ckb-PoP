import { Component, inject, signal } from '@angular/core';
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
    <div class="min-h-screen pt-14 pb-20 px-4">
      <div class="max-w-md mx-auto pt-8">

        @if (!walletService.isConnected()) {
          <!-- Auth Required -->
          <div class="border border-white/[0.04] bg-black p-6 text-center">
            <div class="w-10 h-10 border border-zinc-800 mx-auto mb-4 flex items-center justify-center">
              <svg class="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div class="font-display text-lg text-white mb-1">Wallet Required</div>
            <div class="font-mono text-[10px] text-zinc-600 uppercase tracking-wider mb-4">Connect to establish identity</div>
            <button (click)="showModal.set(true)" class="btn-action w-full justify-center">
              <span>Connect Wallet</span>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </button>
          </div>
        } @else {

          <!-- Header -->
          <div class="mb-6">
            <div class="font-display text-lg text-white mb-1">Verify Attendance</div>
            <div class="font-mono text-[10px] text-zinc-600 uppercase tracking-wider">Scan QR or enter protocol ID</div>
          </div>

          @if (errorMsg()) {
            <div class="border border-red-500/20 bg-red-900/10 p-3 mb-4">
              <div class="flex items-start gap-2">
                <svg class="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
                </svg>
                <div>
                  <div class="font-mono text-[9px] text-red-400 uppercase tracking-wider">Verification Failed</div>
                  <div class="text-xs text-red-300/70 mt-0.5">{{ errorMsg() }}</div>
                </div>
              </div>
            </div>
          }

          <!-- Scanner -->
          <div class="border border-white/[0.04] bg-black aspect-square mb-4 relative overflow-hidden">
            @if (isScanning()) {
              <div class="absolute inset-0">
                <div class="absolute inset-0 opacity-[0.03]" style="background-image: linear-gradient(rgba(163,230,53,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(163,230,53,0.5) 1px, transparent 1px); background-size: 16px 16px;"></div>

                <!-- Frame -->
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="relative w-40 h-40">
                    <div class="absolute top-0 left-0 w-4 h-4 border-l border-t border-lime-400"></div>
                    <div class="absolute top-0 right-0 w-4 h-4 border-r border-t border-lime-400"></div>
                    <div class="absolute bottom-0 left-0 w-4 h-4 border-l border-b border-lime-400"></div>
                    <div class="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-lime-400"></div>
                    <div class="absolute inset-x-0 h-px bg-lime-400/80 scan-line"></div>
                  </div>
                </div>

                <!-- Status -->
                <div class="absolute top-3 left-3 flex items-center gap-1.5 bg-black/80 px-2 py-1 border border-white/[0.04]">
                  <span class="w-1.5 h-1.5 bg-red-500 animate-pulse"></span>
                  <span class="font-mono text-[8px] text-zinc-500 uppercase tracking-wider">Scanning</span>
                </div>
              </div>
            } @else {
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <div class="w-8 h-8 border border-zinc-800 mb-3 flex items-center justify-center">
                  <svg class="w-4 h-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <button (click)="startScanning()" class="btn-secondary text-[9px]">Initialize Scanner</button>
                <div class="font-mono text-[8px] text-zinc-700 uppercase tracking-wider mt-2">Camera required</div>
              </div>
            }

            <!-- Debug -->
            <div class="absolute bottom-2 inset-x-2 flex justify-center">
              <button (click)="simulateScan('demo')" class="px-2 py-1 bg-black/80 text-[8px] font-mono text-lime-400/60 border border-lime-500/20 hover:border-lime-400/40 uppercase tracking-wider">
                Debug: demo
              </button>
            </div>
          </div>

          <!-- Manual Entry -->
          <div class="relative py-3">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-zinc-900"></div></div>
            <div class="relative flex justify-center">
              <span class="bg-zinc-950 px-2 font-mono text-[8px] text-zinc-700 uppercase tracking-wider">Manual Entry</span>
            </div>
          </div>

          <div class="flex gap-2">
            <input
              [formControl]="manualCode"
              type="text"
              placeholder="Protocol ID"
              maxlength="12"
              class="flex-1 bg-zinc-900/50 border border-white/[0.04] px-3 py-2 text-white font-mono text-xs uppercase tracking-wider placeholder:text-zinc-700 focus:border-lime-400/30 focus:outline-none"
            >
            <button
              (click)="submitManual()"
              [disabled]="manualCode.invalid || isValidating()"
              class="btn-verify disabled:opacity-40"
            >
              @if (isValidating()) {
                <div class="w-3 h-3 border border-black/30 border-t-black animate-spin"></div>
              } @else {
                <span>Verify</span>
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              }
            </button>
          </div>

          @if (manualCode.invalid && manualCode.touched) {
            <div class="mt-2 font-mono text-[9px] text-red-400 uppercase tracking-wider">
              @if (manualCode.errors?.['required']) { ID required }
              @else if (manualCode.errors?.['minlength']) { Min 4 chars }
              @else if (manualCode.errors?.['pattern']) { Alphanumeric only }
            </div>
          }

        }
      </div>
    </div>

    <!-- Event Modal -->
    @if (pendingEvent()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/90" (click)="cancelCheckIn()"></div>

        <div class="relative w-full max-w-sm bg-black border border-white/[0.06]">
          <!-- Header -->
          <div class="p-4 border-b border-white/[0.04]">
            <div class="flex items-center justify-between">
              <div class="font-mono text-[9px] text-lime-400 uppercase tracking-wider">Event Found</div>
              <button (click)="cancelCheckIn()" class="text-zinc-600 hover:text-white">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="p-4">
            <div class="font-display text-base text-white mb-1">{{ pendingEvent()?.name }}</div>
            <div class="font-mono text-[10px] text-zinc-600 uppercase tracking-wider mb-4">{{ pendingEvent()?.location }}</div>

            <div class="space-y-2 text-xs border-t border-b border-white/[0.04] py-3 mb-4">
              <div class="flex justify-between">
                <span class="font-mono text-[9px] text-zinc-600 uppercase tracking-wider">Date</span>
                <span class="font-mono text-zinc-400">{{ pendingEvent()?.date }}</span>
              </div>
              <div class="flex justify-between">
                <span class="font-mono text-[9px] text-zinc-600 uppercase tracking-wider">Creator</span>
                <span class="font-mono text-zinc-400 text-[10px]">{{ pendingEvent()?.issuer | slice:0:12 }}...</span>
              </div>
              <div class="flex justify-between">
                <span class="font-mono text-[9px] text-zinc-600 uppercase tracking-wider">Observed</span>
                <span class="font-mono text-zinc-400">
                  @if (loadingAttendees()) { ... } @else { {{ attendeeCount() }} attestations }
                </span>
              </div>
            </div>

            <div class="bg-zinc-900/50 border border-white/[0.04] p-2 mb-4">
              <div class="font-mono text-[9px] text-zinc-500 uppercase tracking-wider">
                One attestation per address. Irreversible.
              </div>
            </div>

            <div class="flex gap-2">
              <button (click)="cancelCheckIn()" class="flex-1 py-2 border border-zinc-800 text-zinc-500 font-mono text-[10px] uppercase tracking-wider hover:border-zinc-700">
                Cancel
              </button>
              <button (click)="confirmCheckIn()" class="btn-action flex-1 justify-center">
                <span>Proceed</span>
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
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
    @keyframes scan {
      0%, 100% { top: 0; }
      50% { top: calc(100% - 1px); }
    }
    .scan-line {
      animation: scan 2s ease-in-out infinite;
    }
    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: linear-gradient(135deg, #a3e635 0%, #65a30d 100%);
      color: black;
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      transition: all 0.2s ease;
    }
    .btn-action:hover {
      box-shadow: 0 0 20px rgba(163, 230, 53, 0.3);
    }
    .btn-verify {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: linear-gradient(135deg, #a3e635 0%, #65a30d 100%);
      color: black;
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      transition: all 0.2s ease;
    }
    .btn-verify:hover:not(:disabled) {
      box-shadow: 0 0 15px rgba(163, 230, 53, 0.3);
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
      this.pendingEvent.set(event);
      this.loadAttendeeCount(event.id);
    } catch (err: any) {
      this.errorMsg.set(err.message || 'Invalid protocol ID.');
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
