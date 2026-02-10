import { Injectable, signal, inject, computed } from '@angular/core';
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
  role: 'Attendee' | 'Organizer' | 'Certificate';
  blockNumber?: number;
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
    // Handle QR formats:
    //   Simple ID:    "eventId"
    //   Unsigned QR:  "eventId|timestamp"        (fallback, no HMAC)
    //   Signed QR:    "eventId|timestamp|hmac"   (backend-signed)
    let targetId = code;
    let isDynamic = false;
    let timestampMs = 0;

    if (code.includes('|')) {
      const parts = code.split('|');
      targetId = parts[0];
      const rawTs = parseInt(parts[1], 10);
      isDynamic = true;

      // Normalize timestamp: backend sends seconds, fallback sends seconds too.
      // Detect by digit count: <1e12 = seconds, >=1e12 = milliseconds.
      timestampMs = rawTs < 1e12 ? rawTs * 1000 : rawTs;
    }

    // Dynamic QR expiry check (60 second validity window)
    if (isDynamic) {
      const now = Date.now();
      if (now - timestampMs > 60000) {
        throw new Error('QR Code Expired. Please scan the live screen again.');
      }
      if (timestampMs > now + 10000) {
        throw new Error('Invalid Time Check.');
      }
    }

    // Query backend (source of truth) for the event
    try {
      const res = await fetch(`${this.backendUrl}/events/${targetId}`);
      if (res.ok) {
        const data = await res.json();
        const evt = data.event;
        return {
          id: evt.event_id,
          name: evt.metadata.name,
          date: evt.metadata.start_time || evt.activated_at,
          issuer: evt.creator_address,
          location: evt.metadata.location || '',
          description: evt.metadata.description,
          imageUrl: evt.metadata.image_url,
          anchorTxHash: evt.payment_tx_hash,
        };
      }
    } catch {
      // Backend unreachable — fall back to local cache
      const localEvent = this.eventsSignal().find(e => e.id.toLowerCase() === targetId.toLowerCase());
      if (localEvent) return localEvent;
    }

    throw new Error('Event not found');
  }

  async getEventById(id: string): Promise<PoPEvent | undefined> {
    try {
      const res = await fetch(`${this.backendUrl}/events/${id}`);
      if (res.ok) {
        const data = await res.json();
        const evt = data.event;
        return {
          id: evt.event_id,
          name: evt.metadata.name,
          date: evt.metadata.start_time || evt.activated_at,
          issuer: evt.creator_address,
          location: evt.metadata.location || '',
          description: evt.metadata.description,
          imageUrl: evt.metadata.image_url,
          anchorTxHash: evt.payment_tx_hash,
        };
      }
    } catch {
      // Backend unreachable — fall back to local cache
      return this.eventsSignal().find(e => e.id === id);
    }
    return undefined;
  }

  async createEvent(eventData: Pick<PoPEvent, 'name' | 'date' | 'location' | 'description' | 'imageUrl'>, issuerAddress: string): Promise<PoPEvent> {
    const nonce = crypto.randomUUID();

    // Sign creation intent with wallet
    const message = `CKB-PoP-CreateEvent|${nonce}`;
    const signature = await this.walletService.signMessage(message);

    // Submit to backend — gets cryptographic event ID
    // Backend expects Option<DateTime<Utc>> — convert date string to ISO 8601
    const startTime = eventData.date ? new Date(eventData.date).toISOString() : null;

    const res = await fetch(`${this.backendUrl}/events/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creator_address: issuerAddress,
        creator_signature: signature,
        nonce,
        metadata: {
          name: eventData.name,
          description: eventData.description || '',
          image_url: eventData.imageUrl || null,
          location: eventData.location || null,
          start_time: startTime,
          end_time: null,
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create event' }));
      throw new Error(err.error || 'Failed to create event');
    }

    const activeEvent = await res.json();
    const eventId = activeEvent.event_id;

    // Optional: create on-chain anchor using the backend-derived ID
    let anchorTxHash: string | undefined;
    try {
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
    this.toast.success(`Event created: ${newEvent.name}`);

    return newEvent;
  }

  private readonly backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
  readonly explorerUrl = import.meta.env.VITE_EXPLORER_URL || 'https://pudge.explorer.nervos.org';

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

    // Notify backend of the real on-chain mint (fire-and-forget).
    fetch(`${this.backendUrl}/badges/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, holder_address: address, tx_hash: txHash }),
    }).catch(() => { /* Backend notification is non-critical. */ });

    const newBadge: Badge = {
      id: crypto.randomUUID(),
      eventId: event.id,
      eventName: event.name,
      mintDate: new Date().toISOString(),
      txHash,
      imageUrl: event.imageUrl || `https://picsum.photos/seed/${event.id}/400/400`,
      role: 'Attendee'
    };

    this.badgesSignal.update(badges => [newBadge, ...badges]);
    this.toast.success(`Badge minted for ${event.name}`);

    // Start polling for block confirmation in the background.
    this.pollForConfirmation(txHash);

    return newBadge;
  }

  /**
   * Poll the backend for transaction confirmation.
   * Updates the badge's blockNumber once the tx is committed on-chain.
   */
  private async pollForConfirmation(txHash: string): Promise<void> {
    const poll = async () => {
      try {
        const res = await fetch(`${this.backendUrl}/tx/${txHash}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.confirmed && data.block_number) {
          this.badgesSignal.update(badges =>
            badges.map(b => b.txHash === txHash ? { ...b, blockNumber: data.block_number } : b)
          );
          return; // Confirmed — stop polling.
        }
      } catch {
        // Backend unreachable — will retry.
      }
      setTimeout(poll, 10_000);
    };
    setTimeout(poll, 5_000); // First check after 5 seconds.
  }

  /**
   * UX hint: Check if badge might already exist.
   * For display purposes only - not enforcement.
   */
  async checkBadgeExistsHint(eventId: string, address: string): Promise<boolean> {
    return this.contractService.badgeExistsHint(eventId, address);
  }

  /**
   * Load badges from the backend for the given address.
   * Merges backend observations with locally-minted badges.
   * Eagerly resolves block numbers for any pending badges via /api/tx/:hash.
   */
  async loadBadgesFromBackend(address: string): Promise<void> {
    try {
      const res = await fetch(`${this.backendUrl}/badges/observe?address=${encodeURIComponent(address)}`);
      if (!res.ok) return;
      const data = await res.json();
      const observations: Array<{
        event_id: string;
        holder_address: string;
        mint_tx_hash: string;
        mint_block_number: number;
        verified_at_block: number;
        observed_at: string;
      }> = data.badges || [];

      // Fetch event details for names and images
      const backendBadges: Badge[] = [];
      for (const obs of observations) {
        const event = await this.getEventById(obs.event_id);

        // If block number is 0 (pending), try resolving it now.
        let blockNumber = obs.mint_block_number > 0 ? obs.mint_block_number : undefined;
        if (!blockNumber) {
          blockNumber = await this.resolveBlockNumber(obs.mint_tx_hash);
        }

        backendBadges.push({
          id: `${obs.event_id}-${obs.holder_address}`,
          eventId: obs.event_id,
          eventName: event?.name || obs.event_id,
          mintDate: obs.observed_at,
          txHash: obs.mint_tx_hash,
          imageUrl: event?.imageUrl || `https://picsum.photos/seed/${obs.event_id}/400/400`,
          role: 'Attendee',
          blockNumber,
        });
      }

      // Merge: keep local badges that aren't in backend, add all backend badges
      const localOnly = this.badgesSignal().filter(
        b => !backendBadges.some(bb => bb.txHash === b.txHash)
      );
      this.badgesSignal.set([...backendBadges, ...localOnly]);

      // Start polling for any still-unconfirmed badges.
      for (const badge of backendBadges) {
        if (!badge.blockNumber) {
          this.pollForConfirmation(badge.txHash);
        }
      }
    } catch {
      // Backend unreachable — keep local badges only
    }
  }

  /**
   * Try to resolve a block number for a tx hash via the backend tx status endpoint.
   * Returns undefined if the tx is not yet confirmed or unreachable.
   */
  private async resolveBlockNumber(txHash: string): Promise<number | undefined> {
    try {
      const res = await fetch(`${this.backendUrl}/tx/${txHash}`);
      if (!res.ok) return undefined;
      const data = await res.json();
      if (data.confirmed && data.block_number) {
        return data.block_number;
      }
    } catch {
      // Unreachable — leave as pending.
    }
    return undefined;
  }

  /**
   * Load events created by the given address from the backend.
   * Populates the eventsSignal so myCreatedEvents works across sessions.
   */
  async loadMyEventsFromBackend(address: string): Promise<void> {
    try {
      const res = await fetch(`${this.backendUrl}/events`);
      if (!res.ok) return;
      const data = await res.json();
      const events: PoPEvent[] = (data.events || [])
        .filter((e: { creator_address: string }) => e.creator_address === address)
        .map((e: {
          event_id: string;
          metadata: { name: string; start_time?: string; description?: string; image_url?: string; location?: string };
          activated_at: string;
          creator_address: string;
          payment_tx_hash?: string;
        }) => ({
          id: e.event_id,
          name: e.metadata.name,
          date: e.metadata.start_time || e.activated_at,
          issuer: e.creator_address,
          location: e.metadata.location || '',
          description: e.metadata.description,
          imageUrl: e.metadata.image_url,
          anchorTxHash: e.payment_tx_hash,
        }));

      // Merge with locally-created events to avoid duplicates.
      const existingIds = new Set(this.eventsSignal().map(e => e.id));
      const newFromBackend = events.filter(e => !existingIds.has(e.id));
      if (newFromBackend.length > 0) {
        this.eventsSignal.update(existing => [...existing, ...newFromBackend]);
      }
    } catch {
      // Backend unreachable — keep local events only.
    }
  }
}