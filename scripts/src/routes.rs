use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};

use crate::crypto::qr;
use crate::observe::{self, ObserveError};
use crate::relay::{self, RelayError};
use crate::state::AppState;
use crate::types::{
    ActiveEvent, AttendanceProof, EventIdPreimage, EventMetadata, HealthResponse, PaymentIntent,
    QrPayload, QrResponse, WindowProof,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health))
        .route("/events/intent", post(submit_intent))
        .route("/events/create", post(create_event))
        .route("/events", get(list_events))
        .route("/events/:id", get(get_event))
        .route("/events/:id/window", post(submit_window))
        .route("/events/:id/qr", get(get_qr))
        .route("/events/:id/activate", post(activate_event))
        .route("/events/:id/badge-holders", get(get_badge_holders))
        .route("/badges/observe", get(observe_badges))
        .route("/badges/build", post(build_badge))
        .route("/badges/broadcast", post(broadcast_badge))
}

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    let ckb_status = if state.rpc.is_connected().await {
        "connected"
    } else {
        "disconnected"
    };

    let cache_status = if state.cache.is_available().await {
        "available"
    } else {
        "unavailable"
    };

    Json(HealthResponse {
        status: "operational".to_string(),
        ckb_rpc: ckb_status.to_string(),
        cache: cache_status.to_string(),
        last_block_observed: state.rpc.last_observed_block().await,
        note: "This backend is non-authoritative. Protocol functions without it.".to_string(),
    })
}

#[derive(Deserialize)]
pub struct IntentRequest {
    pub creator_address: String,
    pub creator_signature: String,
    pub nonce: String,
    pub metadata: EventMetadata,
}

#[derive(Serialize)]
pub struct IntentResponse {
    pub event_id: String,
    pub expires_at: i64,
}

async fn submit_intent(
    State(state): State<AppState>,
    Json(req): Json<IntentRequest>,
) -> Result<Json<IntentResponse>, AppError> {
    let now = Utc::now();
    let preimage = EventIdPreimage {
        creator_address: req.creator_address.clone(),
        timestamp: now.timestamp(),
        nonce: req.nonce,
    };

    let intent = PaymentIntent {
        event_id_preimage: preimage.clone(),
        creator_address: req.creator_address,
        creator_signature: req.creator_signature,
        event_metadata: req.metadata,
        declared_at: now,
        expires_at: now + Duration::hours(24),
    };

    let event_id = observe::submit_payment_intent(&state.cache, intent)
        .await
        .map_err(|e| AppError::Observe(e))?;

    Ok(Json(IntentResponse {
        event_id,
        expires_at: (now + Duration::hours(24)).timestamp(),
    }))
}

async fn create_event(
    State(state): State<AppState>,
    Json(req): Json<IntentRequest>,
) -> Result<Json<ActiveEvent>, AppError> {
    let now = Utc::now();
    let preimage = EventIdPreimage {
        creator_address: req.creator_address.clone(),
        timestamp: now.timestamp(),
        nonce: req.nonce,
    };

    let intent = PaymentIntent {
        event_id_preimage: preimage,
        creator_address: req.creator_address,
        creator_signature: req.creator_signature,
        event_metadata: req.metadata,
        declared_at: now,
        expires_at: now + Duration::hours(24),
    };

    let active_event = observe::create_and_activate_event(&state.cache, intent)
        .await
        .map_err(AppError::Observe)?;

    Ok(Json(active_event))
}

#[derive(Deserialize)]
pub struct VerifyQuery {
    #[serde(default)]
    pub verify: bool,
}

async fn list_events(
    State(state): State<AppState>,
    Query(query): Query<VerifyQuery>,
) -> Result<Json<observe::EventListResponse>, AppError> {
    let response = observe::observe_events(&state.cache, &state.rpc, query.verify)
        .await
        .map_err(AppError::Observe)?;
    Ok(Json(response))
}

async fn get_event(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
    Query(query): Query<VerifyQuery>,
) -> Result<Json<observe::EventDetailResponse>, AppError> {
    let response = observe::observe_event(&state.cache, &state.rpc, &event_id, query.verify)
        .await
        .map_err(AppError::Observe)?;
    Ok(Json(response))
}

#[derive(Deserialize)]
pub struct WindowRequest {
    pub window_start: i64,
    pub window_end: Option<i64>,
    pub creator_signature: String,
}

async fn submit_window(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
    Json(req): Json<WindowRequest>,
) -> Result<Json<WindowProof>, AppError> {
    let window_secret = qr::derive_window_secret(&event_id, req.window_start, &req.creator_signature);
    let commitment = hex::encode(sha2::Sha256::digest(&window_secret));

    let window = WindowProof {
        event_id: event_id.clone(),
        window_start: req.window_start,
        window_end: req.window_end,
        creator_signature: req.creator_signature,
        window_secret_commitment: commitment,
    };

    observe::update_window(&state.cache, &event_id, window.clone())
        .await
        .map_err(AppError::Observe)?;

    Ok(Json(window))
}

use sha2::Digest;

async fn get_qr(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
) -> Result<Json<QrResponse>, AppError> {
    let event = state
        .cache
        .get_active_event(&event_id)
        .await
        .map_err(|e| AppError::Observe(ObserveError::Cache(e)))?
        .ok_or(AppError::Observe(ObserveError::NotFound))?;

    let window = event.window.as_ref().ok_or(AppError::WindowNotOpen)?;

    if !window.is_open() {
        return Err(AppError::WindowClosed);
    }

    let window_secret = qr::derive_window_secret(
        &event_id,
        window.window_start,
        &window.creator_signature,
    );

    let payload = qr::generate_qr_payload(&event_id, &window_secret);
    let ttl = qr::qr_ttl_seconds();

    Ok(Json(QrResponse {
        qr_data: payload.encode(),
        ttl_seconds: ttl,
        expires_at: payload.timestamp + ttl as i64,
        window_end: window.window_end,
    }))
}

#[derive(Deserialize)]
pub struct ActivateRequest {
    pub tx_hash: String,
}

async fn activate_event(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
    Json(req): Json<ActivateRequest>,
) -> Result<Json<ActiveEvent>, AppError> {
    let event = observe::activate_event_from_payment(&state.cache, &state.rpc, &event_id, &req.tx_hash)
        .await
        .map_err(AppError::Observe)?;
    Ok(Json(event))
}

async fn get_badge_holders(
    State(state): State<AppState>,
    Path(event_id): Path<String>,
    Query(query): Query<VerifyQuery>,
) -> Result<Json<observe::BadgeListResponse>, AppError> {
    let response = observe::observe_badges_by_event(&state.cache, &state.rpc, &event_id, query.verify)
        .await
        .map_err(AppError::BadgeObserve)?;
    Ok(Json(response))
}

#[derive(Deserialize)]
pub struct BadgeQuery {
    pub address: String,
    #[serde(default)]
    pub verify: bool,
}

async fn observe_badges(
    State(state): State<AppState>,
    Query(query): Query<BadgeQuery>,
) -> Result<Json<observe::BadgeListResponse>, AppError> {
    let response = observe::observe_badges_by_address(&state.cache, &state.rpc, &query.address, query.verify)
        .await
        .map_err(AppError::BadgeObserve)?;
    Ok(Json(response))
}

async fn build_badge(
    State(state): State<AppState>,
    Json(req): Json<relay::BuildBadgeTxRequest>,
) -> Result<Json<relay::BuildBadgeTxResponse>, AppError> {
    let response = relay::build_badge_tx(&state.cache, &state.rpc, req)
        .await
        .map_err(AppError::Relay)?;
    Ok(Json(response))
}

async fn broadcast_badge(
    State(state): State<AppState>,
    Json(req): Json<relay::BroadcastRequest>,
) -> Result<Json<relay::BroadcastResponse>, AppError> {
    let response = relay::broadcast_tx(&state.rpc, req)
        .await
        .map_err(AppError::Relay)?;
    Ok(Json(response))
}

#[derive(Debug)]
pub enum AppError {
    Observe(ObserveError),
    BadgeObserve(observe::BadgeObserveError),
    Relay(RelayError),
    WindowNotOpen,
    WindowClosed,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::Observe(ObserveError::NotFound) => (StatusCode::NOT_FOUND, "event not found"),
            AppError::Observe(ObserveError::PaymentNotFound) => (StatusCode::NOT_FOUND, "payment not found"),
            AppError::Observe(ObserveError::PaymentNotConfirmed) => (StatusCode::BAD_REQUEST, "payment not confirmed"),
            AppError::Observe(_) => (StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
            AppError::BadgeObserve(_) => (StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
            AppError::Relay(RelayError::EventNotFound) => (StatusCode::NOT_FOUND, "event not found"),
            AppError::Relay(RelayError::WindowNotOpen) => (StatusCode::FORBIDDEN, "window not open"),
            AppError::Relay(RelayError::WindowClosed) => (StatusCode::FORBIDDEN, "window closed"),
            AppError::Relay(RelayError::ReplayDetected) => (StatusCode::CONFLICT, "replay detected"),
            AppError::Relay(RelayError::InvalidQrHmac) => (StatusCode::UNAUTHORIZED, "invalid qr"),
            AppError::Relay(RelayError::QrExpired) => (StatusCode::GONE, "qr expired"),
            AppError::Relay(_) => (StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
            AppError::WindowNotOpen => (StatusCode::FORBIDDEN, "window not open"),
            AppError::WindowClosed => (StatusCode::FORBIDDEN, "window closed"),
        };

        let body = serde_json::json!({ "error": message });
        (status, Json(body)).into_response()
    }
}
