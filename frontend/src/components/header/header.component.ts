import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { WalletService } from '../../services/wallet.service';
import { WalletModalComponent } from '../wallet-modal/wallet-modal.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, WalletModalComponent],
  template: `
    <header class="fixed top-0 z-40 w-full bg-black/80 backdrop-blur-md border-b border-white/5">
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div class="h-16 flex items-center justify-between">
          
          <!-- Brand -->
          <a routerLink="/" (click)="closeMenu()" class="flex items-center gap-3 group">
            <img src="assets/ckb-pop.png" alt="PoP Logo" class="h-10 w-10 object-contain">
            <div class="flex flex-col">
              <span class="font-display font-bold text-white leading-none tracking-tight">PoP Network</span>
              <span class="font-mono text-xs text-zinc-500 uppercase tracking-widest">Protocol V1.0</span>
            </div>
          </a>

          <!-- Desktop Navigation -->
          <nav class="hidden md:flex items-center gap-8">
             <a routerLink="/check-in" 
                routerLinkActive="text-lime-400" 
                #rlaCheckIn="routerLinkActive"
                class="text-sm font-medium text-zinc-400 hover:text-white transition-colors relative py-2">
               Check In
               <span class="absolute -bottom-[17px] left-0 w-full h-[1px] bg-lime-400 scale-x-0 transition-transform origin-left" 
                     [class.scale-x-100]="rlaCheckIn.isActive"></span>
             </a>
             <a routerLink="/create" 
                routerLinkActive="text-lime-400" 
                #rlaCreate="routerLinkActive"
                class="text-sm font-medium text-zinc-400 hover:text-white transition-colors relative py-2">
               Create Event
               <span class="absolute -bottom-[17px] left-0 w-full h-[1px] bg-lime-400 scale-x-0 transition-transform origin-left" 
                     [class.scale-x-100]="rlaCreate.isActive"></span>
             </a>
             <a routerLink="/gallery" 
                routerLinkActive="text-lime-400" 
                #rlaGallery="routerLinkActive"
                class="text-sm font-medium text-zinc-400 hover:text-white transition-colors relative py-2">
               Dashboard
               <span class="absolute -bottom-[17px] left-0 w-full h-[1px] bg-lime-400 scale-x-0 transition-transform origin-left" 
                     [class.scale-x-100]="rlaGallery.isActive"></span>
             </a>
          </nav>

          <!-- Right Side Actions -->
          <div class="flex items-center gap-4">
            <!-- Desktop Wallet Actions -->
            <div class="hidden md:flex">
              @if (walletService.isConnected()) {
                <button (click)="openWalletModal()" class="flex items-center gap-3 pl-3 pr-4 py-1.5 bg-zinc-900 border border-white/10 hover:border-lime-400/50 transition-all group">
                  <div class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                  <span class="font-mono text-xs text-zinc-300 group-hover:text-white">{{ walletService.shortAddress() }}</span>
                </button>
              } @else {
                <button (click)="openWalletModal()" class="relative px-6 py-2 bg-zinc-100 hover:bg-lime-400 hover:scale-105 transition-all duration-300 group">
                  <span class="relative z-10 text-xs font-bold uppercase tracking-wider text-black">Connect</span>
                  <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-black opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-black opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              }
            </div>
            
            <!-- Mobile Menu Toggle -->
            <div class="md:hidden">
              <button (click)="toggleMenu()" class="relative z-50 h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <span class="sr-only">Toggle menu</span>
                @if (isMenuOpen()) {
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                } @else {
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                }
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>

    <!-- Mobile Menu -->
    @if (isMenuOpen()) {
      <div class="fixed inset-0 top-16 z-30 bg-black/90 backdrop-blur-lg md:hidden animate-fade-in" (click)="closeMenu()">
        <div class="absolute inset-0 p-8 flex flex-col items-center justify-center" (click)="$event.stopPropagation()">
          <nav class="flex flex-col items-center gap-8">
              <a routerLink="/check-in" (click)="closeMenu()" class="font-display text-2xl text-zinc-300 hover:text-lime-400 transition-colors">Check In</a>
              <a routerLink="/create" (click)="closeMenu()" class="font-display text-2xl text-zinc-300 hover:text-lime-400 transition-colors">Create Event</a>
              <a routerLink="/gallery" (click)="closeMenu()" class="font-display text-2xl text-zinc-300 hover:text-lime-400 transition-colors">Dashboard</a>
          </nav>
          <div class="mt-16 pt-8 border-t border-white/10 w-full max-w-xs">
            @if (walletService.isConnected()) {
              <button (click)="openWalletModal()" class="w-full flex items-center justify-center gap-3 pl-3 pr-4 py-3 bg-zinc-900 border border-white/10 hover:border-lime-400/50 transition-all group">
                <div class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                <span class="font-mono text-sm text-zinc-300 group-hover:text-white">{{ walletService.shortAddress() }}</span>
              </button>
            } @else {
              <button (click)="openWalletModal()" class="w-full relative px-6 py-3 bg-zinc-100 hover:bg-lime-400 transition-all duration-300 group">
                <span class="relative z-10 text-sm font-bold uppercase tracking-wider text-black">Connect Wallet</span>
              </button>
            }
          </div>
        </div>
      </div>
    }

    @if (showModal()) {
      <app-wallet-modal (close)="closeModal()"></app-wallet-modal>
    }
  `,
  styles: [`
    @keyframes fade-in {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    .animate-fade-in {
      animation: fade-in 0.3s ease-out forwards;
    }
  `]
})
export class HeaderComponent {
  walletService = inject(WalletService);
  showModal = signal(false);
  isMenuOpen = signal(false);

  toggleMenu() {
    this.isMenuOpen.update(v => !v);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
  }

  openWalletModal() {
    this.closeMenu();
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }
}