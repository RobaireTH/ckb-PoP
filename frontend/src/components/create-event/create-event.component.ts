import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WalletService } from '../../services/wallet.service';
import { PoapService, PoPEvent } from '../../services/poap.service';
import { WalletModalComponent } from '../wallet-modal/wallet-modal.component';

type CreateStep = 'form' | 'creating' | 'success';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, WalletModalComponent],
  template: `
    <div class="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      
      @if (!walletService.isConnected()) {
        <!-- Auth Wall -->
        <div class="flex flex-col items-center justify-center py-12 sm:py-20 text-center animate-fade-in-up">
           <div class="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-zinc-900 border border-white/10 mb-6 shadow-2xl">
              <svg class="h-8 w-8 sm:h-10 sm:w-10 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
           </div>
           <h2 class="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">Initialize Event Contract</h2>
           <p class="mt-3 text-zinc-400 mb-8 max-w-sm mx-auto text-base leading-relaxed">Connect your wallet to deploy a new proof of presence event on CKB.</p>
           <button (click)="showModal.set(true)" class="rounded-full bg-lime-400 px-8 py-4 sm:py-3 text-base sm:text-sm font-bold text-black shadow-lg hover:bg-lime-300 transition-all active:scale-95 w-full sm:w-auto">
              Connect Wallet
           </button>
        </div>
      } @else {
        
        <div class="max-w-xl mx-auto">
          @if (currentStep() === 'form') {
            <div class="bg-zinc-900/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white/10 p-5 sm:p-8 animate-fade-in-up">
               <div class="mb-6 sm:mb-8 border-b border-white/5 pb-4">
                 <h1 class="font-display text-xl sm:text-2xl font-bold text-white">Event Parameters</h1>
                 <p class="text-zinc-500 text-sm mt-1">Configure metadata for your Soulbound Badges.</p>
               </div>

               <form [formGroup]="form" (ngSubmit)="create()">
                  <div class="space-y-5 sm:space-y-6">
                    
                    <!-- Image Upload -->
                    <div>
                      <label class="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">Banner Asset</label>
                      <div class="group relative flex justify-center rounded-xl border border-dashed border-zinc-700 px-6 py-8 sm:py-10 hover:bg-white/5 hover:border-lime-500/50 transition-all overflow-hidden bg-black/20">
                        
                        @if (uploadedImage()) {
                           <img [src]="uploadedImage()" class="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity">
                           <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <span class="bg-black/80 backdrop-blur px-3 py-1.5 rounded-md text-xs font-bold text-white border border-white/10">Replace Asset</span>
                           </div>
                        } @else {
                           <div class="text-center">
                             <svg class="mx-auto h-10 w-10 text-zinc-600 mb-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                               <path fill-rule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clip-rule="evenodd" />
                             </svg>
                             <div class="flex text-sm leading-6 text-zinc-400 justify-center">
                               <span class="relative cursor-pointer font-semibold text-lime-400 focus-within:outline-none hover:text-lime-300">
                                 <span>Upload</span>
                               </span>
                               <p class="pl-1">or drag & drop</p>
                             </div>
                             <p class="text-[10px] uppercase tracking-wide text-zinc-600 mt-1">PNG, JPG up to 2MB</p>
                           </div>
                        }
                        <input type="file" (change)="onFileSelected($event)" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-[0]">
                      </div>
                    </div>

                    <div>
                      <label class="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">Event Name</label>
                      <input formControlName="name" type="text" class="block w-full rounded-lg border-0 bg-black/50 py-3 sm:py-2.5 px-3 text-white shadow-sm ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-600 focus:ring-2 focus:ring-inset focus:ring-lime-500 text-base sm:text-sm leading-6 transition-shadow" placeholder="e.g. CKB Summit 2024">
                    </div>

                    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                       <div>
                        <label class="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">Date</label>
                        <input formControlName="date" type="date" class="block w-full rounded-lg border-0 bg-black/50 py-3 sm:py-2.5 px-3 text-white shadow-sm ring-1 ring-inset ring-zinc-700 focus:ring-2 focus:ring-inset focus:ring-lime-500 text-base sm:text-sm leading-6 dark:[color-scheme:dark] transition-shadow">
                       </div>
                       <div>
                        <label class="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">Location</label>
                        <input formControlName="location" type="text" class="block w-full rounded-lg border-0 bg-black/50 py-3 sm:py-2.5 px-3 text-white shadow-sm ring-1 ring-inset ring-zinc-700 focus:ring-2 focus:ring-inset focus:ring-lime-500 text-base sm:text-sm leading-6 transition-shadow" placeholder="City or URL">
                       </div>
                    </div>

                    <div>
                      <label class="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">Description <span class="text-zinc-700 normal-case ml-1">(Optional)</span></label>
                      <textarea formControlName="description" rows="3" class="block w-full rounded-lg border-0 bg-black/50 py-3 sm:py-2.5 px-3 text-white shadow-sm ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-600 focus:ring-2 focus:ring-inset focus:ring-lime-500 text-base sm:text-sm leading-relaxed transition-shadow"></textarea>
                    </div>
                  
                    <!-- Deposit Info -->
                    <div class="rounded-xl bg-lime-400/5 border border-lime-400/10 p-4 flex items-start gap-3 mt-8">
                       <svg class="h-5 w-5 text-lime-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                       <div class="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                         <span class="font-bold block mb-0.5 text-lime-400">Storage Deposit Required</span>
                         Creating this contract requires <span class="font-mono text-white">~340 CKB</span>. Reclaimable upon cell destruction.
                       </div>
                    </div>

                    <div class="pt-2">
                      <button type="submit" [disabled]="form.invalid" class="w-full rounded-xl bg-lime-400 px-4 py-4 text-base font-bold text-black shadow-[0_0_20px_rgba(163,230,53,0.3)] hover:shadow-[0_0_30px_rgba(163,230,53,0.5)] hover:bg-lime-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
                         Deploy Event Contract
                      </button>
                    </div>

                  </div>
               </form>
            </div>
          }

          @if (currentStep() === 'creating') {
             <div class="text-center py-20 animate-fade-in-up">
                 <div class="mx-auto h-20 w-20 mb-8 relative">
                     <div class="absolute inset-0 rounded-full border-4 border-zinc-800"></div>
                     <div class="absolute inset-0 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"></div>
                     <div class="absolute inset-4 rounded-full border-4 border-white border-b-transparent animate-spin-reverse"></div>
                 </div>
                 <h2 class="text-xl font-bold text-white tracking-widest uppercase">Deploying...</h2>
                 <p class="text-zinc-500 mt-2 font-mono">CONFIRMING CELL CREATION ON CKB</p>
             </div>
          }

          @if (currentStep() === 'success' && createdEvent()) {
             <div class="bg-zinc-900/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden animate-fade-in-up">
                <div class="bg-gradient-to-b from-lime-900/20 to-zinc-900/50 p-8 text-center border-b border-white/5">
                   <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lime-500/20 border border-lime-500/30 mb-4 shadow-[0_0_20px_rgba(132,204,22,0.3)]">
                     <svg class="h-8 w-8 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                     </svg>
                   </div>
                   <h2 class="text-2xl font-bold text-white">Deployment Successful</h2>
                   <p class="text-lime-300/70 mt-1 font-mono text-sm">HASH: {{ createdEvent()?.name }}</p>
                </div>
                
                <div class="p-6 sm:p-8 text-center">
                   <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Protocol ID</p>
                   <div class="bg-black/50 border border-white/10 rounded-xl py-4 px-8 inline-block mb-8 shadow-inner max-w-full">
                      <span class="text-3xl sm:text-4xl font-mono font-bold text-lime-400 tracking-wider drop-shadow-[0_0_8px_rgba(132,204,22,0.5)] break-all">{{ createdEvent()?.id }}</span>
                   </div>
                   
                   <p class="text-sm text-zinc-400 mb-8 max-w-sm mx-auto">
                     Distribute this ID to attendees. It serves as the key for minting their proof of presence.
                   </p>

                   <div class="flex flex-col sm:flex-row gap-4">
                      <button (click)="reset()" class="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-white/10 transition-colors">
                        Deploy Another
                      </button>
                      <a routerLink="/check-in" class="flex-1 rounded-xl bg-white text-black px-4 py-3 text-sm font-bold hover:bg-lime-400 transition-colors text-center shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                        Test Flow
                      </a>
                   </div>
                </div>
             </div>
          }

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
      animation: fade-in-up 0.5s ease-out forwards;
    }
    .animate-spin-reverse {
        animation: spin 1s linear infinite reverse;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
  `]
})
export class CreateEventComponent {
  walletService = inject(WalletService);
  poapService = inject(PoapService);
  fb: FormBuilder = inject(FormBuilder);
  
  showModal = signal(false);
  currentStep = signal<CreateStep>('form');
  createdEvent = signal<PoPEvent | null>(null);
  uploadedImage = signal<string | null>(null);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    date: ['', [Validators.required]],
    location: ['', [Validators.required]],
    description: ['']
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

  reset() {
    this.form.reset();
    this.currentStep.set('form');
    this.createdEvent.set(null);
    this.uploadedImage.set(null);
  }
}