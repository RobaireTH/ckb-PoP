/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CKB_NETWORK?: 'devnet' | 'testnet' | 'mainnet';
  readonly VITE_CKB_RPC_URL?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_DOB_BADGE_CODE_HASH?: string;
  readonly VITE_DOB_BADGE_HASH_TYPE?: string;
  readonly VITE_DOB_BADGE_DEP_TX_HASH?: string;
  readonly VITE_DOB_BADGE_DEP_INDEX?: string;
  readonly VITE_EVENT_ANCHOR_CODE_HASH?: string;
  readonly VITE_EVENT_ANCHOR_HASH_TYPE?: string;
  readonly VITE_EVENT_ANCHOR_DEP_TX_HASH?: string;
  readonly VITE_EVENT_ANCHOR_DEP_INDEX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
