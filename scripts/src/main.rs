mod cache;
mod crypto;
mod observe;
mod relay;
mod routes;
mod rpc;
mod state;
mod types;

use axum::Router;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::state::AppState;

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    dotenvy::dotenv().ok();

    // Load network-specific env file: .env.testnet, .env.mainnet, or .env.devnet
    let ckb_network = std::env::var("CKB_NETWORK").unwrap_or_else(|_| "testnet".to_string());
    let env_file = format!(".env.{}", ckb_network);
    if dotenvy::from_filename(&env_file).is_err() {
        tracing::warn!("No {} found, using defaults for {}", env_file, ckb_network);
    }

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:ckb_pop.db".to_string());
    let ckb_rpc_url = std::env::var("CKB_RPC_URL").unwrap_or_else(|_| "https://testnet.ckb.dev/rpc".to_string());

    tracing::info!("Network: {}, RPC: {}", ckb_network, ckb_rpc_url);

    let state = AppState::new(&database_url, &ckb_rpc_url)
        .await
        .expect("Failed to initialize app state");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .nest("/api", routes::router())
        .with_state(state)
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    tracing::info!("Backend listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
