use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Challenge expired")]
    ChallengeExpired,

    #[error("Challenge not found")]
    ChallengeNotFound,

    #[error("Invalid signature")]
    InvalidSignature,

    #[error("Event not found")]
    EventNotFound,

    #[error("Attendance window closed")]
    WindowClosed,

    #[error("Already attended")]
    AlreadyAttended,

    #[error("Invalid request: {0}")]
    BadRequest(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::ChallengeExpired => (StatusCode::GONE, self.to_string()),
            AppError::ChallengeNotFound => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::InvalidSignature => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::EventNotFound => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::WindowClosed => (StatusCode::FORBIDDEN, self.to_string()),
            AppError::AlreadyAttended => (StatusCode::CONFLICT, self.to_string()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
        };

        let body = Json(json!({ "error": message }));
        (status, body).into_response()
    }
}
