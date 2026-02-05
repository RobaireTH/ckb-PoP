use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QrPayload {
    pub event_id: String,
    pub timestamp: i64,
    pub hmac: String,
}

impl QrPayload {
    pub fn parse(data: &str) -> Option<Self> {
        let parts: Vec<&str> = data.split('|').collect();
        if parts.len() != 3 {
            return None;
        }
        Some(Self {
            event_id: parts[0].to_string(),
            timestamp: parts[1].parse().ok()?,
            hmac: parts[2].to_string(),
        })
    }

    pub fn encode(&self) -> String {
        format!("{}|{}|{}", self.event_id, self.timestamp, self.hmac)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AttendanceProof {
    pub event_id: String,
    pub attendee_address: String,
    pub qr_payload: QrPayload,
    pub attendee_signature: String,
    pub created_at: i64,
}

impl AttendanceProof {
    pub fn message_to_sign(event_id: &str, qr_timestamp: i64, attendee_address: &str) -> String {
        format!("CKB-PoP|{}|{}|{}", event_id, qr_timestamp, attendee_address)
    }

    pub fn signed_message(&self) -> String {
        Self::message_to_sign(&self.event_id, self.qr_payload.timestamp, &self.attendee_address)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WindowProof {
    pub event_id: String,
    pub window_start: i64,
    pub window_end: Option<i64>,
    pub creator_signature: String,
    pub window_secret_commitment: String,
}

impl WindowProof {
    pub fn is_open(&self) -> bool {
        let now = Utc::now().timestamp();
        now >= self.window_start && self.window_end.map_or(true, |end| now < end)
    }

    pub fn message_to_sign(event_id: &str, window_start: i64, window_end: Option<i64>) -> String {
        match window_end {
            Some(end) => format!("CKB-PoP-Window|{}|{}|{}", event_id, window_start, end),
            None => format!("CKB-PoP-Window|{}|{}|open", event_id, window_start),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EventMetadata {
    pub name: String,
    pub description: String,
    pub image_url: Option<String>,
    pub location: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EventIdPreimage {
    pub creator_address: String,
    pub timestamp: i64,
    pub nonce: String,
}

impl EventIdPreimage {
    pub fn compute_event_id(&self) -> String {
        let mut hasher = Sha256::new();
        hasher.update(self.creator_address.as_bytes());
        hasher.update(self.timestamp.to_le_bytes());
        hasher.update(self.nonce.as_bytes());
        hex::encode(hasher.finalize())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PaymentIntent {
    pub event_id_preimage: EventIdPreimage,
    pub creator_address: String,
    pub creator_signature: String,
    pub event_metadata: EventMetadata,
    pub declared_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PaymentObservation {
    pub event_id: String,
    pub payment_tx_hash: String,
    pub payment_block_number: u64,
    pub observed_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ActiveEvent {
    pub event_id: String,
    pub metadata: EventMetadata,
    pub creator_address: String,
    pub payment_tx_hash: String,
    pub payment_block_number: u64,
    pub activated_at: DateTime<Utc>,
    pub window: Option<WindowProof>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BadgeObservation {
    pub event_id: String,
    pub holder_address: String,
    pub mint_tx_hash: String,
    pub mint_block_number: u64,
    pub verified_at_block: u64,
    pub observed_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QrResponse {
    pub qr_data: String,
    pub ttl_seconds: u32,
    pub expires_at: i64,
    pub window_end: Option<i64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub ckb_rpc: String,
    pub cache: String,
    pub last_block_observed: Option<u64>,
    pub note: String,
}

impl Default for HealthResponse {
    fn default() -> Self {
        Self {
            status: "operational".to_string(),
            ckb_rpc: "unknown".to_string(),
            cache: "unknown".to_string(),
            last_block_observed: None,
            note: "This backend is non-authoritative. Protocol functions without it.".to_string(),
        }
    }
}
