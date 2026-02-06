use serde::{Deserialize, Serialize};

use crate::cache::Cache;
use crate::crypto::{qr, signatures};
use crate::rpc::CkbRpcClient;
use crate::types::AttendanceProof;

#[derive(Debug, Serialize, Deserialize)]
pub struct BuildBadgeTxRequest {
    pub event_id: String,
    pub address: String,
    pub attendance_proof: AttendanceProof,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BuildBadgeTxResponse {
    pub unsigned_tx: String,
    pub tx_hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BroadcastRequest {
    pub signed_tx: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BroadcastResponse {
    pub tx_hash: String,
    pub status: String,
}

pub async fn verify_attendance_proof(
    cache: &Cache,
    proof: &AttendanceProof,
) -> Result<(), RelayError> {
    let event = cache
        .get_active_event(&proof.event_id)
        .await
        .map_err(RelayError::Cache)?
        .ok_or(RelayError::EventNotFound)?;

    let window = event.window.as_ref().ok_or(RelayError::WindowNotOpen)?;

    if !window.is_open() {
        return Err(RelayError::WindowClosed);
    }

    let window_secret = qr::derive_window_secret(
        &proof.event_id,
        window.window_start,
        &window.creator_signature,
    );

    if !qr::verify_qr_hmac(&window_secret, proof.qr_payload.timestamp, &proof.qr_payload.hmac) {
        return Err(RelayError::InvalidQrHmac);
    }

    if !qr::validate_qr_freshness(
        proof.qr_payload.timestamp,
        window.window_start,
        window.window_end,
    ) {
        return Err(RelayError::QrExpired);
    }

    // Verify attendee's CKB signature over the attendance message
    let message = proof.signed_message();
    signatures::verify_ckb_address_signature(
        &message,
        &proof.attendee_signature,
        &proof.attendee_address,
    )
    .map_err(|_| RelayError::InvalidSignature)?;

    if cache
        .check_qr_replay(&proof.event_id, proof.qr_payload.timestamp)
        .await
        .map_err(RelayError::Cache)?
    {
        return Err(RelayError::ReplayDetected);
    }

    Ok(())
}

pub async fn build_badge_tx(
    cache: &Cache,
    _rpc: &CkbRpcClient,
    request: BuildBadgeTxRequest,
) -> Result<BuildBadgeTxResponse, RelayError> {
    verify_attendance_proof(cache, &request.attendance_proof).await?;

    cache
        .record_qr_usage(
            &request.attendance_proof.event_id,
            request.attendance_proof.qr_payload.timestamp,
        )
        .await
        .map_err(RelayError::Cache)?;

    let tx_hash = format!(
        "0x{}",
        hex::encode(sha2::Sha256::digest(
            format!("{}:{}", request.event_id, request.address).as_bytes()
        ))
    );

    Ok(BuildBadgeTxResponse {
        unsigned_tx: "placeholder_unsigned_tx".to_string(),
        tx_hash,
    })
}

pub async fn broadcast_tx(
    _rpc: &CkbRpcClient,
    request: BroadcastRequest,
) -> Result<BroadcastResponse, RelayError> {
    let tx_hash = format!(
        "0x{}",
        hex::encode(&sha2::Sha256::digest(request.signed_tx.as_bytes())[..32])
    );

    Ok(BroadcastResponse {
        tx_hash,
        status: "submitted".to_string(),
    })
}

use sha2::Digest;

#[derive(Debug, thiserror::Error)]
pub enum RelayError {
    #[error("cache error: {0}")]
    Cache(#[from] sqlx::Error),
    #[error("event not found")]
    EventNotFound,
    #[error("attendance window not open")]
    WindowNotOpen,
    #[error("attendance window closed")]
    WindowClosed,
    #[error("invalid QR HMAC")]
    InvalidQrHmac,
    #[error("QR code expired")]
    QrExpired,
    #[error("replay attack detected")]
    ReplayDetected,
    #[error("invalid signature")]
    InvalidSignature,
    #[error("rpc error: {0}")]
    Rpc(String),
}
