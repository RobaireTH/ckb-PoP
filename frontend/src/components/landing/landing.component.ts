import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="relative pt-28 pb-16 sm:pt-40 sm:pb-24 overflow-hidden min-h-screen flex flex-col justify-center">
      
      <!-- Main Content Grid -->
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
        
        <!-- Typography Section -->
        <div class="lg:col-span-7 relative z-10 text-center lg:text-left">
           <div class="inline-flex items-center gap-2 mb-6 sm:mb-8 border-l-2 border-lime-400 pl-4 mx-auto lg:mx-0">
              <span class="font-mono text-[10px] sm:text-xs text-lime-400 uppercase tracking-widest">Sys.Status: Online</span>
              <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-lime-400 rounded-full animate-pulse"></span>
           </div>

           <h1 class="font-display text-4xl sm:text-6xl md:text-7xl xl:text-8xl font-bold text-white leading-[0.9] tracking-tighter mb-6 sm:mb-8">
             PROOF <br/>
             <span class="text-transparent bg-clip-text bg-gradient-to-r from-zinc-500 to-zinc-700">OF</span> <br/>
             PRESENCE
           </h1>
           
           <p class="font-sans text-base sm:text-lg text-zinc-400 max-w-xl leading-relaxed mb-8 sm:mb-10 lg:border-l border-white/10 lg:pl-6 mx-auto lg:mx-0">
             The decentralized standard for real-world attendance. Mint soulbound cryptographic artifacts on Nervos CKB. Zero-knowledge verification ready.
           </p>

           <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
             <a routerLink="/check-in" class="bg-lime-400 text-black px-8 py-4 font-bold uppercase tracking-wider hover:bg-lime-300 transition-colors clip-path-slant flex items-center justify-center gap-2 active:scale-95 text-sm sm:text-base">
               Initialize Check-In
               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
             </a>
             <a routerLink="/create" class="border border-zinc-700 text-white px-8 py-4 font-bold uppercase tracking-wider hover:bg-white/5 transition-colors active:scale-95 text-sm sm:text-base">
               Deploy Event
             </a>
           </div>
        </div>

        <!-- Graphic / Stats Section -->
        <div class="lg:col-span-5 relative mt-8 lg:mt-0">
           <!-- Decorative Grid Box -->
           <div class="relative aspect-square border border-white/10 bg-zinc-900/30 backdrop-blur-sm p-6 sm:p-8 flex flex-col justify-between max-w-sm mx-auto lg:max-w-none">
              <!-- Corner Markers -->
              <div class="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-lime-400"></div>
              <div class="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/20"></div>
              <div class="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/20"></div>
              <div class="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-lime-400"></div>

              <!-- Content inside box -->
              <div class="space-y-6 sm:space-y-8">
                 <div class="flex justify-between items-end border-b border-white/10 pb-4">
                    <span class="font-mono text-zinc-500 text-[10px] sm:text-xs">NETWORK_HASHRATE</span>
                    <span class="font-mono text-lg sm:text-xl text-white">450.2 PH/s</span>
                 </div>
                 <div class="flex justify-between items-end border-b border-white/10 pb-4">
                    <span class="font-mono text-zinc-500 text-[10px] sm:text-xs">TOTAL_MINTED</span>
                    <span class="font-mono text-lg sm:text-xl text-lime-400">12,408</span>
                 </div>
                 <div class="flex justify-between items-end border-b border-white/10 pb-4">
                    <span class="font-mono text-zinc-500 text-[10px] sm:text-xs">LATEST_BLOCK</span>
                    <span class="font-mono text-lg sm:text-xl text-white">#11,402,931</span>
                 </div>
              </div>

              <div class="mt-8 pt-4 border-t border-dashed border-white/20">
                 <div class="h-24 sm:h-32 bg-zinc-900 border border-white/5 relative overflow-hidden flex items-center justify-center group cursor-pointer hover:border-lime-500/50 transition-colors">
                    <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div class="text-center px-4">
                       <p class="font-mono text-[10px] text-zinc-500 uppercase mb-2">Featured Event</p>
                       <p class="font-display text-lg sm:text-xl font-bold text-white group-hover:text-lime-400 transition-colors truncate max-w-[200px]">CKB Summit SG</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

      </div>

      <!-- Marquee / Ticker -->
      <div class="mt-16 sm:mt-24 border-y border-white/5 bg-black/50 py-3 sm:py-4 overflow-hidden flex">
         <div class="animate-marquee whitespace-nowrap flex gap-8 sm:gap-12 font-mono text-xs sm:text-sm text-zinc-500">
            <span>SECURE_LAYER_1</span>
            <span>+++</span>
            <span>PROOF_OF_WORK</span>
            <span>+++</span>
            <span>CELL_MODEL</span>
            <span>+++</span>
            <span>RISC-V_VM</span>
            <span>+++</span>
            <span>STORE_OF_VALUE</span>
            <span>+++</span>
            <span>GLOBAL_CONSENSUS</span>
            <span>+++</span>
            <span>SECURE_LAYER_1</span>
            <span>+++</span>
            <span>PROOF_OF_WORK</span>
            <span>+++</span>
            <span>CELL_MODEL</span>
         </div>
      </div>

    </div>
  `,
  styles: [`
    .clip-path-slant {
      clip-path: polygon(0 0, 100% 0, 100% 85%, 95% 100%, 0 100%);
    }
    .animate-marquee {
      animation: marquee 20s linear infinite;
    }
    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
  `]
})
export class LandingComponent {
  walletService = inject(WalletService);
}