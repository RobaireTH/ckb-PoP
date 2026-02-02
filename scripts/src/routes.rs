use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::{challenge::Challenge, error::AppError, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health))
        .route("/challenge", post(create_challenge))
        .route("/verify", post(verify_attendance))
}

async fn health() -> &'static str {
    "ok"
}

#[derive(Deserialize)]
pub struct CreateChallengeRequest {
    pub event_id: String,
}

#[derive(Serialize)]
pub struct ChallengeResponse {
    pub challenge_id: String,
    pub message: String,
    pub expires_at: i64,
}

async fn create_challenge(
    State(state): State<AppState>,
    Json(req): Json<CreateChallengeRequest>,
) -> Result<Json<ChallengeResponse>, AppError> {
    if req.event_id.is_empty() {
        return Err(AppError::BadRequest("event_id required".into()));
    }

    let challenge = Challenge::new(req.event_id);
    let response = ChallengeResponse {
        challenge_id: challenge.id.clone(),
        message: challenge.message_to_sign(),
        expires_at: challenge.expires_at.timestamp(),
    };

    state
        .inner
        .challenges
        .write()
        .await
        .insert(challenge.id.clone(), challenge);

    Ok(Json(response))
}

#[derive(Deserialize)]
pub struct VerifyRequest {
    pub challenge_id: String,
    pub address: String,
    pub signature: String,
}

#[derive(Serialize)]
pub struct VerifyResponse {
    pub success: bool,
    pub event_id: String,
    pub address: String,
}

async fn verify_attendance(
    State(state): State<AppState>,
    Json(req): Json<VerifyRequest>,
) -> Result<Json<VerifyResponse>, AppError> {
    let challenge = {
        let challenges = state.inner.challenges.read().await;
        challenges
            .get(&req.challenge_id)
            .cloned()
            .ok_or(AppError::ChallengeNotFound)?
    };

    if challenge.is_expired() {
        state
            .inner
            .challenges
            .write()
            .await
            .remove(&req.challenge_id);
        return Err(AppError::ChallengeExpired);
    }

    // Check for replay: has this address already attended this event?
    {
        let attended = state.inner.attended.read().await;
        if let Some(addresses) = attended.get(&challenge.event_id) {
            if addresses.contains(&req.address) {
                return Err(AppError::AlreadyAttended);
            }
        }
    }

    // TODO: Verify CKB signature against message
    // For now, accept any non-empty signature
    if req.signature.is_empty() {
        return Err(AppError::InvalidSignature);
    }

    // Mark as attended
    {
        let mut attended = state.inner.attended.write().await;
        attended
            .entry(challenge.event_id.clone())
            .or_default()
            .insert(req.address.clone());
    }

    // Remove used challenge
    state
        .inner
        .challenges
        .write()
        .await
        .remove(&req.challenge_id);

    Ok(Json(VerifyResponse {
        success: true,
        event_id: challenge.event_id,
        address: req.address,
    }))
}
