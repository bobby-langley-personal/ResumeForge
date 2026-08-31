#!/bin/bash
# Promote staging → production
# ─────────────────────────────────────────────────────────────────────────────
# Usage: bash scripts/promote-to-prod.sh
#
# Merges staging into main and pushes, triggering a production Vercel deploy.
# For hotfixes that bypass staging, push directly to main (branch protection
# requires a PR unless you push as the repo admin — use sparingly).
# ─────────────────────────────────────────────────────────────────────────────

set -e

# Ensure we're on staging and it's up to date
git checkout staging
git pull origin staging

# Confirm
echo ""
echo "⚠️  You are about to promote staging → main (PRODUCTION)"
echo "This triggers an immediate Vercel production deployment."
echo ""
read -p "Type 'promote' to confirm: " confirm
if [[ "$confirm" != "promote" ]]; then
  echo "Aborted."
  exit 1
fi

# Merge into main
git checkout main
git pull origin main
git merge --no-ff staging -m "chore: promote staging to production"
git push origin main

echo ""
echo "✅ Promoted. Production deployment triggered."
echo "   Track it at: https://vercel.com/bobby-langley-personals-projects/easy-apply-ai"
