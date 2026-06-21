#!/usr/bin/env bash
# One-shot: migrate the new schema, then smoke-test every new endpoint.
# Run from the server/ directory:  bash scripts/verify-features.sh
set -e
cd "$(dirname "$0")/.."

echo "── 1. Applying schema change (reviewStatus on documents) ──"
npx prisma db push
npx prisma generate >/dev/null

echo ""
echo "── 2. (Re)start the API in another terminal if not running:  npm run dev ──"
echo "    Waiting for http://localhost:4000/health ..."
for i in $(seq 1 30); do
  curl -sf http://localhost:4000/health >/dev/null 2>&1 && break || sleep 1
done

API=http://localhost:4000/api/v1
TOKEN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@clearway.app","password":"ChangeMe123!"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
auth() { curl -s -H "Authorization: Bearer $TOKEN" "$@"; }

echo ""
echo "── 3. Reconciliation ──"
auth "$API/reports/reconciliation" | head -c 300; echo

echo ""
echo "── 4. Ledger (NFK NEW ACCOUNT) ──"
auth "$API/reports/ledger" | head -c 300; echo

echo ""
echo "── 5. Review queue (PENDING documents) ──"
auth "$API/documents?reviewStatus=PENDING" | head -c 200; echo

echo ""
echo "── 6. CSV export (first lines) ──"
auth "$API/reports/ledger/export?format=csv" | head -3

echo ""
echo "── 7. Re-sync Gmail so OCR runs on attachments ──"
auth -X POST "$API/emails/sync" -H 'Content-Type: application/json' -d '{"query":"newer_than:30d","max":15}' | head -c 200; echo
echo ""
echo "Done. Check the server log for 'pdf-text' / 'vision-ocr' extraction sources."
