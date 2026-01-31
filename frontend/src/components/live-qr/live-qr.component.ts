import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { PoapService, PoPEvent } from '../../services/poap.service';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-live-qr',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative">
      
      <div class="relative z-10 w-full max-w-2xl border border-zinc-800 bg-zinc-950 p-1">
        
        <!-- Device Frame Header -->
        <div class="bg-zinc-900 border-b border-zinc-800 p-4 flex justify-between items-center">
           <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full bg-red-500"></div>
              <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div class="w-3 h-3 rounded-full bg-green-500"></div>
           </div>
           <div class="font-mono text-xs text-zinc-500 uppercase tracking-widest">Kiosk_Terminal_01</div>
        </div>

        <div class="p-8 sm:p-12 flex flex-col items-center">
            
            @if (event()) {
              <div class="w-full flex justify-between items-end border-b border-dashed border-zinc-800 pb-6 mb-8">
                 <div>
                   <h1 class="font-display text-4xl font-bold text-white mb-1">{{ event()?.name }}</h1>
                   <p class="font-mono text-sm text-lime-400">{{ event()?.location }}</p>
                 </div>
                 <div class="text-right hidden sm:block">
                    <div class="font-mono text-xs text-zinc-500">EVENT_ID</div>
                    <div class="font-mono text-lg text-white">{{ event()?.id }}</div>
                 </div>
              </div>

              <!-- QR Area -->
              <div class="relative bg-white p-4 max-w-[350px] mx-auto mb-8 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                 <!-- Technical corners on the QR container -->
                 <div class="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-lime-500"></div>
                 <div class="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-lime-500"></div>

                 @if (qrUrl()) {
                   <img [src]="qrUrl()" class="w-full h-full object-contain mix-blend-multiply" alt="Event QR">
                 } @else {
                   <div class="w-full aspect-square bg-zinc-100 flex items-center justify-center">
                      <span class="font-mono text-xs animate-pulse">GENERATING_KEY...</span>
                   </div>
                 }
              </div>

              <!-- Progress Bar -->
              <div class="w-full max-w-[350px] space-y-2">
                 <div class="flex justify-between font-mono text-xs text-zinc-500">
                    <span>KEY_VALIDITY</span>
                    <span>{{ secondsLeft() }}s</span>
                 </div>
                 <div class="h-1 w-full bg-zinc-800 overflow-hidden">
                    <div class="h-full bg-lime-500 transition-all duration-1000 ease-linear" [style.width.%]="progress()"></div>
                 </div>
              </div>

            } @else {
              <div class="animate-pulse text-zinc-500 font-mono">INITIALIZING_DATA_STREAM...</div>
            }

        </div>

        <!-- Footer Actions -->
        <div class="bg-zinc-900 border-t border-zinc-800 p-4 flex justify-center">
           <a routerLink="/gallery" class="text-xs font-mono text-zinc-500 hover:text-white transition-colors">
              [ ESC ] RETURN_DASHBOARD
           </a>
        </div>

      </div>
    </div>
  `
})
export class LiveQrComponent implements OnInit, OnDestroy {
  route = inject(ActivatedRoute);
  router = inject(Router);
  poapService = inject(PoapService);
  walletService = inject(WalletService);

  event = signal<PoPEvent | null>(null);
  qrUrl = signal<string | null>(null);
  progress = signal(100);
  secondsLeft = signal(15);
  
  private intervalId: any;
  private readonly REFRESH_RATE = 15; // Seconds

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/gallery']);
      return;
    }

    const ev = await this.poapService.getEventById(id);
    if (!ev) {
        if(id === 'demo') {
             this.event.set({
                id: 'demo',
                name: 'Demo Event',
                date: '2024-01-01',
                issuer: 'demo',
                location: 'Virtual'
             });
        } else {
             alert('Event not found');
             this.router.navigate(['/gallery']);
             return;
        }
    } else {
        this.event.set(ev);
    }
    this.startRotation();
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  startRotation() {
    this.updateQr();
    
    let tick = 0;
    this.intervalId = setInterval(() => {
       tick++;
       const remaining = this.REFRESH_RATE - tick;
       this.secondsLeft.set(remaining);
       this.progress.set((remaining / this.REFRESH_RATE) * 100);

       if (tick >= this.REFRESH_RATE) {
         this.updateQr();
         tick = 0;
       }
    }, 1000);
  }

  updateQr() {
    if (!this.event()) return;
    const payload = `${this.event()?.id}|${Date.now()}`;
    this.qrUrl.set(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(payload)}&bgcolor=ffffff&color=0f172a&margin=0`);
    this.secondsLeft.set(this.REFRESH_RATE);
    this.progress.set(100);
  }
}