"""rein — Python SDK for REIN.

Public surface mirrors the TypeScript ``@rein/sdk`` package.
"""

from rein.errors import ErrorCode, ReinError, is_rein_error
from rein.types import (
    ActivityEvent,
    Cluster,
    Env,
    ParsedToken,
    Policy,
    Receipt,
    Scope,
    SimulationOutcome,
    SpendOpts,
    SpendResult,
    StepUpOpts,
    TokenPayload,
)
from rein.auth.token import (
    has_scope,
    parse_token,
    redact_token,
    token_nearing_expiry,
)
from rein.policy.simulate import (
    SimReason,
    SimulationResult,
    SimulatorRequest,
    SimulatorState,
    simulate,
)
from rein.program_id import REIN_PROGRAM_ID
from rein.seeds import (
    BLOCKLIST_SEED,
    COUNTER_SEED,
    POLICY_SEED,
    RECEIPT_SEED,
    STEP_UP_SEED,
    VAULT_SEED,
)
from rein.x402.encoder import encode_payment_header
from rein.x402.parser import Facilitator, Requirement, parse_payment_requirements
from rein.x402.selector import (
    SUPPORTED_NETWORKS,
    SUPPORTED_USDC_MINTS,
    SelectFilter,
    select_acceptable,
)
from rein.client import Rein

__all__ = [
    "Rein",
    "ReinError",
    "ErrorCode",
    "is_rein_error",
    "Cluster",
    "Env",
    "Scope",
    "TokenPayload",
    "ParsedToken",
    "Policy",
    "Receipt",
    "SpendOpts",
    "SpendResult",
    "StepUpOpts",
    "ActivityEvent",
    "SimulationOutcome",
    "parse_token",
    "redact_token",
    "token_nearing_expiry",
    "has_scope",
    "simulate",
    "SimReason",
    "SimulationResult",
    "SimulatorState",
    "SimulatorRequest",
    "REIN_PROGRAM_ID",
    "VAULT_SEED",
    "POLICY_SEED",
    "BLOCKLIST_SEED",
    "COUNTER_SEED",
    "RECEIPT_SEED",
    "STEP_UP_SEED",
    "Facilitator",
    "Requirement",
    "parse_payment_requirements",
    "SelectFilter",
    "select_acceptable",
    "SUPPORTED_NETWORKS",
    "SUPPORTED_USDC_MINTS",
    "encode_payment_header",
]

__version__ = "0.1.0"
