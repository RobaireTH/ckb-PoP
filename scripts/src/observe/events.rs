use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::cache::Cache;
use crate::rpc::CkbRpcClient;
use crate::types::{ActiveEvent, EventMetadata, PaymentIntent, PaymentObservation, WindowProof};

#[derive(Debug, Serialize, Deserialize)]
pub struct EventListResponse {
    pub events: Vec<ActiveEvent>,
    pub cached: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EventDetailResponse {
    pub event: ActiveEvent,
    pub verified_at_block: Option<u64>,
    pub cached: bool,
}

pub async fn observe_events(
    cache: &Cache,
    _rpc: &CkbRpcClient,
    _verify: bool,
) -> Result<EventListResponse, ObserveError> {
    let events = cache.list_active_events().await.map_err(ObserveError::Cache)?;
    Ok(EventListResponse {
        events,
        cached: true,
    })
}

pub async fn observe_event(
    cache: &Cache,
    rpc: &CkbRpcClient,
    event_id: &str,
    verify: bool,
) -> Result<EventDetailResponse, ObserveError> {
    let event = cache
        .get_active_event(event_id)
        .await
        .map_err(ObserveError::Cache)?
        .ok_or(ObserveError::NotFound)?;

    let verified_at_block = if verify {
        rpc.get_tip_block_number().await.ok()
    } else {
        None
    };

    Ok(EventDetailResponse {
        event,
        verified_at_block,
        cached: !verify,
    })
}

pub async fn submit_payment_intent(
    cache: &Cache,
    intent: PaymentIntent,
) -> Result<String, ObserveError> {
    let event_id = intent.event_id_preimage.compute_event_id();
    cache
        .store_payment_intent(&intent)
        .await
        .map_err(ObserveError::Cache)?;
    Ok(event_id)
}

pub async fn activate_event_from_payment(
    cache: &Cache,
    rpc: &CkbRpcClient,
    event_id: &str,
    tx_hash: &str,
) -> Result<ActiveEvent, ObserveError> {
    let intent = cache
        .get_payment_intent(event_id)
        .await
        .map_err(ObserveError::Cache)?
        .ok_or(ObserveError::NotFound)?;

    let tx_info = rpc
        .get_transaction(tx_hash)
        .await
        .map_err(|e| ObserveError::Rpc(e.to_string()))?
        .ok_or(ObserveError::PaymentNotFound)?;

    if !tx_info.confirmed {
        return Err(ObserveError::PaymentNotConfirmed);
    }

    let block_number = tx_info.block_number.ok_or(ObserveError::PaymentNotConfirmed)?;

    let observation = PaymentObservation {
        event_id: event_id.to_string(),
        payment_tx_hash: tx_hash.to_string(),
        payment_block_number: block_number,
        observed_at: Utc::now(),
    };

    cache
        .store_payment_observation(&observation)
        .await
        .map_err(ObserveError::Cache)?;

    let active_event = ActiveEvent {
        event_id: event_id.to_string(),
        metadata: intent.event_metadata,
        creator_address: intent.creator_address,
        payment_tx_hash: tx_hash.to_string(),
        payment_block_number: block_number,
        activated_at: Utc::now(),
        window: None,
    };

    cache
        .store_active_event(&active_event)
        .await
        .map_err(ObserveError::Cache)?;

    Ok(active_event)
}

pub async fn update_window(
    cache: &Cache,
    event_id: &str,
    window: WindowProof,
) -> Result<(), ObserveError> {
    cache
        .update_event_window(event_id, &window)
        .await
        .map_err(ObserveError::Cache)?;
    Ok(())
}

#[derive(Debug, thiserror::Error)]
pub enum ObserveError {
    #[error("cache error: {0}")]
    Cache(#[from] sqlx::Error),
    #[error("event not found")]
    NotFound,
    #[error("payment transaction not found")]
    PaymentNotFound,
    #[error("payment not yet confirmed")]
    PaymentNotConfirmed,
    #[error("rpc error: {0}")]
    Rpc(String),
}
