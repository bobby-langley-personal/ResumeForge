#!/bin/bash
# Vercel Ignored Build Step
# ─────────────────────────────────────────────────────────────────────────────
# Set this as the "Ignored Build Step" command in:
#   Vercel dashboard → Project → Settings → Git → Ignored Build Step
#   Command: bash scripts/vercel-ignore.sh
#
# Exit 0 = skip build   (ignore this push)
# Exit 1 = run build    (deploy this push)
#
# Rules:
#   main         → always deploy (production)
#   staging      → always deploy (staging preview)
#   claude/*, *  → always skip   (feature branches never deploy)
# ─────────────────────────────────────────────────────────────────────────────

echo "Branch: $VERCEL_GIT_COMMIT_REF"

if [[ "$VERCEL_GIT_COMMIT_REF" == "main" || "$VERCEL_GIT_COMMIT_REF" == "staging" ]]; then
  echo "→ Deploying"
  exit 1
else
  echo "→ Skipping (only main and staging deploy)"
  exit 0
fi
