# DOB Badge Contract

**Core contract. Required.**

## Purpose

Represent a cryptographically unique proof-of-presence badge owned by a CKB address.

### The chain knows:
- This badge exists
- It's unique
- This address owns it

### The chain does NOT know:
- How attendance was verified
- What QR was shown
- What backend was used

---

## Type Script

### Responsibilities (ONLY):

- Enforce one badge per `(event_id, address)`
- Bind immutable metadata
- Prevent duplication

### It must NOT:

- Verify signatures
- Verify timestamps
- Verify attendance logic
- Call any oracle or backend

---

## Badge Args

```rust
struct BadgeArgs {
    event_id_hash: [u8; 32],              // hash(event_id)
    recipient_address_hash: [u8; 32],     // hash(recipient_address)
}
```

The type script uses args to enforce uniqueness.

---

## Validation Rules

1. **Exactly one output badge** per `(event_id_hash, recipient_address_hash)`
2. **Badge cannot be re-minted** with same args (checked via cell deps or type ID pattern)
3. **Metadata is immutable** after mint

---

## Badge Metadata

Stored as immutable cell data:

```json
{
  "protocol": "ckb-pop",
  "version": "1",
  "event_id": "string",
  "issuer": "ckb1...",
  "issued_at_block": 123456,
  "attendance_proof_hash": "0x..."
}
```

### Important:

- `attendance_proof_hash` is **opaque** to the chain
- Chain does NOT interpret it
- It allows anyone to correlate off-chain proofs if they want

---

## Minting Flow

```
1. Off-chain: Attendance proof verified cryptographically
2. Off-chain: Backend builds unsigned tx with badge type script
3. Client: Signs transaction (user custody)
4. On-chain: Type script validates uniqueness
5. On-chain: Badge cell created, owned by recipient
```

The type script only runs at mint time. It enforces structure, not policy.
