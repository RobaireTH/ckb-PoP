import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { WalletService } from '../../services/wallet.service';
import { WalletModalComponent } from '../wallet-modal/wallet-modal.component';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, WalletModalComponent],
  template: `
    <!-- Mobile Bottom Navigation - only visible on mobile -->
    <nav class="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-black/90 backdrop-blur-lg border-t border-white/10 safe-area-bottom">
      <div class="flex items-center justify-around h-16 px-2">

        <!-- Home -->
        <a routerLink="/"
           routerLinkActive="active"
           [routerLinkActiveOptions]="{exact: true}"
           class="nav-item flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px]">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span class="text-[10px] font-medium">Home</span>
        </a>

        <!-- Check In -->
        <a routerLink="/check-in"
           routerLinkActive="active"
           class="nav-item flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px]">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <span class="text-[10px] font-medium">Check In</span>
        </a>

        <!-- Create Event -->
        <a routerLink="/create"
           routerLinkActive="active"
           class="nav-item flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px]">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-[10px] font-medium">Create</span>
        </a>

        <!-- Dashboard/Gallery -->
        <a routerLink="/gallery"
           routerLinkActive="active"
           class="nav-item flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px]">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span class="text-[10px] font-medium">Badges</span>
        </a>

        <!-- Wallet -->
        <button (click)="openWalletModal()"
                class="nav-item flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px]"
                [class.connected]="walletService.isConnected()">
          @if (walletService.isConnected()) {
            <div class="relative">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <div class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]"></div>
            </div>
          } @else {
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
          <span class="text-[10px] font-medium">
            {{ walletService.isConnected() ? 'Wallet' : 'Connect' }}
          </span>
        </button>

      </div>
    </nav>

    @if (showModal()) {
      <app-wallet-modal (close)="closeModal()"></app-wallet-modal>
    }
  `,
  styles: [`
    .safe-area-bottom {
      padding-bottom: env(safe-area-inset-bottom, 0);
    }

    .nav-item {
      color: #71717a;
      transition: all 0.2s ease;
      position: relative;
    }

    .nav-item:active {
      transform: scale(0.95);
    }

    .nav-item.active,
    .nav-item.connected {
      color: #a3e635;
    }

    .nav-item.active::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 32px;
      height: 2px;
      background: #a3e635;
      border-radius: 0 0 2px 2px;
      box-shadow: 0 0 8px rgba(163, 230, 53, 0.5);
    }
  `]
})
export class BottomNavComponent {
  walletService = inject(WalletService);
  showModal = signal(false);

  openWalletModal() {
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }
}
