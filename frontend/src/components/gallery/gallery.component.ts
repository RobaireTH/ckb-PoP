import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PoapService, PoPEvent, Attendee } from '../../services/poap.service';
import { WalletService } from '../../services/wallet.service';
import { WalletModalComponent } from '../wallet-modal/wallet-modal.component';

type Tab = 'badges' | 'events';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, WalletModalComponent, RouterLink],
  template: `
    <div class="min-h-screen py-24 px-0 sm:px-6 lg:px-8">
      <div class="max-w-[1400px] mx-auto">
        
        @if (!walletService.isConnected()) {
           <div class="border border-zinc-800 bg-zinc-900/50 p-8 sm:p-12 text-center max-w-lg mx-auto mt-20 mx-4">
             <div class="w-16 h-16 bg-zinc-800 mx-auto mb-6 flex items-center justify-center">
                <svg class="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
             </div>
             <h2 class="font-display text-2xl text-white mb-2">Encrypted Archive</h2>
             <p class="font-mono text-sm text-zinc-500 mb-8">Authenticate to view assets.</p>
             <button (click)="showModal.set(true)" class="bg-white text-black font-bold uppercase tracking-widest px-8 py-3 hover:bg-lime-400 transition-colors w-full sm:w-auto">
                Connect Wallet
             </button>
           </div>
        } @else {
           
           <!-- Controls Header -->
           <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-6 border-b border-zinc-800 pb-6 px-4 sm:px-0">
              <div>
                 <h1 class="font-display text-3xl sm:text-4xl text-white mb-2">My Assets</h1>
                 
                 <!-- Copy Address Button -->
                 <button 
                   (click)="copyAddress()" 
                   class="group flex items-center gap-2 font-mono text-xs text-zinc-500 hover:text-white transition-colors active:scale-95 origin-left"
                   title="Copy Address">
                    <span>{{ walletService.address() }}</span>
                    @if (copied()) {
                      <span class="text-lime-400 font-bold text-[10px] uppercase tracking-wider animate-pulse">COPIED</span>
                    } @else {
                      <svg class="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    }
                 </button>
              </div>

              <div class="flex gap-4 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                 <button 
                   (click)="activeTab.set('badges')"
                   [class.text-lime-400]="activeTab() === 'badges'"
                   [class.border-lime-400]="activeTab() === 'badges'"
                   class="font-mono text-sm uppercase tracking-widest pb-1 border-b-2 border-transparent hover:text-white transition-colors whitespace-nowrap"
                 >
                   // Badges
                 </button>
                 <button 
                   (click)="activeTab.set('events')"
                   [class.text-lime-400]="activeTab() === 'events'"
                   [class.border-lime-400]="activeTab() === 'events'"
                   class="font-mono text-sm uppercase tracking-widest pb-1 border-b-2 border-transparent hover:text-white transition-colors whitespace-nowrap"
                 >
                   // Created_Events
                 </button>
              </div>
           </div>

           <!-- Grid -->
           <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800 border-t border-b border-zinc-800 sm:border">
             
             @if (activeTab() === 'badges') {
               @for (badge of poapService.myBadges(); track badge.id) {
                  <div class="bg-zinc-950 p-6 group hover:bg-zinc-900 transition-colors relative">
                    <!-- Image -->
                    <div class="aspect-square bg-black mb-6 relative overflow-hidden shadow-lg">
                       <img [src]="badge.imageUrl" class="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all duration-500 opacity-80 group-hover:opacity-100">
                       <div class="absolute bottom-0 left-0 bg-lime-400 text-black text-[10px] font-bold px-2 py-1 font-mono">
                          {{ badge.role | uppercase }}
                       </div>
                    </div>
                    
                    <h3 class="font-display text-lg text-white mb-1 leading-tight">{{ badge.eventName }}</h3>
                    <p class="font-mono text-[10px] text-zinc-500 mb-4 truncate">{{ badge.txHash }}</p>
                    
                    <div class="border-t border-zinc-800 pt-4 flex justify-between items-center">
                       <span class="font-mono text-xs text-zinc-400">{{ badge.mintDate | date:'MM.dd.yy' }}</span>
                       <button class="w-6 h-6 border border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white">
                          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                       </button>
                    </div>
                  </div>
               } @empty {
                  <div class="col-span-full bg-zinc-950 p-20 text-center font-mono text-zinc-600">
                     NO_ASSETS_FOUND
                  </div>
               }
             } @else {
               <!-- EVENTS TAB -->
               @for (event of poapService.myCreatedEvents(); track event.id) {
                  <div (click)="openEventDetails(event)" class="bg-zinc-950 p-6 group hover:bg-zinc-900 transition-colors cursor-pointer relative">
                    
                    <!-- Event Banner -->
                    <div class="aspect-video w-full bg-zinc-900 mb-6 relative overflow-hidden border border-white/5 shadow-lg">
                        <img [src]="event.imageUrl" class="absolute inset-0 w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">
                        <div class="absolute top-3 right-3 w-2 h-2 rounded-full bg-lime-500 animate-pulse shadow-[0_0_8px_#84cc16] z-10"></div>
                        
                        <!-- Overlay Title for Contrast if image is dark -->
                        <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span class="font-mono text-[10px] text-lime-400">DEPLOYED_CONTRACT</span>
                        </div>
                    </div>
                    
                    <h3 class="font-display text-xl text-white mb-1 group-hover:text-lime-400 transition-colors truncate">{{ event.name }}</h3>
                    <p class="font-mono text-xs text-zinc-500 mb-6 truncate">{{ event.location }}</p>

                    <div class="flex gap-2">
                       <button 
                            [routerLink]="['/event', event.id, 'live']"
                            (click)="$event.stopPropagation()" 
                            class="flex-1 bg-zinc-800 hover:bg-white hover:text-black text-xs font-mono py-2.5 transition-colors border border-white/10 uppercase tracking-wide">
                            Launch Kiosk
                       </button>
                    </div>
                  </div>
               } @empty {
                  <div class="col-span-full bg-zinc-950 p-20 text-center font-mono text-zinc-600">
                     NO_CONTRACTS_DEPLOYED
                  </div>
               }
             }

           </div>
        }
      </div>
    </div>

    <!-- Event Detail Modal (Slide Over) -->
    @if (selectedEvent()) {
      <div class="fixed inset-0 z-50 flex justify-end">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" (click)="selectedEvent.set(null)"></div>
        
        <div class="relative w-full max-w-md bg-zinc-950 border-l border-zinc-800 shadow-2xl h-full flex flex-col transform transition-transform duration-300">
           
           <div class="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 class="font-mono text-xs uppercase text-zinc-500">Event_Details // {{ selectedEvent()?.id }}</h2>
              <button (click)="selectedEvent.set(null)" class="text-white hover:text-lime-400 p-2">
                 <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
           </div>

           <div class="flex-1 overflow-y-auto p-6">
              <div class="aspect-video bg-zinc-900 mb-6 border border-zinc-800 relative overflow-hidden">
                 <img [src]="selectedEvent()?.imageUrl" class="opacity-50 object-cover w-full h-full">
                 <div class="absolute bottom-4 left-4 font-display text-2xl font-bold text-white drop-shadow-md">{{ selectedEvent()?.name }}</div>
              </div>

              <div class="mb-8">
                 <div class="font-mono text-[10px] text-zinc-500 mb-2">ATTENDEE_LOG</div>
                 <div class="space-y-px bg-zinc-800 border border-zinc-800">
                    @for (attendee of attendees(); track attendee.txHash) {
                       <div class="bg-zinc-950 p-3 flex justify-between items-center">
                          <span class="font-mono text-xs text-zinc-300">{{ attendee.address | slice:0:12 }}...</span>
                          <span class="font-mono text-[10px] text-zinc-600">{{ attendee.mintDate | date:'HH:mm:ss' }}</span>
                       </div>
                    } @empty {
                       <div class="bg-zinc-950 p-4 text-center font-mono text-xs text-zinc-600">Waiting for blocks...</div>
                    }
                 </div>
              </div>
           </div>

           <div class="p-6 border-t border-zinc-800 bg-zinc-900 safe-pb">
              <a [routerLink]="['/event', selectedEvent()?.id, 'live']" class="block w-full text-center bg-lime-400 text-black font-bold py-4 uppercase tracking-widest hover:bg-lime-300">
                 Activate Live Mode
              </a>
           </div>

        </div>
      </div>
    }

    @if (showModal()) {
      <app-wallet-modal (close)="showModal.set(false)"></app-wallet-modal>
    }
  `,
  styles: [`
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .safe-pb {
      padding-bottom: env(safe-area-inset-bottom, 24px);
    }
  `]
})
export class GalleryComponent {
  poapService = inject(PoapService);
  walletService = inject(WalletService);
  
  showModal = signal(false);
  activeTab = signal<Tab>('badges');
  
  selectedEvent = signal<PoPEvent | null>(null);
  attendees = signal<Attendee[]>([]);
  copied = signal(false);

  openEventDetails(event: PoPEvent) {
    this.selectedEvent.set(event);
    this.attendees.set([]);
    this.poapService.getAttendees(event.id).then(data => {
      this.attendees.set(data);
    });
  }

  copyAddress() {
    const addr = this.walletService.address();
    if (addr) {
      navigator.clipboard.writeText(addr).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      }).catch(err => {
         console.error('Failed to copy: ', err);
      });
    }
  }
}