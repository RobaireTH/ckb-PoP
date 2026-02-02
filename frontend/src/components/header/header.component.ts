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
          <nav class="hidden md:flex items-center gap-1">
             <a routerLink="/check-in"
                routerLinkActive="active-nav-item"
                #rlaCheckIn="routerLinkActive"
                class="nav-item px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-all duration-300 relative group">
               <span class="relative z-10">Check In</span>
               <span class="nav-bg"></span>
               <span class="nav-indicator" [class.active]="rlaCheckIn.isActive"></span>
             </a>
             <a routerLink="/create"
                routerLinkActive="active-nav-item"
                #rlaCreate="routerLinkActive"
                class="nav-item px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-all duration-300 relative group">
               <span class="relative z-10">Create Event</span>
               <span class="nav-bg"></span>
               <span class="nav-indicator" [class.active]="rlaCreate.isActive"></span>
             </a>
             <a routerLink="/gallery"
                routerLinkActive="active-nav-item"
                #rlaGallery="routerLinkActive"
                class="nav-item px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-all duration-300 relative group">
               <span class="relative z-10">Dashboard</span>
               <span class="nav-bg"></span>
               <span class="nav-indicator" [class.active]="rlaGallery.isActive"></span>
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

    /* Nav item styles */
    .nav-item {
      position: relative;
      overflow: hidden;
    }
    .nav-bg {
      position: absolute;
      inset: 0;
      background: rgba(163, 230, 53, 0.1);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .nav-item:hover .nav-bg {
      transform: scaleX(1);
    }
    .nav-indicator {
      position: absolute;
      bottom: 0;
      left: 50%;
      width: 0;
      height: 2px;
      background: #a3e635;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateX(-50%);
      box-shadow: 0 0 10px rgba(163, 230, 53, 0.5);
    }
    .nav-indicator.active {
      width: 100%;
      left: 0;
      transform: translateX(0);
    }
    .nav-item:hover .nav-indicator:not(.active) {
      width: 30%;
    }
    .active-nav-item {
      color: #a3e635 !important;
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