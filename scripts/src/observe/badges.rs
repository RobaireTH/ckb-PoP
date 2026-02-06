use serde::{Deserialize, Serialize};

use crate::cache::Cache;
use crate::rpc::CkbRpcClient;
use crate::types::BadgeObservation;

#[derive(Debug, Serialize, Deserialize)]
pub struct BadgeListResponse {
    pub badges: Vec<BadgeObservation>,
    pub verified_at_block: Option<u64>,
    pub cached: bool,
}

pub async fn observe_badges_by_address(
    cache: &Cache,
    rpc: &CkbRpcClient,
    address: &str,
    verify: bool,
) -> Result<BadgeListResponse, BadgeObserveError> {
    let badges = cache
        .get_badges_by_address(address)
        .await
        .map_err(BadgeObserveError::Cache)?;

    let verified_at_block = if verify {
        rpc.get_tip_block_number().await.ok()
    } else {
        None
    };

    Ok(BadgeListResponse {
        badges,
        verified_at_block,
        cached: !verify,
    })
}

pub async fn observe_badges_by_event(
    cache: &Cache,
    rpc: &CkbRpcClient,
    event_id: &str,
    verify: bool,
) -> Result<BadgeListResponse, BadgeObserveError> {
    let badges = cache
        .get_badges_by_event(event_id)
        .await
        .map_err(BadgeObserveError::Cache)?;

    let verified_at_block = if verify {
        rpc.get_tip_block_number().await.ok()
    } else {
        None
    };

    Ok(BadgeListResponse {
        badges,
        verified_at_block,
        cached: !verify,
    })
}

pub async fn store_badge_observation(
    cache: &Cache,
    badge: BadgeObservation,
) -> Result<(), BadgeObserveError> {
    cache
        .store_badge_observation(&badge)
        .await
        .map_err(BadgeObserveError::Cache)?;
    Ok(())
}

#[derive(Debug, thiserror::Error)]
pub enum BadgeObserveError {
    #[error("cache error: {0}")]
    Cache(#[from] sqlx::Error),
    #[error("badge not found")]
    NotFound,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;
    use chrono::Utc;

    async fn test_cache() -> Cache {
        Cache::new("sqlite::memory:").await.unwrap()
    }

    fn test_rpc() -> CkbRpcClient {
        CkbRpcClient::new("http://localhost:1")
    }

    #[tokio::test]
    async fn test_observe_badges_by_address_empty() {
        let cache = test_cache().await;
        let rpc = test_rpc();
        let result = observe_badges_by_address(&cache, &rpc, "addr1", false).await.unwrap();
        assert!(result.badges.is_empty());
        assert!(result.cached);
    }

    #[tokio::test]
    async fn test_store_and_observe_badges_by_event() {
        let cache = test_cache().await;
        let rpc = test_rpc();

        let badge = BadgeObservation {
            event_id: "evt1".to_string(),
            holder_address: "addr1".to_string(),
            mint_tx_hash: "0xtx".to_string(),
            mint_block_number: 100,
            verified_at_block: 101,
            observed_at: Utc::now(),
        };
        store_badge_observation(&cache, badge).await.unwrap();

        let result = observe_badges_by_event(&cache, &rpc, "evt1", false).await.unwrap();
        assert_eq!(result.badges.len(), 1);
        assert_eq!(result.badges[0].holder_address, "addr1");
    }

    #[tokio::test]
    async fn test_store_and_observe_badges_by_address() {
        let cache = test_cache().await;
        let rpc = test_rpc();

        let badge = BadgeObservation {
            event_id: "evt1".to_string(),
            holder_address: "myaddr".to_string(),
            mint_tx_hash: "0xtx1".to_string(),
            mint_block_number: 100,
            verified_at_block: 101,
            observed_at: Utc::now(),
        };
        store_badge_observation(&cache, badge).await.unwrap();

        let result = observe_badges_by_address(&cache, &rpc, "myaddr", false).await.unwrap();
        assert_eq!(result.badges.len(), 1);
    }
}
