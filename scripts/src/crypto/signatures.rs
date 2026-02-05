use secp256k1::{ecdsa, Message, PublicKey, Secp256k1};
use sha2::{Digest, Sha256};

#[derive(Debug, Clone)]
pub enum SignatureFormat {
    Raw,
    Ethereum,
    CkbPersonal,
}

pub fn hash_message(message: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(message.as_bytes());
    hasher.finalize().into()
}

pub fn hash_message_ethereum(message: &str) -> [u8; 32] {
    let prefix = format!("\x19Ethereum Signed Message:\n{}", message.len());
    let mut hasher = Sha256::new();
    hasher.update(prefix.as_bytes());
    hasher.update(message.as_bytes());
    hasher.finalize().into()
}

pub fn verify_signature(
    message: &str,
    signature_hex: &str,
    pubkey_hex: &str,
    format: SignatureFormat,
) -> Result<bool, SignatureError> {
    let secp = Secp256k1::verification_only();

    let msg_hash = match format {
        SignatureFormat::Raw => hash_message(message),
        SignatureFormat::Ethereum | SignatureFormat::CkbPersonal => hash_message_ethereum(message),
    };

    let msg = Message::from_digest(msg_hash);
    let sig_bytes = hex::decode(signature_hex).map_err(|_| SignatureError::InvalidHex)?;

    let sig = if sig_bytes.len() == 65 {
        ecdsa::Signature::from_compact(&sig_bytes[..64]).map_err(|_| SignatureError::InvalidSignature)?
    } else if sig_bytes.len() == 64 {
        ecdsa::Signature::from_compact(&sig_bytes).map_err(|_| SignatureError::InvalidSignature)?
    } else {
        return Err(SignatureError::InvalidSignature);
    };

    let pubkey_bytes = hex::decode(pubkey_hex).map_err(|_| SignatureError::InvalidHex)?;
    let pubkey = PublicKey::from_slice(&pubkey_bytes).map_err(|_| SignatureError::InvalidPublicKey)?;

    Ok(secp.verify_ecdsa(&msg, &sig, &pubkey).is_ok())
}

pub fn recover_pubkey(
    message: &str,
    signature_hex: &str,
    format: SignatureFormat,
) -> Result<String, SignatureError> {
    let secp = Secp256k1::new();

    let msg_hash = match format {
        SignatureFormat::Raw => hash_message(message),
        SignatureFormat::Ethereum | SignatureFormat::CkbPersonal => hash_message_ethereum(message),
    };

    let msg = Message::from_digest(msg_hash);
    let sig_bytes = hex::decode(signature_hex).map_err(|_| SignatureError::InvalidHex)?;

    if sig_bytes.len() != 65 {
        return Err(SignatureError::InvalidSignature);
    }

    let recovery_id = ecdsa::RecoveryId::from_i32((sig_bytes[64] % 27) as i32)
        .map_err(|_| SignatureError::InvalidRecoveryId)?;
    let sig = ecdsa::RecoverableSignature::from_compact(&sig_bytes[..64], recovery_id)
        .map_err(|_| SignatureError::InvalidSignature)?;

    let pubkey = secp.recover_ecdsa(&msg, &sig).map_err(|_| SignatureError::RecoveryFailed)?;
    Ok(hex::encode(pubkey.serialize()))
}

#[derive(Debug, thiserror::Error)]
pub enum SignatureError {
    #[error("invalid hex encoding")]
    InvalidHex,
    #[error("invalid signature format")]
    InvalidSignature,
    #[error("invalid public key")]
    InvalidPublicKey,
    #[error("invalid recovery id")]
    InvalidRecoveryId,
    #[error("failed to recover public key")]
    RecoveryFailed,
}
