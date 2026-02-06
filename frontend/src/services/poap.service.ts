import { Injectable, signal, inject, computed } from '@angular/core';
import { GoogleGenAI } from "@google/genai";
import { WalletService } from './wallet.service';
import { ToastService } from './toast.service';
import { ContractService, ChainRejectionError } from './contract.service';

export interface PoPEvent {
  id: string;
  name: string;
  date: string;
  issuer: string;
  location: string;
  description?: string;
  imageUrl?: string;
  anchorTxHash?: string; // On-chain event anchor transaction
}

export interface Badge {
  id: string;
  eventId: string;
  eventName: string;
  mintDate: string;
  txHash: string;
  imageUrl: string;
  aiDescription?: string;
  role: 'Attendee' | 'Organizer' | 'Certificate';
}

export interface Attendee {
  address: string;
  mintDate: string;
  txHash: string;
}

@Injectable({
  providedIn: 'root'
})
export class PoapService {
  private walletService = inject(WalletService);
  private toast = inject(ToastService);
  private contractService = inject(ContractService);

  private readonly badgesSignal = signal<Badge[]>([]);

  // Store created events in memory
  private readonly eventsSignal = signal<PoPEvent[]>([]);

  readonly myBadges = this.badgesSignal.asReadonly();
  
  // Computed signal to get events created by the current user
  readonly myCreatedEvents = computed(() => {
    const address = this.walletService.address();
    if (!address) return [];
    return this.eventsSignal().filter(e => e.issuer === address);
  });

  async getEventByCode(code: string): Promise<PoPEvent> {
    // Handle Dynamic QR Codes format: "eventId|timestamp"
    let targetId = code;
    let isDynamic = false;
    let timestamp = 0;

    if (code.includes('|')) {
      const parts = code.split('|');
      targetId = parts[0];
      timestamp = parseInt(parts[1], 10);
      isDynamic = true;
    }

    // Logic: If dynamic, check for expiration (e.g., code valid for 60 seconds)
    if (isDynamic) {
      const now = Date.now();
      // Allow 60 seconds drift/validity window
      if (now - timestamp > 60000) {
        throw new Error('QR Code Expired. Please scan the live screen again.');
      }
      if (timestamp > now + 10000) {
        throw new Error('Invalid Time Check.');
      }
    }

    const localEvent = this.eventsSignal().find(e => e.id.toLowerCase() === targetId.toLowerCase());
    if (localEvent) return localEvent;

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Legacy/Demo fallback
    if (targetId === 'demo' || targetId === 'ckb2024') {
      return {
        id: 'evt_ckb_2024',
        name: 'Nervos Ecosystem Summit 2024',
        date: new Date().toLocaleDateString(),
        issuer: 'Nervos Foundation',
        location: 'Singapore & Virtual',
        imageUrl: 'https://picsum.photos/seed/ckb2024/600/400'
      };
    }
    
    if (targetId.length > 3) {
      return {
        id: `evt_${targetId}`,
        name: `Secret Event: ${targetId.toUpperCase()}`,
        date: new Date().toLocaleDateString(),
        issuer: 'Anonymous DAO',
        location: 'Metaverse',
        imageUrl: `https://picsum.photos/seed/${targetId}/600/400`
      };
    }

    throw new Error('Invalid Event Code');
  }

  async getEventById(id: string): Promise<PoPEvent | undefined> {
    return this.eventsSignal().find(e => e.id === id);
  }

  async createEvent(eventData: Pick<PoPEvent, 'name' | 'date' | 'location' | 'description' | 'imageUrl'>, issuerAddress: string): Promise<PoPEvent> {
    // Generate event ID
    const eventId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create event anchor on-chain (optional but strengthens decentralization)
    let anchorTxHash: string | undefined;
    try {
      // Hash of event metadata for on-chain reference
      const metadataJson = JSON.stringify({
        name: eventData.name,
        date: eventData.date,
        location: eventData.location,
        description: eventData.description,
      });
      const encoder = new TextEncoder();
      const metadataBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(metadataJson));
      const metadataHash = '0x' + Array.from(new Uint8Array(metadataBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      anchorTxHash = await this.contractService.createEventAnchor(
        eventId,
        issuerAddress,
        metadataHash
      );
    } catch (e) {
      console.warn("Event anchor creation failed (non-critical):", e);
      // Continue without anchor - events can still work without on-chain anchor
    }

    const newEvent: PoPEvent = {
        id: eventId,
        name: eventData.name,
        date: eventData.date,
        location: eventData.location,
        issuer: issuerAddress,
        description: eventData.description,
        imageUrl: eventData.imageUrl || `https://picsum.photos/seed/${Date.now()}/600/400`,
        anchorTxHash
    };

    this.eventsSignal.update(evts => [newEvent, ...evts]);

    if (anchorTxHash) {
      this.toast.success(`Event anchored on-chain: ${newEvent.name}`);
    } else {
      this.toast.success(`Event created: ${newEvent.name}`);
    }

    return newEvent;
  }

  private readonly backendUrl = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:3001/api';

  async getAttendees(eventId: string): Promise<Attendee[]> {
    try {
      const res = await fetch(`${this.backendUrl}/events/${eventId}/badge-holders`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.badges || []).map((b: { holder_address: string; observed_at: string; mint_tx_hash: string }) => ({
        address: b.holder_address,
        mintDate: b.observed_at,
        txHash: b.mint_tx_hash,
      }));
    } catch {
      return [];
    }
  }

  async mintBadge(event: PoPEvent, address: string): Promise<Badge> {
    // Generate AI description first (non-blocking)
    let aiDesc = "Verified proof of attendance.";
    try {
      const ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] });
      const model = 'gemini-2.5-flash';
      const response = await ai.models.generateContent({
        model,
        contents: `Generate a short, cryptic, and cool 1-sentence description for a digital collectible badge awarded for attending "${event.name}". It should sound like a rare RPG item description.`,
      });
      if (response.text) {
        aiDesc = response.text.trim();
      }
    } catch (e) {
      console.warn("AI generation failed, using default", e);
    }

    // Mint badge on-chain via ContractService
    // The TYPE SCRIPT enforces uniqueness - if badge exists, chain rejects
    let txHash: string;
    try {
      txHash = await this.contractService.mintBadge(
        event.id,
        event.issuer,
        address
      );
    } catch (err) {
      // Surface chain rejection to user
      if (err instanceof ChainRejectionError) {
        this.toast.error(err.message);
        throw err;
      }
      throw err;
    }

    const newBadge: Badge = {
      id: crypto.randomUUID(),
      eventId: event.id,
      eventName: event.name,
      mintDate: new Date().toISOString(),
      txHash,
      imageUrl: event.imageUrl || `https://picsum.photos/seed/${event.id}/400/400`,
      aiDescription: aiDesc,
      role: 'Attendee'
    };

    this.badgesSignal.update(badges => [newBadge, ...badges]);
    this.toast.success(`Badge minted for ${event.name}`);
    return newBadge;
  }

  /**
   * UX hint: Check if badge might already exist.
   * For display purposes only - not enforcement.
   */
  async checkBadgeExistsHint(eventId: string, address: string): Promise<boolean> {
    return this.contractService.badgeExistsHint(eventId, address);
  }
}