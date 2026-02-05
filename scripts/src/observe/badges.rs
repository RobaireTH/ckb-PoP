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
