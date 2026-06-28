"""CrewAI custom tools for AxiomID identity and trust checks.

Set AXIOMID_BASE_URL and AXIOMID_API_KEY in the CrewAI host process when needed.
The tools use only Python's standard library plus CrewAI's `tool` decorator.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from crewai.tools import tool


AXIOMID_BASE_URL = os.getenv("AXIOMID_BASE_URL", "https://axiomid.app").rstrip("/")
AXIOMID_API_KEY = os.getenv("AXIOMID_API_KEY")
DEFAULT_MINIMUM_TRUST_SCORE = int(os.getenv("AXIOMID_MINIMUM_TRUST_SCORE", "70"))
AXIOMID_TIMEOUT_SECONDS = float(os.getenv("AXIOMID_TIMEOUT_SECONDS", "5"))


def _axiomid_get(path: str) -> dict[str, Any]:
    headers = {"Accept": "application/json"}
    if AXIOMID_API_KEY:
        headers["Authorization"] = f"Bearer {AXIOMID_API_KEY}"

    request = urllib.request.Request(
        f"{AXIOMID_BASE_URL}{path}",
        headers=headers,
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=AXIOMID_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"AxiomID HTTP {error.code}: {body}") from error


def _identity_context(did: str) -> dict[str, Any]:
    if not isinstance(did, str) or not did.strip():
        raise ValueError("did must be a non-empty string")

    encoded_did = urllib.parse.quote(did, safe="")
    did_document = _axiomid_get(f"/api/did-document?did={encoded_did}")
    passport = _axiomid_get(f"/api/passport/{encoded_did}")

    return {
        "did": did,
        "didDocument": did_document,
        "trustScore": _trust_score_context(passport, did),
        "passport": passport,
    }


def _trust_score_context(passport: dict[str, Any], fallback_did: str) -> dict[str, Any]:
    raw_score = passport.get("trustScore", 0)
    try:
        score = int(raw_score) if raw_score is not None else 0
    except (TypeError, ValueError):
        score = 0

    passport_did = passport.get("did")
    tier = passport.get("tier")

    return {
        "did": passport_did
        if isinstance(passport_did, str) and passport_did
        else fallback_did,
        "score": score,
        "tier": tier if isinstance(tier, str) and tier else "Unknown",
    }


@tool("axiomid_verify_identity")
def axiomid_verify_identity(did: str) -> str:
    """Resolve an AxiomID DID and return DID document plus trust context."""
    return json.dumps(_identity_context(did), ensure_ascii=False)


@tool("axiomid_enforce_soul_gate")
def axiomid_enforce_soul_gate(
    did: str,
    minimum_trust_score: int = DEFAULT_MINIMUM_TRUST_SCORE,
) -> str:
    """Check whether an AxiomID identity can proceed with a CrewAI task."""
    context = _identity_context(did)
    score = int(context["trustScore"]["score"])
    allowed = score >= minimum_trust_score

    return json.dumps(
        {
            "allowed": allowed,
            "minimumTrustScore": minimum_trust_score,
            "context": context,
            "reason": None
            if allowed
            else f"Trust score {score} is below required minimum {minimum_trust_score}",
        },
        ensure_ascii=False,
    )


@tool("axiomid_create_attestation_draft")
def axiomid_create_attestation_draft(
    issuer_did: str,
    subject_did: str,
    claim: str,
    evidence_json: str = "{}",
) -> str:
    """Create an unsigned AxiomID attestation draft from CrewAI task output."""
    if not issuer_did.strip():
        raise ValueError("issuer_did must be a non-empty string")
    if not subject_did.strip():
        raise ValueError("subject_did must be a non-empty string")
    if not claim.strip():
        raise ValueError("claim must be a non-empty string")

    try:
        evidence = json.loads(evidence_json)
    except json.JSONDecodeError as error:
        raise ValueError("evidence_json must be valid JSON") from error

    if not isinstance(evidence, dict):
        raise ValueError("evidence_json must decode to an object")

    return json.dumps(
        {
            "type": "AxiomIDAttestationDraft",
            "issuerDid": issuer_did,
            "subjectDid": subject_did,
            "claim": claim,
            "evidence": evidence,
        },
        ensure_ascii=False,
    )
