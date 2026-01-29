#!/usr/bin/env bash
# git add -A && commit + push. Správa = argument alebo "update".
# Použitie: ./scripts/go.sh   alebo   ./scripts/go.sh "fix fotky"
set -e
git add -A
git commit -m "${*:-update}"
git push
