import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WalletService } from '../../services/wallet.service';
import { PoapService, PoPEvent } from '../../services/poap.service';
import { WalletModalComponent } from '../wallet-modal/wallet-modal.component';

type CreateStep = 'form' | 'creating' | 'success';

function notInPast(control: AbstractControl) {
  if (!control.value) return null;
  const today = new Date().toISOString().split('T')[0];
  return control.value < today ? { pastDate: true } : null;
}

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, WalletModalComponent],
  template: `
    <div class="min-h-screen pt-14 pb-20 px-4">
      <div class="max-w-md mx-auto pt-8">

        @if (!walletService.isConnected()) {
          <!-- Auth Required -->
          <div class="border border-white/[0.04] bg-black p-6 text-center">
            <div class="w-10 h-10 border border-zinc-800 mx-auto mb-4 flex items-center justify-center">
              <svg class="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="font-display text-lg text-white mb-1">Wallet Required</div>
            <div class="font-mono text-[10px] text-zinc-600 uppercase tracking-wider mb-4">Connect to deploy event contract</div>
            <button (click)="showModal.set(true)" class="btn-action w-full justify-center">
              <span>Connect Wallet</span>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </button>
          </div>
        } @else {

          @if (currentStep() === 'form') {
            <div class="border border-white/[0.04] bg-black">
              <div class="p-4 border-b border-white/[0.04]">
                <div class="font-display text-base text-white">Event Parameters</div>
                <div class="font-mono text-[9px] text-zinc-600 uppercase tracking-wider">Configure badge metadata</div>
              </div>

              <form [formGroup]="form" (ngSubmit)="create()" class="p-4">
                <div class="space-y-4">

                  <!-- Image Upload -->
                  <div>
                    <label class="font-mono text-[9px] text-zinc-600 uppercase tracking-wider block mb-2">Banner</label>
                    <div class="relative border border-dashed border-zinc-800 hover:border-zinc-700 p-4 text-center cursor-pointer transition-colors overflow-hidden">
                      @if (uploadedImage()) {
                        <img [src]="uploadedImage()" class="absolute inset-0 w-full h-full object-cover opacity-50">
                        <div class="relative z-10 font-mono text-[9px] text-white uppercase tracking-wider">Replace</div>
                      } @else {
                        <svg class="w-6 h-6 text-zinc-700 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div class="font-mono text-[9px] text-zinc-600 uppercase tracking-wider">Upload image</div>
                      }
                      <input type="file" (change)="onFileSelected($event)" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer">
                    </div>
                  </div>

                  <!-- Name -->
                  <div>
                    <label class="font-mono text-[9px] text-zinc-600 uppercase tracking-wider block mb-2">Name</label>
                    <input
                      formControlName="name"
                      type="text"
                      placeholder="CKB Summit 2024"
                      class="w-full bg-zinc-900/50 border border-white/[0.04] px-3 py-2 text-white text-xs placeholder:text-zinc-700 focus:border-lime-400/30 focus:outline-none"
                      [class.border-red-500/50]="form.controls.name.touched && form.controls.name.invalid"
                    >
                    @if (form.controls.name.touched && form.controls.name.invalid) {
                      <div class="font-mono text-[8px] text-red-400 uppercase tracking-wider mt-1">
                        @if (form.controls.name.errors?.['required']) { Required }
                        @else if (form.controls.name.errors?.['minlength']) { Min 3 chars }
                      </div>
                    }
                  </div>

                  <!-- Date + Location -->
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="font-mono text-[9px] text-zinc-600 uppercase tracking-wider block mb-2">Date</label>
                      <input
                        formControlName="date"
                        type="date"
                        [min]="today"
                        class="w-full bg-zinc-900/50 border border-white/[0.04] px-3 py-2 text-white text-xs focus:border-lime-400/30 focus:outline-none date-input"
                        [class.border-red-500/50]="form.controls.date.touched && form.controls.date.invalid"
                      >
                      @if (form.controls.date.touched && form.controls.date.errors?.['pastDate']) {
                        <div class="font-mono text-[8px] text-red-400 uppercase tracking-wider mt-1">Must be today or later</div>
                      }
                    </div>
                    <div>
                      <label class="font-mono text-[9px] text-zinc-600 uppercase tracking-wider block mb-2">Location</label>
                      <input
                        formControlName="location"
                        type="text"
                        placeholder="City"
                        class="w-full bg-zinc-900/50 border border-white/[0.04] px-3 py-2 text-white text-xs placeholder:text-zinc-700 focus:border-lime-400/30 focus:outline-none"
                        [class.border-red-500/50]="form.controls.location.touched && form.controls.location.invalid"
                      >
                    </div>
                  </div>

                  <!-- Description -->
                  <div>
                    <label class="font-mono text-[9px] text-zinc-600 uppercase tracking-wider block mb-2">Description <span class="text-zinc-700">(Optional)</span></label>
                    <textarea
                      formControlName="description"
                      rows="2"
                      placeholder="Brief description..."
                      class="w-full bg-zinc-900/50 border border-white/[0.04] px-3 py-2 text-white text-xs placeholder:text-zinc-700 focus:border-lime-400/30 focus:outline-none resize-none"
                    ></textarea>
                  </div>

                  <!-- Fee Notice -->
                  <div class="bg-lime-400/5 border border-lime-400/10 p-3">
                    <div class="flex items-start gap-2">
                      <svg class="w-3 h-3 text-lime-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div class="font-mono text-[9px] text-zinc-400 uppercase tracking-wider leading-relaxed">
                        Storage deposit: <span class="text-white">~340 CKB</span>. Reclaimable on destruction.
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    [disabled]="form.invalid"
                    class="btn-action w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                    </svg>
                    <span>Deploy Contract</span>
                  </button>
                </div>
              </form>
            </div>
          }

          @if (currentStep() === 'creating') {
            <div class="border border-white/[0.04] bg-black p-6 text-center">
              <div class="w-10 h-10 border border-zinc-800 mx-auto mb-4 flex items-center justify-center">
                <div class="w-4 h-4 border-2 border-lime-400 border-t-transparent animate-spin"></div>
              </div>
              <div class="font-display text-base text-white mb-1">Deploying</div>
              <div class="font-mono text-[9px] text-zinc-600 uppercase tracking-wider">Confirming cell creation on CKB</div>
            </div>
          }

          @if (currentStep() === 'success' && createdEvent()) {
            <div class="border border-white/[0.04] bg-black">
              <div class="p-4 border-b border-white/[0.04] text-center">
                <div class="w-8 h-8 border border-lime-400/30 mx-auto mb-3 flex items-center justify-center">
                  <svg class="w-4 h-4 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div class="font-display text-base text-white mb-1">Deployed</div>
                <div class="font-mono text-[9px] text-zinc-600 uppercase tracking-wider">Contract active on CKB</div>
              </div>

              <div class="p-5">
                <!-- Prominent Protocol ID -->
                <div class="font-mono text-[10px] text-lime-400 uppercase tracking-widest mb-3 text-center">Protocol ID</div>
                <button (click)="copyId()" class="w-full bg-zinc-950 border-2 border-lime-400/30 hover:border-lime-400/60 p-4 mb-2 cursor-pointer transition-colors group">
                  <div class="font-mono text-lg text-white tracking-wider text-center break-all select-all leading-relaxed">{{ createdEvent()?.id }}</div>
                  <div class="flex items-center justify-center gap-1.5 mt-2">
                    <svg class="w-3 h-3 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span class="font-mono text-[9px] uppercase tracking-wider" [class.text-lime-400]="copied()" [class.text-zinc-500]="!copied()">
                      {{ copied() ? 'Copied!' : 'Tap to copy' }}
                    </span>
                  </div>
                </button>

                <!-- Share instruction -->
                <div class="bg-lime-400/5 border border-lime-400/10 p-3 mb-4">
                  <div class="flex items-start gap-2">
                    <svg class="w-3 h-3 text-lime-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div class="font-mono text-[9px] text-zinc-400 uppercase tracking-wider leading-relaxed">
                      Share this ID with attendees. They will paste it at check-in to mint their badge.
                    </div>
                  </div>
                </div>

                <div class="flex gap-2">
                  <button (click)="reset()" class="flex-1 py-2.5 border border-zinc-800 text-zinc-500 font-mono text-[10px] uppercase tracking-wider hover:border-zinc-700 hover:text-white transition-colors">
                    New Event
                  </button>
                  <a routerLink="/check-in" class="btn-action flex-1 justify-center">
                    <span>Test Flow</span>
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          }

        }
      </div>
    </div>

    @if (showModal()) {
      <app-wallet-modal (close)="showModal.set(false)"></app-wallet-modal>
    }
  `,
  styles: [`
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
    .btn-action:hover:not(:disabled) {
      box-shadow: 0 0 20px rgba(163, 230, 53, 0.3);
    }
    .date-input {
      color-scheme: dark;
    }
    .date-input::-webkit-calendar-picker-indicator {
      filter: invert(1) brightness(0.7);
      cursor: pointer;
      opacity: 1;
    }
  `]
})
export class CreateEventComponent {
  walletService = inject(WalletService);
  poapService = inject(PoapService);
  fb = inject(FormBuilder);

  showModal = signal(false);
  currentStep = signal<CreateStep>('form');
  createdEvent = signal<PoPEvent | null>(null);
  uploadedImage = signal<string | null>(null);
  copied = signal(false);
  today = new Date().toISOString().split('T')[0];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    date: ['', [Validators.required, notInPast]],
    location: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(500)]]
  });

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedImage.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  create() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.currentStep.set('creating');
    const formVal = this.form.value;

    this.poapService.createEvent({
      name: formVal.name!,
      date: formVal.date!,
      location: formVal.location!,
      description: formVal.description || undefined,
      imageUrl: this.uploadedImage() || undefined
    }, this.walletService.address()!)
    .then(event => {
      this.createdEvent.set(event);
      this.currentStep.set('success');
    })
    .catch(err => {
      console.error(err);
      this.currentStep.set('form');
    });
  }

  async copyId() {
    const id = this.createdEvent()?.id;
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = id;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }

  reset() {
    this.form.reset();
    this.currentStep.set('form');
    this.createdEvent.set(null);
    this.uploadedImage.set(null);
  }
}
