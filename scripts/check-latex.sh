#!/bin/bash
# LaTeX compilation and overflow check script for pre-commit hooks
# Usage: check-latex.sh <tex-file>

set -e

TEX_FILE="$1"
if [ -z "$TEX_FILE" ]; then
  echo "Error: No LaTeX file provided"
  exit 1
fi

# Get absolute path to ensure we're in the right directory
if [[ "$TEX_FILE" != /* ]]; then
  # Relative path - make it absolute from current directory
  TEX_FILE="$(pwd)/$TEX_FILE"
fi

# Get the directory and filename
TEX_DIR=$(dirname "$TEX_FILE")
TEX_NAME=$(basename "$TEX_FILE")
TEX_BASE="${TEX_NAME%.tex}"

# Skip include files
if [[ "$TEX_NAME" == "Common.tex" ]] || [[ "$TEX_NAME" == "Comments.tex" ]]; then
  echo "Skipping include file: $TEX_NAME"
  exit 0
fi

# Check if it's a main document (has \documentclass)
if ! grep -q "\\documentclass" "$TEX_FILE"; then
  echo "Skipping non-document file: $TEX_NAME"
  exit 0
fi

echo "Compiling LaTeX: $TEX_NAME"

# Change to the directory containing the tex file
cd "$TEX_DIR" || exit 1

# Compile LaTeX
if grep -qE '\\bibliography\{|\\bibliographystyle\{' "$TEX_NAME"; then
  echo "  Running full compilation with bibtex"
  pdflatex -interaction=nonstopmode "$TEX_NAME" > /dev/null 2>&1 || { echo "ERROR: pass 1 failed"; exit 1; }
  if [ -f "${TEX_BASE}.aux" ] && grep -qE '\\citation\{' "${TEX_BASE}.aux" 2>/dev/null; then
    bibtex "${TEX_BASE}" > /dev/null 2>&1 || { echo "ERROR: bibtex failed"; exit 1; }
  fi
  pdflatex -interaction=nonstopmode "$TEX_NAME" > /dev/null 2>&1 || { echo "ERROR: pass 2 failed"; exit 1; }
  pdflatex -interaction=nonstopmode "$TEX_NAME" > /dev/null 2>&1 || { echo "ERROR: pass 3 failed"; exit 1; }
else
  echo "  Running simple compilation"
  pdflatex -interaction=nonstopmode "$TEX_NAME" > /dev/null 2>&1 || { echo "ERROR: pass 1 failed"; exit 1; }
  pdflatex -interaction=nonstopmode "$TEX_NAME" > /dev/null 2>&1 || { echo "ERROR: pass 2 failed"; exit 1; }
fi

# Check for overflow warnings
MAX_OVERFLOW_PT=300
LOG_FILE="${TEX_BASE}.log"

if [ -f "$LOG_FILE" ]; then
  OVERFLOWS=$(grep -E "Overfull \\\\hbox" "$LOG_FILE" || true)
  if [ -n "$OVERFLOWS" ]; then
    echo "  Found overflow warnings in $TEX_NAME:"
    echo "$OVERFLOWS" | head -5
    # Extract overflow amounts and check if any exceed threshold
    EXCEEDING=$(echo "$OVERFLOWS" | grep -oE "[0-9]+\\.[0-9]+pt too wide" | sed 's/pt too wide//' | awk -v max="$MAX_OVERFLOW_PT" '$1+0 > max' || true)
    if [ -n "$EXCEEDING" ]; then
      echo "ERROR: Found overflow(s) exceeding ${MAX_OVERFLOW_PT}pt threshold:"
      echo "$EXCEEDING" | while read amount; do
        echo "  - ${amount}pt overflow detected"
      done
      exit 1
    else
      OVERFLOW_COUNT=$(echo "$OVERFLOWS" | wc -l)
      echo "  Found $OVERFLOW_COUNT overflow(s), all within acceptable threshold (<= ${MAX_OVERFLOW_PT}pt)"
    fi
  else
    echo "  ✅ No overflow warnings"
  fi
fi

echo "✅ LaTeX compilation successful"
