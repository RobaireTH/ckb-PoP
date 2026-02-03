import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { PoapService, PoPEvent } from '../../services/poap.service';

@Component({
  selector: 'app-live-qr',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-black flex items-center justify-center p-4">
      <div class="w-full max-w-lg border border-white/[0.04]">

        <!-- Terminal Header -->
        <div class="bg-zinc-900 border-b border-white/[0.04] px-4 py-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 bg-red-500"></div>
            <div class="w-2 h-2 bg-yellow-500"></div>
            <div class="w-2 h-2 bg-green-500"></div>
          </div>
          <div class="font-mono text-[8px] text-zinc-600 uppercase tracking-wider">Kiosk Terminal</div>
        </div>

        @if (event()) {
          <!-- Event Info -->
          <div class="p-4 border-b border-white/[0.04]">
            <div class="flex items-start justify-between">
              <div>
                <div class="font-display text-lg text-white mb-0.5">{{ event()?.name }}</div>
                <div class="font-mono text-[10px] text-lime-400 uppercase tracking-wider">{{ event()?.location }}</div>
              </div>
              <div class="text-right">
                <div class="font-mono text-[8px] text-zinc-600 uppercase tracking-wider">ID</div>
                <div class="font-mono text-xs text-zinc-400">{{ event()?.id }}</div>
              </div>
            </div>
          </div>

          <!-- QR Code -->
          <div class="p-6 flex justify-center">
            <div class="relative">
              <!-- Corner Brackets -->
              <div class="absolute -top-2 -left-2 w-4 h-4 border-l border-t border-lime-400"></div>
              <div class="absolute -top-2 -right-2 w-4 h-4 border-r border-t border-lime-400"></div>
              <div class="absolute -bottom-2 -left-2 w-4 h-4 border-l border-b border-lime-400"></div>
              <div class="absolute -bottom-2 -right-2 w-4 h-4 border-r border-b border-lime-400"></div>

              @if (qrUrl()) {
                <img [src]="qrUrl()" class="w-56 h-56 bg-white p-2" alt="QR">
              } @else {
                <div class="w-56 h-56 bg-zinc-900 flex items-center justify-center">
                  <div class="font-mono text-[9px] text-zinc-600 uppercase tracking-wider animate-pulse">Generating...</div>
                </div>
              }
            </div>
          </div>

          <!-- Timer -->
          <div class="px-6 pb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="font-mono text-[9px] text-zinc-600 uppercase tracking-wider">Key Validity</span>
              <span class="font-mono text-xs text-white">{{ secondsLeft() }}s</span>
            </div>
            <div class="h-1 bg-zinc-900 overflow-hidden">
              <div class="h-full bg-lime-400 transition-all duration-1000" [style.width.%]="progress()"></div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-4 py-3 border-t border-white/[0.04] bg-zinc-950">
            <a routerLink="/gallery" class="block text-center font-mono text-[9px] text-zinc-600 hover:text-white uppercase tracking-wider transition-colors">
              [ESC] Return
            </a>
          </div>
        } @else {
          <div class="p-8 text-center">
            <div class="font-mono text-[10px] text-zinc-600 uppercase tracking-wider animate-pulse">Initializing...</div>
          </div>
        }

      </div>
    </div>
  `
})
export class LiveQrComponent implements OnInit, OnDestroy {
  route = inject(ActivatedRoute);
  router = inject(Router);
  poapService = inject(PoapService);

  event = signal<PoPEvent | null>(null);
  qrUrl = signal<string | null>(null);
  progress = signal(100);
  secondsLeft = signal(15);

  private intervalId: any;
  private readonly REFRESH_RATE = 15;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/gallery']);
      return;
    }

    const ev = await this.poapService.getEventById(id);
    if (!ev) {
      if (id === 'demo') {
        this.event.set({
          id: 'demo',
          name: 'Demo Event',
          date: '2024-01-01',
          issuer: 'demo',
          location: 'Virtual'
        });
      } else {
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
    this.qrUrl.set(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payload)}&bgcolor=ffffff&color=0f172a&margin=0`);
    this.secondsLeft.set(this.REFRESH_RATE);
    this.progress.set(100);
  }
}
