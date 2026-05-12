"""Seed strings consumed by the on-chain program.

Must match ``program/programs/rein/src/constants.rs`` byte-for-byte. The SDK
exposes them as ``bytes`` so the consumer can feed them straight into
``Pubkey.find_program_address``.
"""

from __future__ import annotations

VAULT_SEED: bytes = b"vault"
POLICY_SEED: bytes = b"policy"
BLOCKLIST_SEED: bytes = b"blocklist"
COUNTER_SEED: bytes = b"counter"
RECEIPT_SEED: bytes = b"receipt"
STEP_UP_SEED: bytes = b"stepup"
