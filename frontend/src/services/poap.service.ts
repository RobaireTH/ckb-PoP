import { Injectable, signal, inject, computed } from '@angular/core';
import { GoogleGenAI } from "@google/genai";
import { WalletService } from './wallet.service';
import { ToastService } from './toast.service';
import { ContractService } from './contract.service';

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

  private readonly badgesSignal = signal<Badge[]>([
    {
      id: '1',
      eventId: 'evt_001',
      eventName: 'CKB Community Meetup',
      mintDate: new Date('2023-10-15').toISOString(),
      txHash: '0x74d...3f2a',
      imageUrl: 'https://picsum.photos/seed/ckb1/400/400',
      aiDescription: 'A token of early adoption in the nervous network ecosystem.',
      role: 'Attendee'
    }
  ]);

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

  async getAttendees(eventId: string): Promise<Attendee[]> {
    // Simulate fetching attendees
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Generate 3-8 random attendees
    const count = Math.floor(Math.random() * 5) + 3;
    return Array.from({length: count}, (_, i) => ({
      address: 'ckb1' + Math.random().toString(36).substring(2, 15) + '...',
      mintDate: new Date(Date.now() - Math.random() * 10000000).toISOString(),
      txHash: '0x' + Math.random().toString(16).substring(2, 10) + '...'
    }));
  }

  async mintBadge(event: PoPEvent, address: string): Promise<Badge> {
    // Check if badge already exists
    const exists = await this.contractService.badgeExists(event.id, address);
    if (exists) {
      throw new Error('Badge already minted for this event');
    }

    // Generate AI description
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
    const txHash = await this.contractService.mintBadge(
      event.id,
      event.issuer,
      address
    );

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
}