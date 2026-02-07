import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import QrScanner from 'qr-scanner';

type CameraState = 'initializing' | 'scanning' | 'denied' | 'not-found' | 'error';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full aspect-square bg-black overflow-hidden">

      <!-- Camera feed -->
      <video #videoEl class="absolute inset-0 w-full h-full object-cover"></video>

      @if (state() === 'scanning') {
        <!-- Viewfinder overlay -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="relative w-40 h-40">
            <div class="absolute top-0 left-0 w-4 h-4 border-l border-t border-lime-400"></div>
            <div class="absolute top-0 right-0 w-4 h-4 border-r border-t border-lime-400"></div>
            <div class="absolute bottom-0 left-0 w-4 h-4 border-l border-b border-lime-400"></div>
            <div class="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-lime-400"></div>
            <div class="absolute inset-x-0 h-px bg-lime-400/80 scan-line"></div>
          </div>
        </div>

        <!-- Live indicator -->
        <div class="absolute top-3 left-3 flex items-center gap-1.5 bg-black/80 px-2 py-1 border border-white/[0.04]">
          <span class="w-1.5 h-1.5 bg-red-500 animate-pulse rounded-full"></span>
          <span class="font-mono text-[8px] text-zinc-500 uppercase tracking-wider">Live</span>
        </div>

        <!-- Torch toggle (shown only if supported) -->
        @if (hasTorch()) {
          <button
            (click)="toggleTorch()"
            class="absolute top-3 right-3 p-1.5 bg-black/80 border border-white/[0.04] hover:border-zinc-700"
          >
            <svg class="w-4 h-4" [class.text-yellow-400]="torchOn()" [class.text-zinc-500]="!torchOn()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
        }
      }

      @if (state() === 'initializing') {
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <div class="w-6 h-6 border-2 border-lime-400 border-t-transparent animate-spin mb-3"></div>
          <div class="font-mono text-[9px] text-zinc-500 uppercase tracking-wider">Starting camera</div>
        </div>
      }

      @if (state() === 'denied') {
        <div class="absolute inset-0 flex flex-col items-center justify-center p-6">
          <svg class="w-8 h-8 text-red-500/60 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <div class="font-mono text-[10px] text-red-400 uppercase tracking-wider mb-1">Camera access denied</div>
          <div class="font-mono text-[8px] text-zinc-600 text-center leading-relaxed">
            Allow camera access in your browser settings, then reload the page
          </div>
        </div>
      }

      @if (state() === 'not-found') {
        <div class="absolute inset-0 flex flex-col items-center justify-center p-6">
          <svg class="w-8 h-8 text-zinc-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <div class="font-mono text-[10px] text-zinc-400 uppercase tracking-wider mb-1">No camera found</div>
          <div class="font-mono text-[8px] text-zinc-600 text-center">Use manual entry below</div>
        </div>
      }

      @if (state() === 'error') {
        <div class="absolute inset-0 flex flex-col items-center justify-center p-6">
          <svg class="w-8 h-8 text-zinc-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div class="font-mono text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Camera error</div>
          <div class="font-mono text-[8px] text-zinc-600 text-center">{{ errorMessage() }}</div>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes scan {
      0%, 100% { top: 0; }
      50% { top: calc(100% - 1px); }
    }
    .scan-line {
      animation: scan 2s ease-in-out infinite;
    }
  `]
})
export class QrScannerComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;

  @Output() scanned = new EventEmitter<string>();
  @Output() scanError = new EventEmitter<string>();

  state = signal<CameraState>('initializing');
  hasTorch = signal(false);
  torchOn = signal(false);
  errorMessage = signal('');

  private qrScanner: QrScanner | null = null;

  ngOnInit() {
    this.startScanner();
  }

  ngOnDestroy() {
    this.stopScanner();
  }

  private async startScanner() {
    const hasCamera = await QrScanner.hasCamera();
    if (!hasCamera) {
      this.state.set('not-found');
      this.scanError.emit('No camera found');
      return;
    }

    this.qrScanner = new QrScanner(
      this.videoRef.nativeElement,
      (result) => {
        if (result.data) {
          this.scanned.emit(result.data);
        }
      },
      {
        preferredCamera: 'environment',
        highlightScanRegion: false,
        highlightCodeOutline: false,
        returnDetailedScanResult: true,
        maxScansPerSecond: 8,
      }
    );

    try {
      await this.qrScanner.start();
      this.state.set('scanning');
      this.checkTorchSupport();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('NotAllowedError') || message.toLowerCase().includes('permission')) {
        this.state.set('denied');
        this.scanError.emit('Camera access denied');
      } else if (message.includes('NotFoundError')) {
        this.state.set('not-found');
        this.scanError.emit('No camera found');
      } else {
        this.state.set('error');
        this.errorMessage.set(message);
        this.scanError.emit(message);
      }
    }
  }

  private async checkTorchSupport() {
    if (!this.qrScanner) return;
    try {
      this.hasTorch.set(await this.qrScanner.hasFlash());
    } catch {
      this.hasTorch.set(false);
    }
  }

  async toggleTorch() {
    if (!this.qrScanner) return;
    try {
      if (this.torchOn()) {
        await this.qrScanner.turnFlashOff();
        this.torchOn.set(false);
      } else {
        await this.qrScanner.turnFlashOn();
        this.torchOn.set(true);
      }
    } catch {
      // Torch toggle failed silently
    }
  }

  private stopScanner() {
    if (this.qrScanner) {
      this.qrScanner.stop();
      this.qrScanner.destroy();
      this.qrScanner = null;
    }
  }
}
