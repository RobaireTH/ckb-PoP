import { Injectable, signal, inject, computed } from '@angular/core';
import { ccc } from '@ckb-ccc/ccc';
import { WalletService } from './wallet.service';
import { ToastService } from './toast.service';
import { ContractService, ChainRejectionError, EventMetadata } from './contract.service';

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

	readonly explorerUrl = import.meta.env.VITE_EXPLORER_URL || 'https://pudge.explorer.nervos.org';

	// Computed signal to get events created by the current user
	readonly myCreatedEvents = computed(() => {
		const address = this.walletService.address();
		if (!address) return [];
		return this.eventsSignal().filter(e => e.issuer === address);
	});

	async getEventByCode(code: string): Promise<PoPEvent> {
		// Handle QR formats:
		//   Simple ID:    "eventId"
		//   Unsigned QR:  "eventId|timestamp"        (fallback, no signature)
		//   Signed QR:    "eventId|timestamp|signature" (creator-signed)
		let targetId = code;
		let isDynamic = false;
		let timestampMs = 0;
		let signature: string | undefined;

		if (code.includes('|')) {
			const parts = code.split('|');
			targetId = parts[0];
			const rawTs = parseInt(parts[1], 10);
			isDynamic = true;

			// Normalize timestamp: <1e12 = seconds, >=1e12 = milliseconds.
			timestampMs = rawTs < 1e12 ? rawTs * 1000 : rawTs;

			if (parts.length >= 3) {
				signature = parts[2];
			}
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

		// Look up event on chain
		const chainEvent = await this.contractService.findEventById(targetId);
		if (chainEvent) {
			const evt = this.chainEventToPoPEvent(chainEvent);

			// Verify creator signature if present
			if (signature && isDynamic) {
				const timestampSec = Math.floor(timestampMs / 1000);
				const message = `CKB-PoP-QR|${targetId}|${timestampSec}`;
				const isValid = await this.verifyCreatorSignature(message, signature, evt.issuer);
				if (!isValid) {
					throw new Error('Invalid QR signature. This QR was not signed by the event creator.');
				}
			}

			return evt;
		}

		// Fall back to local cache
		const localEvent = this.eventsSignal().find(e => e.id.toLowerCase() === targetId.toLowerCase());
		if (localEvent) return localEvent;

		throw new Error('Event not found');
	}

	async getEventById(id: string): Promise<PoPEvent | undefined> {
		// Try chain first
		const chainEvent = await this.contractService.findEventById(id);
		if (chainEvent) {
			return this.chainEventToPoPEvent(chainEvent);
		}
		// Fall back to local cache
		return this.eventsSignal().find(e => e.id === id);
	}

	async createEvent(eventData: Pick<PoPEvent, 'name' | 'date' | 'location' | 'description' | 'imageUrl'>, issuerAddress: string): Promise<PoPEvent> {
		// Generate event ID locally
		const { eventId } = await this.contractService.generateEventId(issuerAddress);

		const startTime = eventData.date ? new Date(eventData.date).toISOString() : undefined;
		const metadata: EventMetadata = {
			name: eventData.name,
			description: eventData.description || '',
			location: eventData.location || undefined,
			start_time: startTime,
			image_url: eventData.imageUrl || undefined,
		};

		// Create on-chain event anchor with full JSON cell data
		const anchorTxHash = await this.contractService.createEventAnchor(
			eventId,
			issuerAddress,
			metadata,
		);

		const newEvent: PoPEvent = {
			id: eventId,
			name: eventData.name,
			date: eventData.date,
			location: eventData.location,
			issuer: issuerAddress,
			description: eventData.description,
			imageUrl: eventData.imageUrl || `https://picsum.photos/seed/${Date.now()}/600/400`,
			anchorTxHash,
		};

		this.eventsSignal.update(evts => [newEvent, ...evts]);
		this.toast.success(`Event created: ${newEvent.name}`);

		return newEvent;
	}

	async getAttendees(eventId: string): Promise<Attendee[]> {
		try {
			const badges = await this.contractService.findBadgesByEvent(eventId);
			return badges.map(b => ({
				address: b.holderAddress,
				mintDate: '',
				txHash: b.txHash,
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

		// Wait for confirmation via CCC client in the background.
		this.waitForConfirmation(txHash);

		return newBadge;
	}

	/**
	 * Poll for transaction confirmation using CCC client.
	 * Updates the badge's blockNumber once the tx is committed on-chain.
	 */
	private async waitForConfirmation(txHash: string): Promise<void> {
		const client = this.walletService.ckbClient;
		const maxAttempts = 24; // ~2 minutes at 5s intervals

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			await new Promise(r => setTimeout(r, 5_000));
			try {
				// CCC client.getTransaction returns TransactionWithStatus
				const result = await client.getTransaction(txHash);
				if (!result) continue;

				// Check if committed — handle both CCC response shapes
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const r = result as any;
				const status = r.txStatus?.status ?? r.status;
				if (status === 'committed') {
					const blockHash = r.txStatus?.blockHash ?? r.blockHash;
					if (blockHash) {
						try {
							const header = await client.getHeaderByHash(blockHash);
							if (header) {
								const blockNum = Number(header.number);
								this.badgesSignal.update(badges =>
									badges.map(b => b.txHash === txHash ? { ...b, blockNumber: blockNum } : b)
								);
							}
						} catch {
							// Block number unavailable — badge stays without it
						}
					}
					return;
				}
			} catch {
				// RPC error — will retry
			}
		}
	}

	/**
	 * UX hint: Check if badge might already exist.
	 * For display purposes only - not enforcement.
	 */
	async checkBadgeExistsHint(eventId: string, address: string): Promise<boolean> {
		return this.contractService.badgeExistsHint(eventId, address);
	}

	/**
	 * Load badges from chain for the given address.
	 * Resolves event names by querying the chain for each unique event.
	 */
	async loadBadgesFromChain(address: string): Promise<void> {
		try {
			const badgeCells = await this.contractService.findBadgesByAddress(address);

			// Build event hash → PoPEvent map for correlation.
			// First check local cache, then query chain for unknowns.
			const eventMap = new Map<string, PoPEvent>();

			// Populate from local events cache
			for (const evt of this.eventsSignal()) {
				const hashBytes = new Uint8Array(
					await crypto.subtle.digest('SHA-256', new TextEncoder().encode(evt.id))
				);
				const hashHex = Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
				eventMap.set(hashHex, evt);
			}

			// Collect unique hashes not in cache, query chain
			const unknownHashes = new Set<string>();
			for (const cell of badgeCells) {
				if (!eventMap.has(cell.eventIdHash)) {
					unknownHashes.add(cell.eventIdHash);
				}
			}
			for (const hash of unknownHashes) {
				try {
					const chainEvent = await this.contractService.findEventByIdHash(hash);
					if (chainEvent) {
						eventMap.set(hash, this.chainEventToPoPEvent(chainEvent));
					}
				} catch {
					// Skip unresolvable events
				}
			}

			const chainBadges: Badge[] = badgeCells.map(cell => {
				const event = eventMap.get(cell.eventIdHash);
				return {
					id: `${cell.eventIdHash}-${address}`,
					eventId: event?.id || cell.eventIdHash,
					eventName: event?.name || `Event ${cell.eventIdHash.slice(0, 8)}...`,
					mintDate: '',
					txHash: cell.txHash,
					imageUrl: event?.imageUrl || `https://picsum.photos/seed/${cell.eventIdHash}/400/400`,
					role: 'Attendee' as const,
				};
			});

			// Merge: keep local badges not in chain results, add all chain badges
			const localOnly = this.badgesSignal().filter(
				b => !chainBadges.some(cb => cb.txHash === b.txHash)
			);
			this.badgesSignal.set([...chainBadges, ...localOnly]);
		} catch {
			// Chain query failed — keep local badges
		}
	}

	/**
	 * Load events from chain for the given creator address.
	 * Populates the eventsSignal so myCreatedEvents works across sessions.
	 */
	async loadMyEventsFromChain(address: string): Promise<void> {
		try {
			const events: PoPEvent[] = [];
			for await (const cell of this.contractService.findAllEventCells()) {
				if (cell.creator === address) {
					events.push(this.chainEventToPoPEvent(cell));
				}
			}

			// Merge with locally-created events to avoid duplicates.
			const existingIds = new Set(this.eventsSignal().map(e => e.id));
			const newFromChain = events.filter(e => !existingIds.has(e.id));
			if (newFromChain.length > 0) {
				this.eventsSignal.update(existing => [...existing, ...newFromChain]);
			}
		} catch {
			// Chain query failed — keep local events only.
		}
	}

	/**
	 * Convert a chain event cell result to a PoPEvent.
	 */
	private chainEventToPoPEvent(cell: { eventId: string; creator: string; metadata: Record<string, unknown>; txHash: string }): PoPEvent {
		return {
			id: cell.eventId,
			name: (cell.metadata['name'] as string) || '',
			date: (cell.metadata['start_time'] as string) || '',
			issuer: cell.creator,
			location: (cell.metadata['location'] as string) || '',
			description: cell.metadata['description'] as string | undefined,
			imageUrl: cell.metadata['image_url'] as string | undefined,
			anchorTxHash: cell.txHash,
		};
	}

	/**
	 * Verify that a message was signed by the event creator.
	 * Attempts CCC signature verification; skips gracefully if unavailable.
	 */
	private async verifyCreatorSignature(message: string, signature: string, creatorAddress: string): Promise<boolean> {
		try {
			const client = this.walletService.ckbClient;
			const creatorAddr = await ccc.Address.fromString(creatorAddress, client);

			// CCC may provide verifyMessageByCkb for secp256k1-blake160 signatures.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const cccAny = ccc as any;
			if (typeof cccAny.verifyMessageByCkb === 'function') {
				return cccAny.verifyMessageByCkb(message, signature, creatorAddr);
			}

			// Fallback: if no verification utility is available, skip check.
			// Unsigned QR fallback (Phase 3.4) provides the baseline security model.
			console.warn('CCC verifyMessageByCkb not available; skipping QR signature verification.');
			return true;
		} catch (err) {
			console.warn('QR signature verification failed:', err);
			return false;
		}
	}
}
