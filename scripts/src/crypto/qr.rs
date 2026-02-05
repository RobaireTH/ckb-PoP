use chrono::Utc;
use hmac::{Hmac, Mac};
use sha2::Sha256;

use crate::types::QrPayload;

type HmacSha256 = Hmac<Sha256>;

const QR_TTL_SECONDS: i64 = 30;

pub fn derive_window_secret(event_id: &str, window_start: i64, creator_sig: &str) -> [u8; 32] {
    use sha2::Digest;
    let mut hasher = Sha256::new();
    hasher.update(event_id.as_bytes());
    hasher.update(window_start.to_le_bytes());
    hasher.update(creator_sig.as_bytes());
    hasher.finalize().into()
}

pub fn generate_qr_hmac(window_secret: &[u8; 32], timestamp: i64) -> String {
    let mut mac = HmacSha256::new_from_slice(window_secret).expect("HMAC accepts any key size");
    mac.update(&timestamp.to_le_bytes());
    hex::encode(mac.finalize().into_bytes())[..16].to_string()
}

pub fn verify_qr_hmac(window_secret: &[u8; 32], timestamp: i64, hmac_value: &str) -> bool {
    let expected = generate_qr_hmac(window_secret, timestamp);
    expected == hmac_value
}

pub fn generate_qr_payload(event_id: &str, window_secret: &[u8; 32]) -> QrPayload {
    let timestamp = Utc::now().timestamp();
    let hmac = generate_qr_hmac(window_secret, timestamp);
    QrPayload {
        event_id: event_id.to_string(),
        timestamp,
        hmac,
    }
}

pub fn validate_qr_freshness(qr_timestamp: i64, window_start: i64, window_end: Option<i64>) -> bool {
    let now = Utc::now().timestamp();

    if qr_timestamp < window_start {
        return false;
    }

    if let Some(end) = window_end {
        if qr_timestamp > end {
            return false;
        }
    }

    let age = now - qr_timestamp;
    age >= 0 && age <= QR_TTL_SECONDS * 2
}

pub fn qr_ttl_seconds() -> u32 {
    QR_TTL_SECONDS as u32
}
