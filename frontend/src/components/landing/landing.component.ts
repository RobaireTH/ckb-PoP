import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen flex flex-col pt-11">

      <!-- Hero -->
      <section class="flex-1 flex items-center px-4 py-8 sm:py-12">
        <div class="max-w-4xl mx-auto w-full">

          <!-- Network Status Pill -->
          <div class="inline-flex items-center gap-2 px-3 py-1.5 border border-lime-400/30 bg-lime-400/5 mb-6 sm:mb-8">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-lime-400"></span>
            </span>
            <span class="font-mono text-[10px] text-lime-400 uppercase tracking-[0.15em]">Live on Testnet</span>
          </div>

          <!-- Main Title - Responsive -->
          <div class="mb-6 sm:mb-8">
            <h1 class="hero-title font-display font-bold text-white leading-[0.95] tracking-tight">
              <span class="block">Proof of</span>
              <span class="block text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-lime-300 to-emerald-400">
                Presence
              </span>
            </h1>
          </div>

          <!-- Tagline -->
          <p class="text-sm sm:text-base text-zinc-500 max-w-md mb-8 leading-relaxed">
            <span class="text-zinc-400">Non-transferable attestations</span> on Nervos CKB.
            Verifiable proof you were there — permissionless, on-chain, permanent.
          </p>

          <!-- CTA Buttons -->
          <div class="flex flex-col sm:flex-row gap-3 mb-10 sm:mb-12">
            @if (walletService.isConnected()) {
              <a routerLink="/check-in" class="btn-primary-hero group">
                <span>Verify Attendance</span>
                <svg class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                </svg>
              </a>
            } @else {
              <a routerLink="/check-in" class="btn-primary-hero group">
                <span>Get Started</span>
                <svg class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                </svg>
              </a>
            }
            <a routerLink="/create" class="btn-secondary-hero group">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/>
              </svg>
              <span>Create Event</span>
            </a>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-3 gap-px bg-white/[0.04] border border-white/[0.04]">
            <div class="bg-black p-4 sm:p-5 text-center sm:text-left">
              <div class="font-mono text-xl sm:text-2xl text-white font-medium">12.8K</div>
              <div class="font-mono text-[9px] text-zinc-600 uppercase tracking-[0.1em] mt-1">Attestations</div>
            </div>
            <div class="bg-black p-4 sm:p-5 text-center sm:text-left">
              <div class="font-mono text-xl sm:text-2xl text-white font-medium">847</div>
              <div class="font-mono text-[9px] text-zinc-600 uppercase tracking-[0.1em] mt-1">Events</div>
            </div>
            <div class="bg-black p-4 sm:p-5 text-center sm:text-left">
              <div class="font-mono text-xl sm:text-2xl text-lime-400 font-medium">100%</div>
              <div class="font-mono text-[9px] text-zinc-600 uppercase tracking-[0.1em] mt-1">On-chain</div>
            </div>
          </div>

        </div>
      </section>

      <!-- Features Section -->
      <section class="border-t border-white/[0.04]">
        <div class="max-w-4xl mx-auto px-4 py-8 sm:py-10">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            @for (feature of features; track feature.title) {
              <div class="feature-card group">
                <div class="feature-icon">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" [attr.d]="feature.icon"/>
                  </svg>
                </div>
                <div class="font-mono text-[10px] text-lime-400/80 uppercase tracking-[0.12em] mb-1">{{ feature.title }}</div>
                <div class="text-xs text-zinc-500 leading-relaxed">{{ feature.desc }}</div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Tech Marquee -->
      <div class="border-t border-white/[0.04] py-3 overflow-hidden bg-zinc-950/50">
        <div class="marquee-container">
          <div class="marquee-content">
            @for (item of techItems; track $index) {
              <div class="flex items-center">
                <span class="mx-4 font-mono text-[9px] text-zinc-700 uppercase tracking-[0.15em]">{{ item }}</span>
                <span class="text-zinc-700/40 text-[8px]">◆</span>
              </div>
            }
            @for (item of techItems; track $index) {
              <div class="flex items-center">
                <span class="mx-4 font-mono text-[9px] text-zinc-700 uppercase tracking-[0.15em]">{{ item }}</span>
                <span class="text-zinc-700/40 text-[8px]">◆</span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hero-title {
      font-size: clamp(2.5rem, 10vw, 4.5rem);
    }

    .btn-primary-hero {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #a3e635 0%, #65a30d 100%);
      color: black;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    .btn-primary-hero::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
      transition: left 0.5s ease;
    }
    .btn-primary-hero:hover::before {
      left: 100%;
    }
    .btn-primary-hero:hover {
      box-shadow: 0 0 30px rgba(163, 230, 53, 0.4), inset 0 0 20px rgba(255,255,255,0.1);
      transform: translateY(-1px);
    }

    .btn-secondary-hero {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.7);
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      transition: all 0.2s ease;
    }
    .btn-secondary-hero:hover {
      border-color: rgba(163, 230, 53, 0.3);
      color: white;
      background: rgba(163, 230, 53, 0.05);
    }

    .feature-card {
      padding: 16px;
      border: 1px solid rgba(255,255,255,0.04);
      background: rgba(0,0,0,0.3);
      transition: all 0.2s ease;
    }
    .feature-card:hover {
      border-color: rgba(163, 230, 53, 0.15);
      background: rgba(163, 230, 53, 0.02);
    }
    .feature-icon {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(163, 230, 53, 0.2);
      background: rgba(163, 230, 53, 0.05);
      color: #a3e635;
      margin-bottom: 12px;
      transition: all 0.2s ease;
    }
    .feature-card:hover .feature-icon {
      background: rgba(163, 230, 53, 0.1);
      border-color: rgba(163, 230, 53, 0.3);
    }

    .marquee-container {
      display: flex;
      overflow: hidden;
    }
    .marquee-content {
      display: flex;
      align-items: center;
      animation: marquee 25s linear infinite;
      white-space: nowrap;
    }
    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
  `]
})
export class LandingComponent {
  walletService = inject(WalletService);

  features = [
    {
      title: 'Soulbound',
      desc: 'Non-transferable tokens permanently bound to your wallet. No trading.',
      icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
    },
    {
      title: 'Verifiable',
      desc: 'Cryptographic proofs stored on CKB. Anyone can audit independently.',
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
    },
    {
      title: 'Permissionless',
      desc: 'No admins, no approval. Protocol enforces rules autonomously.',
      icon: 'M13 10V3L4 14h7v7l9-11h-7z'
    }
  ];

  techItems = ['Nervos CKB', 'Cell Model', 'DOB Protocol', 'RISC-V', 'Layer 1', 'PoW Security'];
}
