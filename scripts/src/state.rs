use std::sync::Arc;

use crate::cache::Cache;
use crate::rpc::CkbRpcClient;

#[derive(Clone)]
pub struct AppState {
    pub cache: Arc<Cache>,
    pub rpc: Arc<CkbRpcClient>,
    /// DOB badge type script code_hash, if configured.
    pub dob_code_hash: Option<String>,
    /// CKB address human-readable prefix ("ckt" for testnet, "ckb" for mainnet).
    pub address_hrp: String,
}

impl AppState {
    pub async fn new(
        database_url: &str,
        ckb_rpc_url: &str,
        dob_code_hash: Option<String>,
        address_hrp: String,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let cache = Cache::new(database_url).await?;
        let rpc = CkbRpcClient::new(ckb_rpc_url);

        Ok(Self {
            cache: Arc::new(cache),
            rpc: Arc::new(rpc),
            dob_code_hash,
            address_hrp,
        })
    }
}
