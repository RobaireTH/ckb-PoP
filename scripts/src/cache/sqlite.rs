use chrono::{DateTime, Utc};
use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};

use crate::types::{
    ActiveEvent, BadgeObservation, EventMetadata, PaymentIntent, PaymentObservation, WindowProof,
};

pub struct Cache {
    pool: Pool<Sqlite>,
}

impl Cache {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(database_url)
            .await?;

        let cache = Self { pool };
        cache.init_schema().await?;
        Ok(cache)
    }

    async fn init_schema(&self) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS payment_intents (
                event_id TEXT PRIMARY KEY,
                creator_address TEXT NOT NULL,
                creator_signature TEXT NOT NULL,
                metadata_json TEXT NOT NULL,
                preimage_json TEXT NOT NULL,
                declared_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS payment_observations (
                event_id TEXT PRIMARY KEY,
                payment_tx_hash TEXT NOT NULL,
                payment_block_number INTEGER NOT NULL,
                observed_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS active_events (
                event_id TEXT PRIMARY KEY,
                metadata_json TEXT NOT NULL,
                creator_address TEXT NOT NULL,
                payment_tx_hash TEXT NOT NULL,
                payment_block_number INTEGER NOT NULL,
                activated_at TEXT NOT NULL,
                window_json TEXT
            );

            CREATE TABLE IF NOT EXISTS badge_observations (
                event_id TEXT NOT NULL,
                holder_address TEXT NOT NULL,
                mint_tx_hash TEXT NOT NULL,
                mint_block_number INTEGER NOT NULL,
                verified_at_block INTEGER NOT NULL,
                observed_at TEXT NOT NULL,
                PRIMARY KEY (event_id, holder_address)
            );

            CREATE TABLE IF NOT EXISTS qr_replay_log (
                event_id TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                used_at TEXT NOT NULL,
                PRIMARY KEY (event_id, timestamp)
            );

            CREATE TABLE IF NOT EXISTS challenge_cache (
                challenge_id TEXT PRIMARY KEY,
                event_id TEXT NOT NULL,
                nonce TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            );
            "#,
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn store_payment_intent(&self, intent: &PaymentIntent) -> Result<(), sqlx::Error> {
        let event_id = intent.event_id_preimage.compute_event_id();
        sqlx::query(
            r#"
            INSERT OR REPLACE INTO payment_intents
            (event_id, creator_address, creator_signature, metadata_json, preimage_json, declared_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&event_id)
        .bind(&intent.creator_address)
        .bind(&intent.creator_signature)
        .bind(serde_json::to_string(&intent.event_metadata).unwrap())
        .bind(serde_json::to_string(&intent.event_id_preimage).unwrap())
        .bind(intent.declared_at.to_rfc3339())
        .bind(intent.expires_at.to_rfc3339())
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_payment_intent(&self, event_id: &str) -> Result<Option<PaymentIntent>, sqlx::Error> {
        let row: Option<(String, String, String, String, String, String)> = sqlx::query_as(
            "SELECT creator_address, creator_signature, metadata_json, preimage_json, declared_at, expires_at FROM payment_intents WHERE event_id = ?",
        )
        .bind(event_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|(creator_address, creator_signature, metadata_json, preimage_json, declared_at, expires_at)| {
            PaymentIntent {
                event_id_preimage: serde_json::from_str(&preimage_json).unwrap(),
                creator_address,
                creator_signature,
                event_metadata: serde_json::from_str(&metadata_json).unwrap(),
                declared_at: DateTime::parse_from_rfc3339(&declared_at).unwrap().with_timezone(&Utc),
                expires_at: DateTime::parse_from_rfc3339(&expires_at).unwrap().with_timezone(&Utc),
            }
        }))
    }

    pub async fn store_payment_observation(&self, obs: &PaymentObservation) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT OR REPLACE INTO payment_observations (event_id, payment_tx_hash, payment_block_number, observed_at) VALUES (?, ?, ?, ?)",
        )
        .bind(&obs.event_id)
        .bind(&obs.payment_tx_hash)
        .bind(obs.payment_block_number as i64)
        .bind(obs.observed_at.to_rfc3339())
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_payment_observation(&self, event_id: &str) -> Result<Option<PaymentObservation>, sqlx::Error> {
        let row: Option<(String, String, i64, String)> = sqlx::query_as(
            "SELECT event_id, payment_tx_hash, payment_block_number, observed_at FROM payment_observations WHERE event_id = ?",
        )
        .bind(event_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|(event_id, payment_tx_hash, payment_block_number, observed_at)| {
            PaymentObservation {
                event_id,
                payment_tx_hash,
                payment_block_number: payment_block_number as u64,
                observed_at: DateTime::parse_from_rfc3339(&observed_at).unwrap().with_timezone(&Utc),
            }
        }))
    }

    pub async fn store_active_event(&self, event: &ActiveEvent) -> Result<(), sqlx::Error> {
        let window_json = event.window.as_ref().map(|w| serde_json::to_string(w).unwrap());
        sqlx::query(
            "INSERT OR REPLACE INTO active_events (event_id, metadata_json, creator_address, payment_tx_hash, payment_block_number, activated_at, window_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&event.event_id)
        .bind(serde_json::to_string(&event.metadata).unwrap())
        .bind(&event.creator_address)
        .bind(&event.payment_tx_hash)
        .bind(event.payment_block_number as i64)
        .bind(event.activated_at.to_rfc3339())
        .bind(window_json)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_active_event(&self, event_id: &str) -> Result<Option<ActiveEvent>, sqlx::Error> {
        let row: Option<(String, String, String, String, i64, String, Option<String>)> = sqlx::query_as(
            "SELECT event_id, metadata_json, creator_address, payment_tx_hash, payment_block_number, activated_at, window_json FROM active_events WHERE event_id = ?",
        )
        .bind(event_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|(event_id, metadata_json, creator_address, payment_tx_hash, payment_block_number, activated_at, window_json)| {
            ActiveEvent {
                event_id,
                metadata: serde_json::from_str(&metadata_json).unwrap(),
                creator_address,
                payment_tx_hash,
                payment_block_number: payment_block_number as u64,
                activated_at: DateTime::parse_from_rfc3339(&activated_at).unwrap().with_timezone(&Utc),
                window: window_json.map(|w| serde_json::from_str(&w).unwrap()),
            }
        }))
    }

    pub async fn list_active_events(&self) -> Result<Vec<ActiveEvent>, sqlx::Error> {
        let rows: Vec<(String, String, String, String, i64, String, Option<String>)> = sqlx::query_as(
            "SELECT event_id, metadata_json, creator_address, payment_tx_hash, payment_block_number, activated_at, window_json FROM active_events",
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|(event_id, metadata_json, creator_address, payment_tx_hash, payment_block_number, activated_at, window_json)| {
            ActiveEvent {
                event_id,
                metadata: serde_json::from_str(&metadata_json).unwrap(),
                creator_address,
                payment_tx_hash,
                payment_block_number: payment_block_number as u64,
                activated_at: DateTime::parse_from_rfc3339(&activated_at).unwrap().with_timezone(&Utc),
                window: window_json.map(|w| serde_json::from_str(&w).unwrap()),
            }
        }).collect())
    }

    pub async fn update_event_window(&self, event_id: &str, window: &WindowProof) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE active_events SET window_json = ? WHERE event_id = ?")
            .bind(serde_json::to_string(window).unwrap())
            .bind(event_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn check_qr_replay(&self, event_id: &str, timestamp: i64) -> Result<bool, sqlx::Error> {
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM qr_replay_log WHERE event_id = ? AND timestamp = ?",
        )
        .bind(event_id)
        .bind(timestamp)
        .fetch_one(&self.pool)
        .await?;
        Ok(count.0 > 0)
    }

    pub async fn record_qr_usage(&self, event_id: &str, timestamp: i64) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT OR IGNORE INTO qr_replay_log (event_id, timestamp, used_at) VALUES (?, ?, ?)",
        )
        .bind(event_id)
        .bind(timestamp)
        .bind(Utc::now().to_rfc3339())
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn cleanup_expired_replay_log(&self, before: DateTime<Utc>) -> Result<u64, sqlx::Error> {
        let result = sqlx::query("DELETE FROM qr_replay_log WHERE used_at < ?")
            .bind(before.to_rfc3339())
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
    }

    pub async fn store_badge_observation(&self, badge: &BadgeObservation) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT OR REPLACE INTO badge_observations (event_id, holder_address, mint_tx_hash, mint_block_number, verified_at_block, observed_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&badge.event_id)
        .bind(&badge.holder_address)
        .bind(&badge.mint_tx_hash)
        .bind(badge.mint_block_number as i64)
        .bind(badge.verified_at_block as i64)
        .bind(badge.observed_at.to_rfc3339())
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_badges_by_address(&self, address: &str) -> Result<Vec<BadgeObservation>, sqlx::Error> {
        let rows: Vec<(String, String, String, i64, i64, String)> = sqlx::query_as(
            "SELECT event_id, holder_address, mint_tx_hash, mint_block_number, verified_at_block, observed_at FROM badge_observations WHERE holder_address = ?",
        )
        .bind(address)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|(event_id, holder_address, mint_tx_hash, mint_block_number, verified_at_block, observed_at)| {
            BadgeObservation {
                event_id,
                holder_address,
                mint_tx_hash,
                mint_block_number: mint_block_number as u64,
                verified_at_block: verified_at_block as u64,
                observed_at: DateTime::parse_from_rfc3339(&observed_at).unwrap().with_timezone(&Utc),
            }
        }).collect())
    }

    pub async fn get_badges_by_event(&self, event_id: &str) -> Result<Vec<BadgeObservation>, sqlx::Error> {
        let rows: Vec<(String, String, String, i64, i64, String)> = sqlx::query_as(
            "SELECT event_id, holder_address, mint_tx_hash, mint_block_number, verified_at_block, observed_at FROM badge_observations WHERE event_id = ?",
        )
        .bind(event_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|(event_id, holder_address, mint_tx_hash, mint_block_number, verified_at_block, observed_at)| {
            BadgeObservation {
                event_id,
                holder_address,
                mint_tx_hash,
                mint_block_number: mint_block_number as u64,
                verified_at_block: verified_at_block as u64,
                observed_at: DateTime::parse_from_rfc3339(&observed_at).unwrap().with_timezone(&Utc),
            }
        }).collect())
    }

    pub async fn is_available(&self) -> bool {
        sqlx::query("SELECT 1").fetch_one(&self.pool).await.is_ok()
    }
}
