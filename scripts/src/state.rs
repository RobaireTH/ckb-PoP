use std::sync::Arc;

use crate::cache::Cache;
use crate::rpc::CkbRpcClient;

#[derive(Clone)]
pub struct AppState {
    pub cache: Arc<Cache>,
    pub rpc: Arc<CkbRpcClient>,
}

impl AppState {
    pub async fn new(database_url: &str, ckb_rpc_url: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let cache = Cache::new(database_url).await?;
        let rpc = CkbRpcClient::new(ckb_rpc_url);

        Ok(Self {
            cache: Arc::new(cache),
            rpc: Arc::new(rpc),
        })
    }
}
