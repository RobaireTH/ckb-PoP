import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PoapService, PoPEvent, Attendee, Badge } from '../../services/poap.service';
import { WalletService } from '../../services/wallet.service';
import { WalletModalComponent } from '../wallet-modal/wallet-modal.component';

type Tab = 'badges' | 'events';
type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc';
type RoleFilter = 'all' | 'Attendee' | 'Organizer' | 'Certificate';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, WalletModalComponent, RouterLink],
  template: `
    <div class="min-h-screen py-24 px-0 sm:px-6 lg:px-8">
      <div class="max-w-[1400px] mx-auto">

        @if (!walletService.isConnected()) {
           <div class="max-w-2xl mx-4 sm:mx-auto mt-16">
             <!-- Main Card -->
             <div class="border border-zinc-800 bg-zinc-900/50 p-8 sm:p-12 text-center relative overflow-hidden">
               <!-- Background Pattern -->
               <div class="absolute inset-0 opacity-5">
                 <div class="absolute inset-0" style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 24px 24px;"></div>
               </div>

               <div class="relative z-10">
                 <!-- Icon -->
                 <div class="w-20 h-20 bg-zinc-800 mx-auto mb-6 flex items-center justify-center border border-zinc-700">
                   <svg class="w-10 h-10 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                   </svg>
                 </div>

                 <h2 class="font-display text-3xl text-white mb-3">Your Digital Collection</h2>
                 <p class="font-mono text-sm text-zinc-400 mb-8 max-w-md mx-auto">
                   Connect your wallet to view badges, certificates, and events you've created or attended.
                 </p>

                 <button (click)="showModal.set(true)" class="bg-lime-400 text-black font-bold uppercase tracking-widest px-8 py-4 hover:bg-lime-300 transition-colors w-full sm:w-auto mb-6">
                   Connect Wallet
                 </button>

                 <!-- Features Preview -->
                 <div class="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-zinc-800">
                   <div class="text-center">
                     <div class="font-mono text-2xl text-white mb-1">◈</div>
                     <div class="font-mono text-[10px] text-zinc-500 uppercase">Badges</div>
                   </div>
                   <div class="text-center">
                     <div class="font-mono text-2xl text-white mb-1">◇</div>
                     <div class="font-mono text-[10px] text-zinc-500 uppercase">Certificates</div>
                   </div>
                   <div class="text-center">
                     <div class="font-mono text-2xl text-white mb-1">⬡</div>
                     <div class="font-mono text-[10px] text-zinc-500 uppercase">Events</div>
                   </div>
                 </div>
               </div>
             </div>

             <!-- Quick Actions -->
             <div class="grid grid-cols-2 gap-px mt-px bg-zinc-800">
               <a routerLink="/check-in" class="bg-zinc-950 p-6 text-center hover:bg-zinc-900 transition-colors group">
                 <div class="font-mono text-xs text-zinc-500 group-hover:text-lime-400 uppercase tracking-wider">Have a code?</div>
                 <div class="font-display text-white mt-1">Check In →</div>
               </a>
               <a routerLink="/create" class="bg-zinc-950 p-6 text-center hover:bg-zinc-900 transition-colors group">
                 <div class="font-mono text-xs text-zinc-500 group-hover:text-lime-400 uppercase tracking-wider">Hosting?</div>
                 <div class="font-display text-white mt-1">Create Event →</div>
               </a>
             </div>
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

           <!-- Filter/Sort Controls for Badges -->
           @if (activeTab() === 'badges') {
             <div class="flex flex-wrap items-center gap-3 mb-6 px-4 sm:px-0">
               <!-- Role Filter -->
               <div class="flex items-center gap-2">
                 <span class="font-mono text-[10px] text-zinc-500 uppercase">Filter:</span>
                 <div class="flex gap-1">
                   @for (role of roleFilters; track role) {
                     <button
                       (click)="roleFilter.set(role)"
                       class="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider border transition-all"
                       [class.bg-lime-400]="roleFilter() === role"
                       [class.text-black]="roleFilter() === role"
                       [class.border-lime-400]="roleFilter() === role"
                       [class.bg-transparent]="roleFilter() !== role"
                       [class.text-zinc-400]="roleFilter() !== role"
                       [class.border-zinc-700]="roleFilter() !== role"
                       [class.hover:border-zinc-500]="roleFilter() !== role"
                     >
                       {{ role === 'all' ? 'All' : role }}
                     </button>
                   }
                 </div>
               </div>

               <!-- Sort Dropdown -->
               <div class="flex items-center gap-2 ml-auto">
                 <span class="font-mono text-[10px] text-zinc-500 uppercase">Sort:</span>
                 <div class="relative">
                   <button
                     (click)="showSortDropdown.set(!showSortDropdown())"
                     class="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700 font-mono text-[10px] uppercase tracking-wider text-zinc-300 hover:border-zinc-500 transition-colors"
                   >
                     <span>{{ getSortLabel(sortOption()) }}</span>
                     <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                     </svg>
                   </button>
                   @if (showSortDropdown()) {
                     <div class="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 z-20 min-w-[140px]">
                       @for (option of sortOptions; track option.value) {
                         <button
                           (click)="sortOption.set(option.value); showSortDropdown.set(false)"
                           class="w-full px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider transition-colors"
                           [class.bg-lime-400]="sortOption() === option.value"
                           [class.text-black]="sortOption() === option.value"
                           [class.text-zinc-300]="sortOption() !== option.value"
                           [class.hover:bg-zinc-800]="sortOption() !== option.value"
                         >
                           {{ option.label }}
                         </button>
                       }
                     </div>
                   }
                 </div>
               </div>

               <!-- Results count -->
               <span class="font-mono text-[10px] text-zinc-600 hidden sm:block">
                 {{ filteredBadges().length }} {{ filteredBadges().length === 1 ? 'badge' : 'badges' }}
               </span>
             </div>
           }

           <!-- Grid -->
           <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800 border-t border-b border-zinc-800 sm:border overflow-hidden">

             @if (loading()) {
               <!-- Skeleton Loaders -->
               @for (i of [1,2,3,4]; track i) {
                 <div class="bg-zinc-950 p-6 animate-pulse">
                   @if (activeTab() === 'badges') {
                     <div class="aspect-square bg-zinc-800 mb-6 skeleton-shimmer"></div>
                     <div class="h-5 bg-zinc-800 mb-2 w-3/4 skeleton-shimmer"></div>
                     <div class="h-3 bg-zinc-800 mb-4 w-1/2 skeleton-shimmer"></div>
                     <div class="border-t border-zinc-800 pt-4 flex justify-between items-center">
                       <div class="h-3 bg-zinc-800 w-16 skeleton-shimmer"></div>
                       <div class="w-6 h-6 bg-zinc-800 skeleton-shimmer"></div>
                     </div>
                   } @else {
                     <div class="aspect-video bg-zinc-800 mb-6 skeleton-shimmer"></div>
                     <div class="h-6 bg-zinc-800 mb-2 w-2/3 skeleton-shimmer"></div>
                     <div class="h-3 bg-zinc-800 mb-6 w-1/2 skeleton-shimmer"></div>
                     <div class="h-10 bg-zinc-800 skeleton-shimmer"></div>
                   }
                 </div>
               }
             } @else if (activeTab() === 'badges') {
               @for (badge of filteredBadges(); track badge.id; let i = $index) {
                  <div class="bg-zinc-950 p-6 group hover:bg-zinc-900 transition-colors relative tab-item" [style.animation-delay]="(i * 50) + 'ms'">
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
                  <div class="col-span-full bg-zinc-950 p-12 sm:p-16 tab-item">
                    <div class="max-w-md mx-auto text-center">
                      <!-- Icon -->
                      <div class="w-16 h-16 border border-dashed border-zinc-700 mx-auto mb-6 flex items-center justify-center">
                        <svg class="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>

                      @if (roleFilter() === 'all') {
                        <h3 class="font-display text-xl text-white mb-2">No Badges Yet</h3>
                        <p class="font-mono text-sm text-zinc-500 mb-6">
                          Attend events and collect proof-of-presence badges on the blockchain.
                        </p>
                        <a routerLink="/check-in" class="inline-flex items-center gap-2 bg-lime-400 text-black font-bold text-sm uppercase tracking-wider px-6 py-3 hover:bg-lime-300 transition-colors">
                          <span>Check Into Event</span>
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                          </svg>
                        </a>
                      } @else {
                        <h3 class="font-display text-xl text-white mb-2">No {{ roleFilter() }} Badges</h3>
                        <p class="font-mono text-sm text-zinc-500 mb-6">
                          You don't have any badges with the "{{ roleFilter() }}" role yet.
                        </p>
                        <button (click)="roleFilter.set('all')" class="inline-flex items-center gap-2 border border-zinc-700 text-white font-mono text-sm uppercase tracking-wider px-6 py-3 hover:border-lime-400 hover:text-lime-400 transition-colors">
                          View All Badges
                        </button>
                      }
                    </div>
                  </div>
               }
             } @else {
               <!-- EVENTS TAB -->
               @for (event of poapService.myCreatedEvents(); track event.id; let i = $index) {
                  <div (click)="openEventDetails(event)" class="bg-zinc-950 p-6 group hover:bg-zinc-900 transition-colors cursor-pointer relative tab-item" [style.animation-delay]="(i * 50) + 'ms'">

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
                  <div class="col-span-full bg-zinc-950 p-12 sm:p-16 tab-item">
                    <div class="max-w-md mx-auto text-center">
                      <!-- Icon -->
                      <div class="w-16 h-16 border border-dashed border-zinc-700 mx-auto mb-6 flex items-center justify-center">
                        <svg class="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>

                      <h3 class="font-display text-xl text-white mb-2">No Events Created</h3>
                      <p class="font-mono text-sm text-zinc-500 mb-6">
                        Create your first event and start issuing proof-of-presence badges to attendees.
                      </p>

                      <a routerLink="/create" class="inline-flex items-center gap-2 bg-lime-400 text-black font-bold text-sm uppercase tracking-wider px-6 py-3 hover:bg-lime-300 transition-colors">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        <span>Create Event</span>
                      </a>

                      <!-- Tips -->
                      <div class="mt-8 pt-6 border-t border-zinc-800 text-left">
                        <div class="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mb-3">What you can do:</div>
                        <ul class="space-y-2 font-mono text-xs text-zinc-400">
                          <li class="flex items-start gap-2">
                            <span class="text-lime-400 mt-0.5">→</span>
                            <span>Host conferences, meetups, or workshops</span>
                          </li>
                          <li class="flex items-start gap-2">
                            <span class="text-lime-400 mt-0.5">→</span>
                            <span>Display rotating QR codes for attendee check-in</span>
                          </li>
                          <li class="flex items-start gap-2">
                            <span class="text-lime-400 mt-0.5">→</span>
                            <span>Issue verifiable on-chain attendance badges</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
               }
             }

           </div>
        }
      </div>
    </div>

    <!-- Click outside to close dropdown -->
    @if (showSortDropdown()) {
      <div class="fixed inset-0 z-10" (click)="showSortDropdown.set(false)"></div>
    }

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
                    @if (loadingAttendees()) {
                      @for (i of [1,2,3]; track i) {
                        <div class="bg-zinc-950 p-3 flex justify-between items-center animate-pulse">
                          <div class="h-3 bg-zinc-800 w-24 skeleton-shimmer"></div>
                          <div class="h-3 bg-zinc-800 w-16 skeleton-shimmer"></div>
                        </div>
                      }
                    } @else {
                      @for (attendee of attendees(); track attendee.txHash) {
                         <div class="bg-zinc-950 p-3 flex justify-between items-center">
                            <span class="font-mono text-xs text-zinc-300">{{ attendee.address | slice:0:12 }}...</span>
                            <span class="font-mono text-[10px] text-zinc-600">{{ attendee.mintDate | date:'HH:mm:ss' }}</span>
                         </div>
                      } @empty {
                         <div class="bg-zinc-950 p-4 text-center font-mono text-xs text-zinc-600">Waiting for blocks...</div>
                      }
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
    .skeleton-shimmer {
      background: linear-gradient(90deg, #27272a 0%, #3f3f46 50%, #27272a 100%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes tab-fade-in {
      0% {
        opacity: 0;
        transform: translateY(10px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .tab-item {
      animation: tab-fade-in 0.4s ease-out forwards;
      opacity: 0;
    }
  `]
})
export class GalleryComponent implements OnInit {
  poapService = inject(PoapService);
  walletService = inject(WalletService);

  showModal = signal(false);
  activeTab = signal<Tab>('badges');
  loading = signal(false);
  loadingAttendees = signal(false);

  // Filter/Sort state
  roleFilter = signal<RoleFilter>('all');
  sortOption = signal<SortOption>('newest');
  showSortDropdown = signal(false);

  roleFilters: RoleFilter[] = ['all', 'Attendee', 'Organizer', 'Certificate'];
  sortOptions = [
    { value: 'newest' as SortOption, label: 'Newest First' },
    { value: 'oldest' as SortOption, label: 'Oldest First' },
    { value: 'name-asc' as SortOption, label: 'Name A-Z' },
    { value: 'name-desc' as SortOption, label: 'Name Z-A' }
  ];

  // Computed filtered and sorted badges
  filteredBadges = computed(() => {
    let badges = [...this.poapService.myBadges()];

    // Apply role filter
    if (this.roleFilter() !== 'all') {
      badges = badges.filter(b => b.role === this.roleFilter());
    }

    // Apply sort
    switch (this.sortOption()) {
      case 'newest':
        badges.sort((a, b) => new Date(b.mintDate).getTime() - new Date(a.mintDate).getTime());
        break;
      case 'oldest':
        badges.sort((a, b) => new Date(a.mintDate).getTime() - new Date(b.mintDate).getTime());
        break;
      case 'name-asc':
        badges.sort((a, b) => a.eventName.localeCompare(b.eventName));
        break;
      case 'name-desc':
        badges.sort((a, b) => b.eventName.localeCompare(a.eventName));
        break;
    }

    return badges;
  });

  selectedEvent = signal<PoPEvent | null>(null);
  attendees = signal<Attendee[]>([]);
  copied = signal(false);

  constructor() {
    // Trigger loading state when wallet connects
    effect(() => {
      if (this.walletService.isConnected()) {
        this.simulateLoad();
      }
    });
  }

  ngOnInit() {
    if (this.walletService.isConnected()) {
      this.simulateLoad();
    }
  }

  private simulateLoad() {
    this.loading.set(true);
    setTimeout(() => this.loading.set(false), 1200);
  }

  getSortLabel(option: SortOption): string {
    return this.sortOptions.find(o => o.value === option)?.label || '';
  }

  openEventDetails(event: PoPEvent) {
    this.selectedEvent.set(event);
    this.attendees.set([]);
    this.loadingAttendees.set(true);
    this.poapService.getAttendees(event.id).then(data => {
      this.attendees.set(data);
      this.loadingAttendees.set(false);
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