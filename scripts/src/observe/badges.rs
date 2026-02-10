use chrono::Utc;
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

/// Check pending badges (mint_block_number = 0) and resolve their block numbers
/// from the CKB chain. Called periodically by a background task.
pub async fn confirm_pending_badges(cache: &Cache, rpc: &CkbRpcClient) {
    let pending = match cache.get_pending_badges().await {
        Ok(badges) => badges,
        Err(e) => {
            tracing::warn!("Failed to fetch pending badges: {e}");
            return;
        }
    };

    if pending.is_empty() {
        return;
    }

    tracing::debug!("Confirming {} pending badge(s)", pending.len());

    for badge in pending {
        match rpc.get_transaction(&badge.mint_tx_hash).await {
            Ok(Some(info)) if info.confirmed => {
                if let Some(block_number) = info.block_number {
                    if let Err(e) = cache.update_badge_block_number(&badge.mint_tx_hash, block_number).await {
                        tracing::warn!("Failed to update badge block number for {}: {e}", badge.mint_tx_hash);
                    } else {
                        tracing::info!("Confirmed badge {} at block {block_number}", badge.mint_tx_hash);
                    }
                }
            }
            Ok(_) => {
                // Not yet confirmed or not found — will retry next cycle.
            }
            Err(e) => {
                tracing::debug!("RPC error checking tx {}: {e}", badge.mint_tx_hash);
            }
        }
    }
}

/// Rehydrate badge data from the CKB chain on startup.
///
/// Queries the CKB indexer for cells matching the DOB badge type script
/// (identified by `code_hash`). For each cell found, extracts the event_id
/// and holder_address from the type script args, resolves the creating
/// transaction's block number, and upserts into SQLite.
///
/// This ensures badge data survives database wipes since the chain is the
/// source of truth.
pub async fn rehydrate_from_chain(cache: &Cache, rpc: &CkbRpcClient, code_hash: &str) {
    tracing::info!("Starting chain rehydration with code_hash={code_hash}");

    // Search for all cells with the badge type script.
    let search_key = serde_json::json!({
        "script": {
            "code_hash": code_hash,
            "hash_type": "type",
            "args": "0x"
        },
        "script_type": "type",
        "script_search_mode": "prefix"
    });

    let mut after_cursor: Option<String> = None;
    let mut total_rehydrated: u64 = 0;

    loop {
        let cells = match rpc.search_cells(&search_key, after_cursor.as_deref(), 100).await {
            Ok(result) => result,
            Err(e) => {
                tracing::warn!("Rehydration indexer query failed: {e}");
                break;
            }
        };

        let objects = match cells.get("objects").and_then(|o| o.as_array()) {
            Some(arr) => arr,
            None => break,
        };

        if objects.is_empty() {
            break;
        }

        for cell in objects {
            // Extract type script args: first 32 bytes = event_id hash, rest = holder lock hash
            let args = match cell
                .get("output")
                .and_then(|o| o.get("type"))
                .and_then(|t| t.get("args"))
                .and_then(|a| a.as_str())
            {
                Some(a) => a.to_string(),
                None => continue,
            };

            // Args format: 0x + 64 hex chars (event_id) + 40 hex chars (lock_args/address)
            // Minimum: 0x prefix + at least some hex
            let args_hex = args.trim_start_matches("0x");
            if args_hex.len() < 104 {
                tracing::debug!("Skipping cell with short args: {args}");
                continue;
            }
            let event_id = &args_hex[..64];
            let holder_lock_args = format!("0x{}", &args_hex[64..]);

            // Get the creating transaction hash from the outpoint.
            let tx_hash = match cell
                .get("out_point")
                .and_then(|op| op.get("tx_hash"))
                .and_then(|h| h.as_str())
            {
                Some(h) => h.to_string(),
                None => continue,
            };

            // Resolve block number from the transaction.
            let block_number = match rpc.get_transaction(&tx_hash).await {
                Ok(Some(info)) if info.confirmed => info.block_number.unwrap_or(0),
                _ => 0,
            };

            let badge = BadgeObservation {
                event_id: event_id.to_string(),
                holder_address: holder_lock_args,
                mint_tx_hash: tx_hash,
                mint_block_number: block_number,
                verified_at_block: block_number,
                observed_at: Utc::now(),
            };

            if let Err(e) = cache.store_badge_observation(&badge).await {
                tracing::warn!("Failed to store rehydrated badge: {e}");
            } else {
                total_rehydrated += 1;
            }
        }

        // Advance pagination cursor.
        after_cursor = cells
            .get("last_cursor")
            .and_then(|c| c.as_str())
            .map(|s| s.to_string());

        if after_cursor.is_none() {
            break;
        }
    }

    tracing::info!("Rehydration complete: {total_rehydrated} badge(s) synced from chain");
}

#[derive(Debug, thiserror::Error)]
pub enum BadgeObserveError {
    #[error("cache error: {0}")]
    Cache(#[from] sqlx::Error),
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
