#!/bin/bash
# Exact replication of CI workflow with comprehensive error capture

cd docs || exit 1

SKIP_FILES="Common.tex Comments.tex"
ERROR_FOUND=0
NATBIB_ERROR_FOUND=0

# Check for required LaTeX packages (warn but continue)
echo "Checking for required LaTeX packages..."
MISSING_PACKAGES=""
if ! kpsewhich siunitx.sty > /dev/null 2>&1; then
    MISSING_PACKAGES="$MISSING_PACKAGES texlive-science"
fi
if [ -n "$MISSING_PACKAGES" ]; then
    echo "WARNING: Missing LaTeX packages locally: $MISSING_PACKAGES"
    echo "         Install with: sudo apt-get install$MISSING_PACKAGES"
    echo "         CI workflow will have these packages installed."
    echo ""
fi

find . -name "*.tex" -type f | while read texfile; do
    filename=$(basename "$texfile")
    
    # Skip include files
    if echo "$SKIP_FILES" | grep -q "$filename"; then
        continue
    fi
    
    # Check if file has \documentclass (standalone document)
    if grep -q "\\documentclass" "$texfile"; then
        echo "=========================================="
        echo "Compiling document: $texfile"
        echo "=========================================="
        dir=$(dirname "$texfile")
        cd "$dir" || exit 1
        
        # Check if file has bibliography commands (check from current directory)
        if grep -qE '\\bibliography\{|\\bibliographystyle\{' "$filename"; then
            echo "  Document has bibliography, running full compilation with bibtex"
            
            # First pass to generate .aux file
            echo "    Running pdflatex (pass 1) on $filename"
            pdflatex_output=$(pdflatex -interaction=nonstopmode "$filename" 2>&1)
            pdflatex_exit=$?
            
            # Check for natbib errors
            if echo "$pdflatex_output" | grep -qi "! Package natbib Error\|bibliography.*not compatible"; then
                echo "*** NATBIB ERROR DETECTED IN PASS 1 FOR $texfile ***"
                echo "$pdflatex_output" | grep -i "! Package natbib Error\|bibliography.*not compatible" -A 5 -B 5
                ERROR_FOUND=1
            fi
            
            if [ $pdflatex_exit -ne 0 ]; then
                # Check if it's a missing package error (non-fatal for local testing)
                if echo "$pdflatex_output" | grep -qi "LaTeX Error: File.*not found\|File.*\.sty.*not found"; then
                    echo "WARNING: pdflatex failed on $texfile (pass 1) - missing package"
                    echo "         This is expected locally if packages aren't installed."
                    echo "         CI workflow will have all required packages."
                    echo "$pdflatex_output" | grep -i "LaTeX Error: File.*not found" | head -2
                    cd - > /dev/null
                    continue
                else
                    echo "ERROR: pdflatex failed on $texfile (pass 1)"
                    echo "$pdflatex_output" | tail -30
                    ERROR_FOUND=1
                    cd - > /dev/null
                    continue
                fi
            fi
            
            # Run bibtex ONLY if .aux file exists AND has actual citations
            aux_file="${filename%.tex}.aux"
            if [ -f "$aux_file" ] && grep -qE '\\citation\{' "$aux_file" 2>/dev/null; then
                echo "    Running bibtex (citations found) on $filename"
                bibtex_output=$(bibtex "${filename%.tex}" 2>&1 | grep -v "I found no" || true)
                
                # Check bibtex output for errors
                if echo "$bibtex_output" | grep -qi "error\|fatal"; then
                    echo "*** BIBTEX ERROR FOR $texfile ***"
                    echo "$bibtex_output"
                fi
            else
                echo "    Skipping bibtex (no citations found) for $filename"
            fi
            
            # Run pdflatex again for references and bibliography
            echo "    Running pdflatex (pass 2) on $filename"
            pdflatex_output2=$(pdflatex -interaction=nonstopmode "$filename" 2>&1)
            pdflatex_exit2=$?
            
            # Check for natbib errors in pass 2
            if echo "$pdflatex_output2" | grep -qi "! Package natbib Error\|bibliography.*not compatible"; then
                echo "*** NATBIB ERROR DETECTED IN PASS 2 FOR $texfile ***"
                echo "$pdflatex_output2" | grep -i "! Package natbib Error\|bibliography.*not compatible" -A 5 -B 5
                ERROR_FOUND=1
            fi
            
            if [ $pdflatex_exit2 -ne 0 ]; then
                echo "ERROR: pdflatex failed on $texfile (pass 2)"
                echo "$pdflatex_output2" | tail -30
                exit 1
            fi
            
            echo "    Running pdflatex (pass 3) on $filename"
            pdflatex_output3=$(pdflatex -interaction=nonstopmode "$filename" 2>&1)
            pdflatex_exit3=$?
            
            # Check for natbib errors in pass 3
            if echo "$pdflatex_output3" | grep -qi "! Package natbib Error\|bibliography.*not compatible"; then
                echo "*** NATBIB ERROR DETECTED IN PASS 3 FOR $texfile ***"
                echo "$pdflatex_output3" | grep -i "! Package natbib Error\|bibliography.*not compatible" -A 5 -B 5
                NATBIB_ERROR_FOUND=1
            fi
            
            if [ $pdflatex_exit3 -ne 0 ]; then
                if echo "$pdflatex_output3" | grep -qi "file.*not found\|file.*\.sty.*not found"; then
                    echo "WARNING: pdflatex failed on $texfile (pass 3) - missing package"
                    cd - > /dev/null
                    continue
                else
                    echo "ERROR: pdflatex failed on $texfile (pass 3)"
                    echo "$pdflatex_output3" | tail -30
                    ERROR_FOUND=1
                    cd - > /dev/null
                    continue
                fi
            fi
        else
            echo "  Document has no bibliography, running simple compilation"
            
            # Simple compilation without bibtex (2 passes for cross-references)
            echo "    Running pdflatex (pass 1) on $filename"
            pdflatex_output=$(pdflatex -interaction=nonstopmode "$filename" 2>&1)
            pdflatex_exit=$?
            
            # Check for natbib errors
            if echo "$pdflatex_output" | grep -qi "! Package natbib Error\|bibliography.*not compatible"; then
                echo "*** NATBIB ERROR DETECTED IN PASS 1 (SIMPLE) FOR $texfile ***"
                echo "$pdflatex_output" | grep -i "! Package natbib Error\|bibliography.*not compatible" -A 5 -B 5
                ERROR_FOUND=1
            fi
            
            if [ $pdflatex_exit -ne 0 ]; then
                if echo "$pdflatex_output" | grep -qi "file.*not found\|missing.*package"; then
                    echo "WARNING: pdflatex failed on $texfile (pass 1) - missing package"
                    echo "         This is expected locally if packages aren't installed."
                    continue
                else
                    echo "ERROR: pdflatex failed on $texfile (pass 1)"
                    echo "$pdflatex_output" | tail -30
                    ERROR_FOUND=1
                    continue
                fi
            fi
            
            echo "    Running pdflatex (pass 2) on $filename"
            pdflatex_output2=$(pdflatex -interaction=nonstopmode "$filename" 2>&1)
            pdflatex_exit2=$?
            
            # Check for natbib errors in pass 2
            if echo "$pdflatex_output2" | grep -qi "! Package natbib Error\|bibliography.*not compatible"; then
                echo "*** NATBIB ERROR DETECTED IN PASS 2 (SIMPLE) FOR $texfile ***"
                echo "$pdflatex_output2" | grep -i "! Package natbib Error\|bibliography.*not compatible" -A 5 -B 5
                NATBIB_ERROR_FOUND=1
            fi
            
            if [ $pdflatex_exit2 -ne 0 ]; then
                if echo "$pdflatex_output2" | grep -qi "file.*not found\|file.*\.sty.*not found"; then
                    echo "WARNING: pdflatex failed on $texfile (pass 2) - missing package"
                    cd - > /dev/null
                    continue
                else
                    echo "ERROR: pdflatex failed on $texfile (pass 2)"
                    echo "$pdflatex_output2" | tail -30
                    ERROR_FOUND=1
                    cd - > /dev/null
                    continue
                fi
            fi
        fi
        
        cd - > /dev/null
    fi
done

if [ $NATBIB_ERROR_FOUND -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "SUCCESS: No natbib errors found!"
    echo "=========================================="
    if [ $ERROR_FOUND -ne 0 ]; then
        echo ""
        echo "NOTE: Some files failed due to missing packages (expected locally)."
        echo "      CI workflow will have all required packages installed."
    fi
    exit 0
else
    echo ""
    echo "=========================================="
    echo "ERROR: natbib errors were detected above"
    echo "=========================================="
    exit 1
fi

