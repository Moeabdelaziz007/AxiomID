"""CrewAI custom tools for AxiomID identity and trust checks.

Set AXIOMID_BASE_URL and AXIOMID_API_KEY in the CrewAI host process when needed.
The tools use only Python's standard library plus CrewAI's `tool` decorator.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from crewai.tools import tool


DEFAULT_AXIOMID_BASE_URL = "https://axiomid.app"
DEFAULT_MINIMUM_TRUST_SCORE = 70
DEFAULT_AXIOMID_TIMEOUT_SECONDS = 5.0


def _axiomid_get(path: str) -> dict[str, Any]:
    """Fetch JSON from the configured AxiomID API."""
    base_url = os.getenv("AXIOMID_BASE_URL", DEFAULT_AXIOMID_BASE_URL).rstrip("/")
    headers = {"Accept": "application/json"}
    api_key = os.getenv("AXIOMID_API_KEY")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    request = urllib.request.Request(
        f"{base_url}{path}",
        headers=headers,
        method="GET",
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=_axiomid_timeout_seconds(),
        ) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"AxiomID HTTP {error.code}: {body}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"AxiomID request failed: {error.reason}") from error


def _axiomid_timeout_seconds() -> float:
    """Read the AxiomID HTTP timeout from the host environment."""
    raw_timeout = os.getenv("AXIOMID_TIMEOUT_SECONDS")
    if raw_timeout is None:
        return DEFAULT_AXIOMID_TIMEOUT_SECONDS

    try:
        return float(raw_timeout)
    except ValueError as error:
        raise ValueError("AXIOMID_TIMEOUT_SECONDS must be a number") from error


def _minimum_trust_score() -> int:
    """Read the default Soul Gate trust threshold from the host environment."""
    raw_score = os.getenv("AXIOMID_MINIMUM_TRUST_SCORE")
    if raw_score is None:
        return DEFAULT_MINIMUM_TRUST_SCORE

    try:
        return int(raw_score)
    except ValueError as error:
        raise ValueError("AXIOMID_MINIMUM_TRUST_SCORE must be an integer") from error


def _identity_context(did: str) -> dict[str, Any]:
    """Build DID, trust, and passport context for a CrewAI task."""
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
    """Extract a stable trust score shape from an AxiomID passport payload."""
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
    minimum_trust_score: int | None = None,
) -> str:
    """Check whether an AxiomID identity can proceed with a CrewAI task."""
    context = _identity_context(did)
    score = int(context["trustScore"]["score"])
    threshold = (
        _minimum_trust_score()
        if minimum_trust_score is None
        else int(minimum_trust_score)
    )
    allowed = score >= threshold

    return json.dumps(
        {
            "allowed": allowed,
            "minimumTrustScore": threshold,
            "context": context,
            "reason": None
            if allowed
            else f"Trust score {score} is below required minimum {threshold}",
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
    issuer = _require_non_empty_string(issuer_did, "issuer_did")
    subject = _require_non_empty_string(subject_did, "subject_did")
    attestation_claim = _require_non_empty_string(claim, "claim")
    evidence = _json_object(evidence_json, "evidence_json")

    return json.dumps(
        {
            "type": "AxiomIDAttestationDraft",
            "issuerDid": issuer,
            "subjectDid": subject,
            "claim": attestation_claim,
            "evidence": evidence,
            "issuedAt": _issued_at(),
        },
        ensure_ascii=False,
    )


def _require_non_empty_string(value: Any, field: str) -> str:
    """Validate a required CrewAI string argument."""
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be a non-empty string")
    return value


def _json_object(value: Any, field: str) -> dict[str, Any]:
    """Decode a required JSON object string argument."""
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a JSON object string")

    try:
        decoded = json.loads(value)
    except json.JSONDecodeError as error:
        raise ValueError(f"{field} must be valid JSON") from error

    if not isinstance(decoded, dict):
        raise ValueError(f"{field} must decode to an object")

    return decoded


def _issued_at() -> str:
    """Return an ISO-8601 UTC timestamp for attestation drafts."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
