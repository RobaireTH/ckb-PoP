use chrono::{DateTime, Duration, Utc};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

const CHALLENGE_TTL_SECONDS: i64 = 60;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Challenge {
    pub id: String,
    pub event_id: String,
    pub nonce: String,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

impl Challenge {
    pub fn new(event_id: String) -> Self {
        let nonce = generate_nonce();
        let now = Utc::now();
        let expires_at = now + Duration::seconds(CHALLENGE_TTL_SECONDS);

        let id = generate_challenge_id(&event_id, &nonce, now);

        Self {
            id,
            event_id,
            nonce,
            created_at: now,
            expires_at,
        }
    }

    pub fn is_expired(&self) -> bool {
        Utc::now() > self.expires_at
    }

    pub fn message_to_sign(&self) -> String {
        format!(
            "CKB-PoP Attendance\nEvent: {}\nChallenge: {}\nExpires: {}",
            self.event_id, self.id, self.expires_at.timestamp()
        )
    }
}

fn generate_nonce() -> String {
    let mut rng = rand::thread_rng();
    let bytes: [u8; 16] = rng.gen();
    hex::encode(bytes)
}

fn generate_challenge_id(event_id: &str, nonce: &str, timestamp: DateTime<Utc>) -> String {
    let mut hasher = Sha256::new();
    hasher.update(event_id.as_bytes());
    hasher.update(nonce.as_bytes());
    hasher.update(timestamp.timestamp().to_le_bytes());
    hex::encode(hasher.finalize())[..16].to_string()
}
