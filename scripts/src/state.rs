use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};
use tokio::sync::RwLock;

use crate::challenge::Challenge;

#[derive(Clone)]
pub struct AppState {
    pub inner: Arc<AppStateInner>,
}

pub struct AppStateInner {
    pub challenges: RwLock<HashMap<String, Challenge>>,
    pub attended: RwLock<HashMap<String, HashSet<String>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(AppStateInner {
                challenges: RwLock::new(HashMap::new()),
                attended: RwLock::new(HashMap::new()),
            }),
        }
    }
}
