#!/usr/bin/env bash
# End-to-end smoke against live wrangler dev + devnet program.
set -uo pipefail

SERVICE="${SERVICE_URL:-http://127.0.0.1:8787}"
STUB="${STUB_URL:-http://192.168.64.1:9999}"
VAULT="H6SgR2ZiZubVLTCREaAxcXBTTsj5STqVBhFd65KAs7j6"
RECIPIENT="2Z7gtudSk61G57sLXWQietd9ubvZrJPRrgaYd4mDwMp3"

C_BLUE='\033[1;34m'; C_GREEN='\033[1;32m'; C_RED='\033[1;31m'; C_DIM='\033[2m'; C_RESET='\033[0m'
hdr() { echo -e "${C_BLUE}── $* ──${C_RESET}"; }
ok()  { echo -e "${C_GREEN}✓${C_RESET} $*"; }
bad() { echo -e "${C_RED}✗${C_RESET} $*"; }

PASS=0; FAIL=0
do_get()  { curl -sS --max-time 60 -o /tmp/_smoke_body -w '%{http_code}' "$@"; }
do_post() { curl -sS --max-time 90 -o /tmp/_smoke_body -w '%{http_code}' -X POST -H "Content-Type: application/json" "$@"; }
check()   { local label="$1" exp="$2" got="$3"
  if [[ "$got" == "$exp" ]]; then ok "$label (HTTP $got)"; PASS=$((PASS+1));
  else bad "$label (expected HTTP $exp, got $got)"; FAIL=$((FAIL+1)); fi
}

hdr "1. /health"
CODE=$(do_get "$SERVICE/health"); echo -e "${C_DIM}$(cat /tmp/_smoke_body)${C_RESET}"
check "/health" 200 "$CODE"

hdr "2. issue token (signs challenge with dev wallet via WSL)"
TOKEN_RAW=$(wsl -d Ubuntu -- bash -lc "export PATH=\"\$HOME/.local/node/bin:\$HOME/.cargo/bin:\$HOME/.local/share/solana/install/active_release/bin:\$PATH\"; cd /mnt/e/20-days-20-apps/hackathon/tether/program; ANCHOR_WALLET=\$HOME/.config/solana/id.json ANCHOR_PROVIDER_URL=https://api.devnet.solana.com SERVICE_URL=http://192.168.64.1:8787 npx tsx scripts/issue-token.ts 2>&1")
TOKEN=$(echo "$TOKEN_RAW" | grep -oE 'rein_dev_[a-z0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' | head -1)
KID=$(echo "$TOKEN" | sed -E 's/^rein_dev_([a-z0-9]+)\..*/\1/')
if [[ -n "$TOKEN" ]]; then ok "token issued (kid=$KID)"; PASS=$((PASS+1)); else bad "no token"; FAIL=$((FAIL+1)); echo "$TOKEN_RAW" | tail -10; fi

hdr "3. /v1/me with token"
CODE=$(do_get -H "Authorization: Bearer $TOKEN" "$SERVICE/v1/me"); echo -e "${C_DIM}$(cat /tmp/_smoke_body)${C_RESET}"
check "/v1/me" 200 "$CODE"

hdr "4. /v1/me without token → 401"
CODE=$(do_get "$SERVICE/v1/me"); echo -e "${C_DIM}$(cat /tmp/_smoke_body)${C_RESET}"
check "/v1/me unauth" 401 "$CODE"

hdr "5. /v1/spend (\$0.20 happy path)"
CODE=$(do_post -H "Authorization: Bearer $TOKEN" -d "{\"recipient\":\"$RECIPIENT\",\"amount\":\"200000\"}" "$SERVICE/v1/spend")
BODY=$(cat /tmp/_smoke_body); echo -e "${C_DIM}$BODY${C_RESET}"
check "/v1/spend happy" 200 "$CODE"
SIG=$(echo "$BODY" | grep -oE '"signature":"[^"]+"' | cut -d'"' -f4)
SPEND_NONCE=$(echo "$BODY" | grep -oE '"nonce":"[^"]+"' | cut -d'"' -f4)
RECEIPT_PDA=$(echo "$BODY" | grep -oE '"receiptPda":"[^"]+"' | cut -d'"' -f4)
[[ -n "$SIG" ]] && echo "  → tx:      https://explorer.solana.com/tx/$SIG?cluster=devnet"
[[ -n "$RECEIPT_PDA" ]] && echo "  → receipt: https://explorer.solana.com/address/$RECEIPT_PDA?cluster=devnet"

hdr "6. /v1/receipts/$SPEND_NONCE"
CODE=$(do_get "$SERVICE/v1/receipts/$SPEND_NONCE?vault=$VAULT"); echo -e "${C_DIM}$(cat /tmp/_smoke_body)${C_RESET}"
check "/v1/receipts" 200 "$CODE"

hdr "7. /v1/spend over per_tx_cap (\$0.60 vs \$0.50 limit)"
CODE=$(do_post -H "Authorization: Bearer $TOKEN" -d "{\"recipient\":\"$RECIPIENT\",\"amount\":\"600000\"}" "$SERVICE/v1/spend")
echo -e "${C_DIM}$(cat /tmp/_smoke_body)${C_RESET}"
check "/v1/spend over-cap" 422 "$CODE"

hdr "8. /v1/x402/spend (full 402 dance against stub)"
CODE=$(do_post -H "Authorization: Bearer $TOKEN" -d "{\"url\":\"$STUB/api/quote\",\"maxAmount\":\"500000\"}" "$SERVICE/v1/x402/spend")
BODY=$(cat /tmp/_smoke_body); echo -e "${C_DIM}$BODY${C_RESET}"
check "/v1/x402/spend" 200 "$CODE"
X_SIG=$(echo "$BODY" | grep -oE '"signature":"[^"]+"' | head -1 | cut -d'"' -f4)
[[ -n "$X_SIG" ]] && echo "  → tx: https://explorer.solana.com/tx/$X_SIG?cluster=devnet"

hdr "9. /v1/auth/refresh (rotate kid)"
CODE=$(do_post -H "Authorization: Bearer $TOKEN" "$SERVICE/v1/auth/refresh")
BODY=$(cat /tmp/_smoke_body); echo -e "${C_DIM}$BODY${C_RESET}"
check "/v1/auth/refresh" 200 "$CODE"
NEW_KID=$(echo "$BODY" | grep -oE '"kid":"[^"]+"' | cut -d'"' -f4)
if [[ -n "$NEW_KID" && "$NEW_KID" != "$KID" ]]; then ok "new kid $NEW_KID ≠ old $KID"; PASS=$((PASS+1));
else bad "kid did not rotate"; FAIL=$((FAIL+1)); fi

hdr "10. /v1/auth/revoke (kill ORIGINAL kid)"
CODE=$(do_post -H "Authorization: Bearer $TOKEN" "$SERVICE/v1/auth/revoke")
echo -e "${C_DIM}$(cat /tmp/_smoke_body)${C_RESET}"
check "/v1/auth/revoke" 200 "$CODE"

hdr "11. /v1/me with REVOKED token"
CODE=$(do_get -H "Authorization: Bearer $TOKEN" "$SERVICE/v1/me")
echo -e "${C_DIM}$(cat /tmp/_smoke_body)${C_RESET}"
check "/v1/me revoked" 401 "$CODE"

echo
hdr "SUMMARY"
echo -e "Pass: ${C_GREEN}$PASS${C_RESET}   Fail: ${C_RED}$FAIL${C_RESET}"
if [[ $FAIL -eq 0 ]]; then echo -e "${C_GREEN}✓ all routes live on devnet${C_RESET}"; else echo -e "${C_RED}✗ regressions${C_RESET}"; fi
