import { Injectable, inject } from '@angular/core';
import { ccc } from '@ckb-ccc/ccc';
import { WalletService } from './wallet.service';

/**
 * Contract configuration for deployed type scripts.
 * These MUST match the deployed contracts exactly.
 *
 * Args schema (defined by contracts, mirrored here):
 *   - DOB Badge:    SHA256(event_id) || SHA256(recipient_address) = 64 bytes
 *   - Event Anchor: SHA256(event_id) || SHA256(creator_address)   = 64 bytes
 */
export interface ContractConfig {
	codeHash: string;
	hashType: 'type' | 'data' | 'data1' | 'data2';
	cellDep: {
		outPoint: {
			txHash: string;
			index: number;
		};
		depType: 'code' | 'depGroup';
	};
}

/**
 * Event metadata for on-chain JSON cell data.
 */
export interface EventMetadata {
	name: string;
	description?: string;
	location?: string;
	start_time?: string; // ISO 8601
	image_url?: string;
}

/**
 * Contract deployment configs - loaded from environment at build time.
 * In production, these come from: import.meta.env.VITE_DOB_BADGE_CODE_HASH etc.
 */
const DOB_BADGE_CONFIG: ContractConfig = {
	codeHash: import.meta.env.VITE_DOB_BADGE_CODE_HASH || '0x0000000000000000000000000000000000000000000000000000000000000001',
	hashType: (import.meta.env.VITE_DOB_BADGE_HASH_TYPE as ContractConfig['hashType']) || 'type',
	cellDep: {
		outPoint: {
			txHash: import.meta.env.VITE_DOB_BADGE_DEP_TX_HASH || '0x0000000000000000000000000000000000000000000000000000000000000000',
			index: Number(import.meta.env.VITE_DOB_BADGE_DEP_INDEX) || 0,
		},
		depType: 'code',
	},
};

const EVENT_ANCHOR_CONFIG: ContractConfig = {
	codeHash: import.meta.env.VITE_EVENT_ANCHOR_CODE_HASH || '0x0000000000000000000000000000000000000000000000000000000000000002',
	hashType: (import.meta.env.VITE_EVENT_ANCHOR_HASH_TYPE as ContractConfig['hashType']) || 'type',
	cellDep: {
		outPoint: {
			txHash: import.meta.env.VITE_EVENT_ANCHOR_DEP_TX_HASH || '0x0000000000000000000000000000000000000000000000000000000000000000',
			index: Number(import.meta.env.VITE_EVENT_ANCHOR_DEP_INDEX) || 0,
		},
		depType: 'code',
	},
};

/**
 * Check if contracts are deployed (non-placeholder code hashes)
 */
const CONTRACTS_DEPLOYED = !DOB_BADGE_CONFIG.codeHash.endsWith('0001');

/**
 * Transaction rejection error with chain details
 */
export class ChainRejectionError extends Error {
	constructor(
		message: string,
		public readonly errorCode?: number,
		public readonly scriptError?: string
	) {
		super(message);
		this.name = 'ChainRejectionError';
	}

	static fromCkbError(err: unknown): ChainRejectionError {
		const message = err instanceof Error ? err.message : String(err);

		// Parse CKB script errors
		if (message.includes('ValidationFailure')) {
			const match = message.match(/error code (\d+)/);
			const code = match ? parseInt(match[1], 10) : undefined;

			// Map known error codes
			let reason = 'Transaction rejected by type script';
			if (code === 1) reason = 'Invalid script args format';
			if (code === 2) reason = 'Duplicate output detected';
			if (code === 3) reason = 'Badge/Anchor already exists on-chain';

			return new ChainRejectionError(reason, code, message);
		}

		return new ChainRejectionError(message);
	}
}

@Injectable({
	providedIn: 'root'
})
export class ContractService {
	private walletService = inject(WalletService);

	/**
	 * SHA256 hash helper using Web Crypto API.
	 * Mirrors the hashing used in contracts.
	 */
	private async sha256(data: string | Uint8Array): Promise<Uint8Array> {
		const input = typeof data === 'string'
			? new TextEncoder().encode(data)
			: new Uint8Array(data);
		const hashBuffer = await crypto.subtle.digest('SHA-256', input);
		return new Uint8Array(hashBuffer);
	}

	/**
	 * Build type script args per contract spec:
	 * SHA256(eventId) || SHA256(address) = 64 bytes
	 */
	private async buildArgs(eventId: string, address: string): Promise<string> {
		const eventIdHash = await this.sha256(eventId);
		const addressHash = await this.sha256(address);

		const args = new Uint8Array(64);
		args.set(eventIdHash, 0);
		args.set(addressHash, 32);

		return this.bytesToHex(args);
	}

	/**
	 * Build versioned binary cell data for badge cells.
	 * Format: [ version(1) | flags(1) | content_hash(32) ]
	 */
	private async buildBadgeCellData(contentJson: object): Promise<string> {
		const contentStr = JSON.stringify(contentJson);
		const contentHash = await this.sha256(contentStr);

		const data = new Uint8Array(34); // 1 + 1 + 32
		data[0] = 1; // version
		data[1] = 0x01; // FLAG_HAS_METADATA
		data.set(contentHash, 2);

		return this.bytesToHex(data);
	}

	private bytesToHex(bytes: Uint8Array): string {
		return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
	}

	private hexToBytes(hex: string): Uint8Array {
		const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
		const bytes = new Uint8Array(clean.length / 2);
		for (let i = 0; i < bytes.length; i++) {
			bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
		}
		return bytes;
	}

	private configToScript(config: ContractConfig, args: string): ccc.Script {
		return ccc.Script.from({
			codeHash: config.codeHash,
			hashType: config.hashType,
			args: args,
		});
	}

	private configToCellDep(config: ContractConfig): ccc.CellDep {
		return ccc.CellDep.from({
			outPoint: ccc.OutPoint.from({
				txHash: config.cellDep.outPoint.txHash,
				index: config.cellDep.outPoint.index,
			}),
			depType: config.cellDep.depType,
		});
	}

	/**
	 * Generate a unique event ID replicating the backend's EventIdPreimage::compute_event_id().
	 * SHA256(creator_address_bytes || timestamp_le_i64 || nonce_bytes)
	 */
	async generateEventId(creatorAddress: string): Promise<{ eventId: string; timestamp: number; nonce: string }> {
		const timestamp = Math.floor(Date.now() / 1000);
		const nonce = crypto.randomUUID();

		const encoder = new TextEncoder();
		const creatorBytes = encoder.encode(creatorAddress);
		const nonceBytes = encoder.encode(nonce);

		// timestamp as 8-byte little-endian i64
		const timestampBuffer = new ArrayBuffer(8);
		const view = new DataView(timestampBuffer);
		// Use two 32-bit writes for full i64 LE (BigInt not needed for positive timestamps)
		view.setUint32(0, timestamp & 0xFFFFFFFF, true);
		view.setUint32(4, Math.floor(timestamp / 0x100000000) & 0xFFFFFFFF, true);
		const timestampBytes = new Uint8Array(timestampBuffer);

		// Concatenate: creator_address_bytes || timestamp_le_i64 || nonce_bytes
		const combined = new Uint8Array(creatorBytes.length + 8 + nonceBytes.length);
		combined.set(creatorBytes, 0);
		combined.set(timestampBytes, creatorBytes.length);
		combined.set(nonceBytes, creatorBytes.length + 8);

		const hash = await this.sha256(combined);
		const eventId = Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');

		return { eventId, timestamp, nonce };
	}

	/**
	 * Decode hex cell data as JSON. Returns null for v1 binary format or on failure.
	 */
	decodeCellDataJson(hexData: string): Record<string, unknown> | null {
		try {
			const bytes = this.hexToBytes(hexData);
			if (bytes.length === 0) return null;

			// Old v1 binary format starts with version byte 0x01
			if (bytes[0] === 0x01) return null;

			const decoder = new TextDecoder();
			const jsonStr = decoder.decode(bytes);
			return JSON.parse(jsonStr) as Record<string, unknown>;
		} catch {
			return null;
		}
	}

	/**
	 * Build a DOB Badge minting transaction.
	 * Uniqueness is enforced by the TYPE SCRIPT, not this code.
	 */
	async buildBadgeMintTx(
		eventId: string,
		eventIssuer: string,
		recipientAddress: string,
		proofHash?: string
	): Promise<ccc.Transaction> {
		const signer = this.walletService.signer;
		if (!signer) {
			throw new Error('Wallet not connected');
		}

		const args = await this.buildArgs(eventId, recipientAddress);
		const typeScript = this.configToScript(DOB_BADGE_CONFIG, args);
		const recipientLock = (await ccc.Address.fromString(recipientAddress, this.walletService.ckbClient)).script;

		// Build cell data (hash-only, full metadata stored off-chain)
		const cellData = await this.buildBadgeCellData({
			protocol: 'ckb-pop',
			version: 1,
			event_id: eventId,
			issuer: eventIssuer,
			proof_hash: proofHash,
		});

		const tx = ccc.Transaction.from({
			outputs: [{ lock: recipientLock, type: typeScript }],
			outputsData: [cellData],
		});

		tx.cellDeps.push(this.configToCellDep(DOB_BADGE_CONFIG));
		return tx;
	}

	/**
	 * Build an Event Anchor creation transaction with JSON cell data.
	 * Immutability is enforced by the TYPE SCRIPT.
	 */
	async buildEventAnchorTx(
		eventId: string,
		creatorAddress: string,
		metadata: EventMetadata,
	): Promise<ccc.Transaction> {
		const signer = this.walletService.signer;
		if (!signer) {
			throw new Error('Wallet not connected');
		}

		const args = await this.buildArgs(eventId, creatorAddress);
		const typeScript = this.configToScript(EVENT_ANCHOR_CONFIG, args);
		const creatorLock = (await ccc.Address.fromString(creatorAddress, this.walletService.ckbClient)).script;

		// Build JSON cell data (UTF-8 encoded)
		const cellDataObj: Record<string, unknown> = {
			p: 'ckb-pop',
			v: 2,
			event_id: eventId,
			creator: creatorAddress,
			name: metadata.name,
			created_at: Math.floor(Date.now() / 1000),
		};
		if (metadata.description !== undefined) cellDataObj['description'] = metadata.description;
		if (metadata.location !== undefined) cellDataObj['location'] = metadata.location;
		if (metadata.start_time !== undefined) cellDataObj['start_time'] = metadata.start_time;
		if (metadata.image_url !== undefined) cellDataObj['image_url'] = metadata.image_url;

		const jsonStr = JSON.stringify(cellDataObj);
		const encoder = new TextEncoder();
		const jsonBytes = encoder.encode(jsonStr);
		const cellData = this.bytesToHex(jsonBytes);

		const tx = ccc.Transaction.from({
			outputs: [{ lock: creatorLock, type: typeScript }],
			outputsData: [cellData],
		});

		tx.cellDeps.push(this.configToCellDep(EVENT_ANCHOR_CONFIG));
		return tx;
	}

	/**
	 * Mint a DOB badge on-chain.
	 * Chain will reject if badge already exists (error code 3).
	 */
	async mintBadge(
		eventId: string,
		eventIssuer: string,
		recipientAddress: string,
		proofHash?: string
	): Promise<string> {
		if (!CONTRACTS_DEPLOYED) {
			// Simulation mode - contracts not yet deployed
			await new Promise(resolve => setTimeout(resolve, 1500));
			return '0x' + Array.from({ length: 64 }, () =>
				Math.floor(Math.random() * 16).toString(16)
			).join('');
		}

		try {
			const tx = await this.buildBadgeMintTx(eventId, eventIssuer, recipientAddress, proofHash);
			return await this.walletService.sendTransaction(tx);
		} catch (err) {
			throw ChainRejectionError.fromCkbError(err);
		}
	}

	/**
	 * Create an event anchor on-chain.
	 * Chain will reject if anchor already exists (error code 3).
	 */
	async createEventAnchor(
		eventId: string,
		creatorAddress: string,
		metadata: EventMetadata,
	): Promise<string> {
		if (!CONTRACTS_DEPLOYED) {
			await new Promise(resolve => setTimeout(resolve, 1500));
			return '0x' + Array.from({ length: 64 }, () =>
				Math.floor(Math.random() * 16).toString(16)
			).join('');
		}

		try {
			const tx = await this.buildEventAnchorTx(eventId, creatorAddress, metadata);
			return await this.walletService.sendTransaction(tx);
		} catch (err) {
			throw ChainRejectionError.fromCkbError(err);
		}
	}

	/**
	 * Async generator: find all event anchor cells on chain via prefix search.
	 */
	async *findAllEventCells(): AsyncGenerator<{ eventId: string; creator: string; metadata: Record<string, unknown>; txHash: string; outputIndex: number }> {
		const client = this.walletService.ckbClient;
		const eventAnchorScript = this.configToScript(EVENT_ANCHOR_CONFIG, '0x');

		const cells = client.findCells({
			script: eventAnchorScript,
			scriptType: 'type',
			scriptSearchMode: 'prefix',
		});

		for await (const cell of cells) {
			const hexData = cell.outputData;
			const decoded = this.decodeCellDataJson(hexData);
			if (!decoded) continue;

			yield {
				eventId: decoded['event_id'] as string,
				creator: decoded['creator'] as string,
				metadata: decoded,
				txHash: cell.outPoint.txHash,
				outputIndex: Number(cell.outPoint.index),
			};
		}
	}

	/**
	 * Find an event anchor cell by eventId.
	 * Uses prefix search with SHA256(eventId) as the first 32 bytes of args.
	 */
	async findEventById(eventId: string): Promise<{ eventId: string; creator: string; metadata: Record<string, unknown>; txHash: string; outputIndex: number } | null> {
		const client = this.walletService.ckbClient;
		const eventIdHash = await this.sha256(eventId);
		const argsPrefix = this.bytesToHex(eventIdHash);

		const eventAnchorScript = this.configToScript(EVENT_ANCHOR_CONFIG, argsPrefix);

		const cells = client.findCells({
			script: eventAnchorScript,
			scriptType: 'type',
			scriptSearchMode: 'prefix',
		});

		for await (const cell of cells) {
			const hexData = cell.outputData;
			const decoded = this.decodeCellDataJson(hexData);
			if (!decoded) continue;

			return {
				eventId: decoded['event_id'] as string,
				creator: decoded['creator'] as string,
				metadata: decoded,
				txHash: cell.outPoint.txHash,
				outputIndex: Number(cell.outPoint.index),
			};
		}

		return null;
	}

	/**
	 * Find an event anchor cell by the SHA256 hash of the eventId (already hashed).
	 * Used when correlating badge cells (which store the hash, not the raw ID).
	 */
	async findEventByIdHash(eventIdHash: string): Promise<{ eventId: string; creator: string; metadata: Record<string, unknown>; txHash: string; outputIndex: number } | null> {
		const client = this.walletService.ckbClient;
		const argsPrefix = eventIdHash.startsWith('0x') ? eventIdHash : '0x' + eventIdHash;
		const eventAnchorScript = this.configToScript(EVENT_ANCHOR_CONFIG, argsPrefix);

		const cells = client.findCells({
			script: eventAnchorScript,
			scriptType: 'type',
			scriptSearchMode: 'prefix',
		});

		for await (const cell of cells) {
			const hexData = cell.outputData;
			const decoded = this.decodeCellDataJson(hexData);
			if (!decoded) continue;

			return {
				eventId: decoded['event_id'] as string,
				creator: decoded['creator'] as string,
				metadata: decoded,
				txHash: cell.outPoint.txHash,
				outputIndex: Number(cell.outPoint.index),
			};
		}

		return null;
	}

	/**
	 * Find DOB Badge cells for a given eventId.
	 * Badges have args starting with SHA256(eventId).
	 */
	async findBadgesByEvent(eventId: string): Promise<{ holderAddress: string; txHash: string }[]> {
		const client = this.walletService.ckbClient;
		const eventIdHash = await this.sha256(eventId);
		const argsPrefix = this.bytesToHex(eventIdHash);

		const badgeScript = this.configToScript(DOB_BADGE_CONFIG, argsPrefix);

		const cells = client.findCells({
			script: badgeScript,
			scriptType: 'type',
			scriptSearchMode: 'prefix',
		});

		const results: { holderAddress: string; txHash: string }[] = [];
		for await (const cell of cells) {
			const holderAddress = this.lockToAddress(cell.cellOutput.lock);
			results.push({
				holderAddress,
				txHash: cell.outPoint.txHash,
			});
		}

		return results;
	}

	/**
	 * Find DOB Badge cells held by a specific address.
	 * Searches by lock script with type script filter for DOB_BADGE.
	 */
	async findBadgesByAddress(address: string): Promise<{ eventIdHash: string; txHash: string }[]> {
		const client = this.walletService.ckbClient;
		const lockScript = (await ccc.Address.fromString(address, client)).script;

		// Search by lock script, then filter by DOB_BADGE type script code_hash manually
		const cells = client.findCells({
			script: lockScript,
			scriptType: 'lock',
			scriptSearchMode: 'exact',
		});

		const results: { eventIdHash: string; txHash: string }[] = [];
		for await (const cell of cells) {
			const typeScript = cell.cellOutput.type;
			if (!typeScript) continue;

			// Filter: only DOB_BADGE cells by matching code_hash
			if (typeScript.codeHash !== DOB_BADGE_CONFIG.codeHash) continue;

			// First 32 bytes of args = SHA256(eventId)
			const argsHex = typeScript.args;
			const eventIdHash = argsHex.startsWith('0x') ? argsHex.slice(2, 66) : argsHex.slice(0, 64);

			results.push({
				eventIdHash: eventIdHash,
				txHash: cell.outPoint.txHash,
			});
		}

		return results;
	}

	/**
	 * Convert a lock script to a CKB address string.
	 */
	lockToAddress(lock: ccc.ScriptLike): string {
		return ccc.Address.fromScript(lock, this.walletService.ckbClient).toString();
	}

	/**
	 * UX HINT ONLY: Check if a badge might already exist.
	 *
	 * WARNING: This is for UI feedback only. Do NOT use for enforcement.
	 * - Indexers lag behind chain tip
	 * - Race conditions are possible
	 * - The TYPE SCRIPT is the source of truth
	 */
	async badgeExistsHint(eventId: string, recipientAddress: string): Promise<boolean> {
		if (!CONTRACTS_DEPLOYED) {
			return false;
		}

		try {
			const args = await this.buildArgs(eventId, recipientAddress);
			const typeScript = this.configToScript(DOB_BADGE_CONFIG, args);

			const client = this.walletService.ckbClient;
			const cells = client.findCells({
				script: typeScript,
				scriptType: 'type',
				scriptSearchMode: 'exact',
			});

			for await (const _ of cells) {
				return true;
			}
		} catch {
			// Indexer errors shouldn't block UX
		}
		return false;
	}

	/**
	 * UX HINT ONLY: Check if an event anchor might exist.
	 */
	async eventAnchorExistsHint(eventId: string, creatorAddress: string): Promise<boolean> {
		if (!CONTRACTS_DEPLOYED) {
			return false;
		}

		try {
			const args = await this.buildArgs(eventId, creatorAddress);
			const typeScript = this.configToScript(EVENT_ANCHOR_CONFIG, args);

			const client = this.walletService.ckbClient;
			const cells = client.findCells({
				script: typeScript,
				scriptType: 'type',
				scriptSearchMode: 'exact',
			});

			for await (const _ of cells) {
				return true;
			}
		} catch {
			// Indexer errors shouldn't block UX
		}
		return false;
	}

	/**
	 * Check if contracts are deployed and ready for real transactions.
	 */
	isDeployed(): boolean {
		return CONTRACTS_DEPLOYED;
	}
}
