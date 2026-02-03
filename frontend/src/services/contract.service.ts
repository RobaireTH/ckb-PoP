import { Injectable, inject } from '@angular/core';
import { ccc } from '@ckb-ccc/ccc';
import { WalletService } from './wallet.service';

/**
 * Contract configuration for deployed type scripts.
 * Note to future me: Update these after deploying contracts to testnet/mainnet.
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

// Placeholder configs - update after deployment
const DOB_BADGE_CONFIG: ContractConfig = {
  codeHash: '0x0000000000000000000000000000000000000000000000000000000000000001',
  hashType: 'type',
  cellDep: {
    outPoint: {
      txHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      index: 0,
    },
    depType: 'code',
  },
};

const EVENT_ANCHOR_CONFIG: ContractConfig = {
  codeHash: '0x0000000000000000000000000000000000000000000000000000000000000002',
  hashType: 'type',
  cellDep: {
    outPoint: {
      txHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      index: 0,
    },
    depType: 'code',
  },
};

// Minimum cell capacity in shannons (1 CKB = 10^8 shannons)
const MIN_CELL_CAPACITY = BigInt(142) * BigInt(10 ** 8); // ~142 CKB for type script cells

/**
 * Badge metadata stored in cell data
 */
export interface BadgeMetadata {
  protocol: 'ckb-pop';
  version: '1';
  event_id: string;
  issuer: string;
  issued_at_block?: number;
  attendance_proof_hash?: string;
}

/**
 * Event anchor metadata stored in cell data
 */
export interface EventAnchorMetadata {
  event_id: string;
  creator_address: string;
  metadata_hash?: string;
  created_at_block?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private walletService = inject(WalletService);

  // Flag to enable/disable real blockchain transactions
  private readonly useRealTransactions = false;

  /**
   * SHA256 hash helper using Web Crypto API
   */
  private async sha256(data: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return new Uint8Array(hashBuffer);
  }

  /**
   * Build type script args: SHA256(eventId) + SHA256(address) = 64 bytes
   */
  private async buildArgs(eventId: string, address: string): Promise<string> {
    const eventIdHash = await this.sha256(eventId);
    const addressHash = await this.sha256(address);

    // Concatenate both 32-byte hashes
    const args = new Uint8Array(64);
    args.set(eventIdHash, 0);
    args.set(addressHash, 32);

    return '0x' + Array.from(args).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Convert ContractConfig to CCC script
   */
  private configToScript(config: ContractConfig, args: string): ccc.Script {
    return ccc.Script.from({
      codeHash: config.codeHash,
      hashType: config.hashType,
      args: args,
    });
  }

  /**
   * Convert ContractConfig to CCC cell dep
   */
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
   * Build a DOB Badge minting transaction.
   * Creates an immutable badge cell with type script enforcing uniqueness.
   */
  async buildBadgeMintTx(
    eventId: string,
    eventIssuer: string,
    recipientAddress: string,
    proofHash?: string
  ): Promise<{ tx: ccc.Transaction; metadata: BadgeMetadata }> {
    const signer = this.walletService.signer;
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    // Build type script args
    const args = await this.buildArgs(eventId, recipientAddress);

    // Create badge metadata
    const metadata: BadgeMetadata = {
      protocol: 'ckb-pop',
      version: '1',
      event_id: eventId,
      issuer: eventIssuer,
      attendance_proof_hash: proofHash,
    };
    const metadataJson = JSON.stringify(metadata);
    const metadataBytes = new TextEncoder().encode(metadataJson);

    // Build the type script
    const typeScript = this.configToScript(DOB_BADGE_CONFIG, args);

    // Get recipient's lock script
    const recipientLock = (await ccc.Address.fromString(recipientAddress, this.walletService.ckbClient)).script;

    // Build transaction
    const tx = ccc.Transaction.from({
      outputs: [
        {
          lock: recipientLock,
          type: typeScript,
          capacity: MIN_CELL_CAPACITY,
        },
      ],
      outputsData: [
        '0x' + Array.from(metadataBytes).map(b => b.toString(16).padStart(2, '0')).join(''),
      ],
    });

    // Add cell dep for the type script
    tx.cellDeps.push(this.configToCellDep(DOB_BADGE_CONFIG));

    return { tx, metadata };
  }

  /**
   * Build an Event Anchor creation transaction.
   * Creates an immutable anchor cell proving event existence.
   */
  async buildEventAnchorTx(
    eventId: string,
    creatorAddress: string,
    metadataHash?: string
  ): Promise<{ tx: ccc.Transaction; metadata: EventAnchorMetadata }> {
    const signer = this.walletService.signer;
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    // Build type script args
    const args = await this.buildArgs(eventId, creatorAddress);

    // Create anchor metadata
    const metadata: EventAnchorMetadata = {
      event_id: eventId,
      creator_address: creatorAddress,
      metadata_hash: metadataHash,
    };
    const metadataJson = JSON.stringify(metadata);
    const metadataBytes = new TextEncoder().encode(metadataJson);

    // Build the type script
    const typeScript = this.configToScript(EVENT_ANCHOR_CONFIG, args);

    // Get creator's lock script
    const creatorLock = (await ccc.Address.fromString(creatorAddress, this.walletService.ckbClient)).script;

    // Build transaction
    const tx = ccc.Transaction.from({
      outputs: [
        {
          lock: creatorLock,
          type: typeScript,
          capacity: MIN_CELL_CAPACITY,
        },
      ],
      outputsData: [
        '0x' + Array.from(metadataBytes).map(b => b.toString(16).padStart(2, '0')).join(''),
      ],
    });

    // Add cell dep for the type script
    tx.cellDeps.push(this.configToCellDep(EVENT_ANCHOR_CONFIG));

    return { tx, metadata };
  }

  /**
   * Mint a DOB badge on-chain.
   * Returns the transaction hash.
   */
  async mintBadge(
    eventId: string,
    eventIssuer: string,
    recipientAddress: string,
    proofHash?: string
  ): Promise<string> {
    if (!this.useRealTransactions) {
      // Simulate transaction for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      return '0x' + Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
    }

    const { tx } = await this.buildBadgeMintTx(eventId, eventIssuer, recipientAddress, proofHash);
    return this.walletService.sendTransaction(tx);
  }

  /**
   * Create an event anchor on-chain.
   * Returns the transaction hash.
   */
  async createEventAnchor(
    eventId: string,
    creatorAddress: string,
    metadataHash?: string
  ): Promise<string> {
    if (!this.useRealTransactions) {
      // Simulate transaction for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      return '0x' + Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
    }

    const { tx } = await this.buildEventAnchorTx(eventId, creatorAddress, metadataHash);
    return this.walletService.sendTransaction(tx);
  }

  /**
   * Check if a badge already exists for the given event and recipient.
   * Queries the chain for cells with matching type script args.
   */
  async badgeExists(eventId: string, recipientAddress: string): Promise<boolean> {
    if (!this.useRealTransactions) {
      return false; // In simulation mode, always allow minting
    }

    const args = await this.buildArgs(eventId, recipientAddress);
    const typeScript = this.configToScript(DOB_BADGE_CONFIG, args);

    const client = this.walletService.ckbClient;
    const cells = client.findCells({
      script: typeScript,
      scriptType: 'type',
      scriptSearchMode: 'exact',
    });

    // Check if any cells exist
    for await (const _ of cells) {
      return true;
    }
    return false;
  }

  /**
   * Check if an event anchor already exists.
   */
  async eventAnchorExists(eventId: string, creatorAddress: string): Promise<boolean> {
    if (!this.useRealTransactions) {
      return false;
    }

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
    return false;
  }

  /**
   * Update contract configuration (for admin/deployment purposes).
   * In production, these would be loaded from environment or config.
   */
  updateDobBadgeConfig(config: Partial<ContractConfig>): void {
    Object.assign(DOB_BADGE_CONFIG, config);
  }

  updateEventAnchorConfig(config: Partial<ContractConfig>): void {
    Object.assign(EVENT_ANCHOR_CONFIG, config);
  }

  /**
   * Enable real blockchain transactions.
   * Only enable after contracts are deployed.
   */
  enableRealTransactions(): void {
    (this as any).useRealTransactions = true;
  }

  /**
   * Get current config (for debugging)
   */
  getConfig(): { dobBadge: ContractConfig; eventAnchor: ContractConfig; useRealTransactions: boolean } {
    return {
      dobBadge: { ...DOB_BADGE_CONFIG },
      eventAnchor: { ...EVENT_ANCHOR_CONFIG },
      useRealTransactions: this.useRealTransactions,
    };
  }
}
