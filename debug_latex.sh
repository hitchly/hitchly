#!/bin/bash
# Debug script to replicate CI LaTeX compilation workflow

LOG_FILE="/home/swesan/repos/hitchly/.cursor/debug.log"

log_debug() {
    local location="$1"
    local message="$2"
    local data="$3"
    local hypothesis_id="${4:-}"
    local run_id="${5:-run1}"
    
    local log_entry=$(cat <<EOF
{"id":"log_$(date +%s)_$$","timestamp":$(date +%s)000,"location":"$location","message":"$message","data":$data,"sessionId":"debug-session","runId":"$run_id","hypothesisId":"$hypothesis_id"}
EOF
    )
    echo "$log_entry" >> "$LOG_FILE"
}

# Clear log file
> "$LOG_FILE"

log_debug "debug_latex.sh:1" "Starting LaTeX compilation debug" '{"workdir":"docs"}' "A" "run1"

cd docs || exit 1

SKIP_FILES="Common.tex Comments.tex"

find . -name "*.tex" -type f | while read texfile; do
    filename=$(basename "$texfile")
    
    log_debug "debug_latex.sh:find" "Found .tex file" "{\"file\":\"$texfile\",\"filename\":\"$filename\"}" "A" "run1"
    
    # Skip include files
    if echo "$SKIP_FILES" | grep -q "$filename"; then
        log_debug "debug_latex.sh:skip" "Skipping include file" "{\"file\":\"$texfile\"}" "A" "run1"
        continue
    fi
    
    # Check if file has \documentclass (standalone document)
    if grep -q "\\documentclass" "$texfile"; then
        log_debug "debug_latex.sh:compile" "Compiling standalone document" "{\"file\":\"$texfile\"}" "A" "run1"
        echo "Compiling document: $texfile"
        dir=$(dirname "$texfile")
        cd "$dir" || exit 1
        
        log_debug "debug_latex.sh:check_bib" "Checking for bibliography commands" "{\"file\":\"$texfile\"}" "B" "run1"
        
        # Check if file has bibliography commands
        if grep -qE '\\bibliography\{|\\bibliographystyle\{' "$texfile"; then
            log_debug "debug_latex.sh:has_bib" "Document has bibliography commands" "{\"file\":\"$texfile\"}" "B" "run1"
            echo "  Document has bibliography, running full compilation with bibtex"
            
            # First pass to generate .aux file
            echo "    Running pdflatex (pass 1) on $filename"
            log_debug "debug_latex.sh:pdflatex1" "Running pdflatex pass 1" "{\"file\":\"$texfile\",\"filename\":\"$filename\"}" "C" "run1"
            
            pdflatex_output=$(pdflatex -interaction=nonstopmode "$filename" 2>&1)
            pdflatex_exit=$?
            
            log_debug "debug_latex.sh:pdflatex1_result" "pdflatex pass 1 result" "{\"file\":\"$texfile\",\"exit\":$pdflatex_exit,\"output_length\":${#pdflatex_output}}" "C" "run1"
            
            # Check for natbib errors
            if echo "$pdflatex_output" | grep -qi "natbib.*error\|bibliography.*not compatible"; then
                log_debug "debug_latex.sh:natbib_error" "NATBIB ERROR DETECTED" "{\"file\":\"$texfile\",\"error\":\"$(echo "$pdflatex_output" | grep -i 'natbib.*error\|bibliography.*not compatible' | head -1)\"}" "D" "run1"
                echo "ERROR: natbib error detected in $texfile"
                echo "$pdflatex_output" | grep -i "natbib.*error\|bibliography.*not compatible" | head -5
            fi
            
            if [ $pdflatex_exit -ne 0 ]; then
                log_debug "debug_latex.sh:pdflatex1_failed" "pdflatex pass 1 FAILED" "{\"file\":\"$texfile\",\"exit\":$pdflatex_exit}" "C" "run1"
                echo "ERROR: pdflatex failed on $texfile"
                echo "$pdflatex_output" | tail -20
                exit 1
            fi
            
            # Run bibtex ONLY if .aux file exists AND has actual citations
            aux_file="${filename%.tex}.aux"
            if [ -f "$aux_file" ] && grep -qE '\\citation\{' "$aux_file" 2>/dev/null; then
                log_debug "debug_latex.sh:bibtex" "Running bibtex" "{\"file\":\"$texfile\",\"aux_file\":\"$aux_file\"}" "C" "run1"
                echo "    Running bibtex (citations found) on $filename"
                bibtex_output=$(bibtex "${filename%.tex}" 2>&1 | grep -v "I found no" || true)
                log_debug "debug_latex.sh:bibtex_result" "bibtex result" "{\"file\":\"$texfile\",\"output_length\":${#bibtex_output}}" "C" "run1"
            else
                log_debug "debug_latex.sh:skip_bibtex" "Skipping bibtex" "{\"file\":\"$texfile\",\"has_aux\":$([ -f "$aux_file" ] && echo true || echo false)}" "C" "run1"
                echo "    Skipping bibtex (no citations found) for $filename"
            fi
            
            # Run pdflatex again for references and bibliography
            echo "    Running pdflatex (pass 2) on $filename"
            log_debug "debug_latex.sh:pdflatex2" "Running pdflatex pass 2" "{\"file\":\"$texfile\"}" "C" "run1"
            
            pdflatex_output2=$(pdflatex -interaction=nonstopmode "$filename" 2>&1)
            pdflatex_exit2=$?
            
            log_debug "debug_latex.sh:pdflatex2_result" "pdflatex pass 2 result" "{\"file\":\"$texfile\",\"exit\":$pdflatex_exit2}" "C" "run1"
            
            if echo "$pdflatex_output2" | grep -qi "natbib.*error\|bibliography.*not compatible"; then
                log_debug "debug_latex.sh:natbib_error2" "NATBIB ERROR DETECTED in pass 2" "{\"file\":\"$texfile\",\"error\":\"$(echo "$pdflatex_output2" | grep -i 'natbib.*error\|bibliography.*not compatible' | head -1)\"}" "D" "run1"
                echo "ERROR: natbib error detected in pass 2 for $texfile"
                echo "$pdflatex_output2" | grep -i "natbib.*error\|bibliography.*not compatible" | head -5
            fi
            
            if [ $pdflatex_exit2 -ne 0 ]; then
                log_debug "debug_latex.sh:pdflatex2_failed" "pdflatex pass 2 FAILED" "{\"file\":\"$texfile\",\"exit\":$pdflatex_exit2}" "C" "run1"
                echo "ERROR: pdflatex failed on $texfile (pass 2)"
                echo "$pdflatex_output2" | tail -20
                exit 1
            fi
            
            echo "    Running pdflatex (pass 3) on $filename"
            log_debug "debug_latex.sh:pdflatex3" "Running pdflatex pass 3" "{\"file\":\"$texfile\"}" "C" "run1"
            
            pdflatex_output3=$(pdflatex -interaction=nonstopmode "$filename" 2>&1)
            pdflatex_exit3=$?
            
            log_debug "debug_latex.sh:pdflatex3_result" "pdflatex pass 3 result" "{\"file\":\"$texfile\",\"exit\":$pdflatex_exit3}" "C" "run1"
            
            if echo "$pdflatex_output3" | grep -qi "natbib.*error\|bibliography.*not compatible"; then
                log_debug "debug_latex.sh:natbib_error3" "NATBIB ERROR DETECTED in pass 3" "{\"file\":\"$texfile\",\"error\":\"$(echo "$pdflatex_output3" | grep -i 'natbib.*error\|bibliography.*not compatible' | head -1)\"}" "D" "run1"
                echo "ERROR: natbib error detected in pass 3 for $texfile"
                echo "$pdflatex_output3" | grep -i "natbib.*error\|bibliography.*not compatible" | head -5
            fi
            
            if [ $pdflatex_exit3 -ne 0 ]; then
                log_debug "debug_latex.sh:pdflatex3_failed" "pdflatex pass 3 FAILED" "{\"file\":\"$texfile\",\"exit\":$pdflatex_exit3}" "C" "run1"
                echo "ERROR: pdflatex failed on $texfile (pass 3)"
                echo "$pdflatex_output3" | tail -20
                exit 1
            fi
        else
            log_debug "debug_latex.sh:no_bib" "Document has no bibliography commands" "{\"file\":\"$texfile\"}" "B" "run1"
            echo "  Document has no bibliography, running simple compilation"
            
            # Simple compilation without bibtex (2 passes for cross-references)
            echo "    Running pdflatex (pass 1) on $filename"
            log_debug "debug_latex.sh:pdflatex1_simple" "Running pdflatex pass 1 (simple)" "{\"file\":\"$texfile\"}" "C" "run1"
            
            pdflatex_output=$(pdflatex -interaction=nonstopmode "$filename" 2>&1)
            pdflatex_exit=$?
            
            log_debug "debug_latex.sh:pdflatex1_simple_result" "pdflatex pass 1 result (simple)" "{\"file\":\"$texfile\",\"exit\":$pdflatex_exit}" "C" "run1"
            
            if echo "$pdflatex_output" | grep -qi "natbib.*error\|bibliography.*not compatible"; then
                log_debug "debug_latex.sh:natbib_error_simple1" "NATBIB ERROR DETECTED in simple pass 1" "{\"file\":\"$texfile\",\"error\":\"$(echo "$pdflatex_output" | grep -i 'natbib.*error\|bibliography.*not compatible' | head -1)\"}" "D" "run1"
                echo "ERROR: natbib error detected in $texfile"
                echo "$pdflatex_output" | grep -i "natbib.*error\|bibliography.*not compatible" | head -5
            fi
            
            if [ $pdflatex_exit -ne 0 ]; then
                log_debug "debug_latex.sh:pdflatex1_simple_failed" "pdflatex pass 1 FAILED (simple)" "{\"file\":\"$texfile\",\"exit\":$pdflatex_exit}" "C" "run1"
                echo "ERROR: pdflatex failed on $texfile (pass 1)"
                echo "$pdflatex_output" | tail -20
                exit 1
            fi
            
            echo "    Running pdflatex (pass 2) on $filename"
            log_debug "debug_latex.sh:pdflatex2_simple" "Running pdflatex pass 2 (simple)" "{\"file\":\"$texfile\"}" "C" "run1"
            
            pdflatex_output2=$(pdflatex -interaction=nonstopmode "$filename" 2>&1)
            pdflatex_exit2=$?
            
            log_debug "debug_latex.sh:pdflatex2_simple_result" "pdflatex pass 2 result (simple)" "{\"file\":\"$texfile\",\"exit\":$pdflatex_exit2}" "C" "run1"
            
            if echo "$pdflatex_output2" | grep -qi "natbib.*error\|bibliography.*not compatible"; then
                log_debug "debug_latex.sh:natbib_error_simple2" "NATBIB ERROR DETECTED in simple pass 2" "{\"file\":\"$texfile\",\"error\":\"$(echo "$pdflatex_output2" | grep -i 'natbib.*error\|bibliography.*not compatible' | head -1)\"}" "D" "run1"
                echo "ERROR: natbib error detected in pass 2 for $texfile"
                echo "$pdflatex_output2" | grep -i "natbib.*error\|bibliography.*not compatible" | head -5
            fi
            
            if [ $pdflatex_exit2 -ne 0 ]; then
                log_debug "debug_latex.sh:pdflatex2_simple_failed" "pdflatex pass 2 FAILED (simple)" "{\"file\":\"$texfile\",\"exit\":$pdflatex_exit2}" "C" "run1"
                echo "ERROR: pdflatex failed on $texfile (pass 2)"
                echo "$pdflatex_output2" | tail -20
                exit 1
            fi
        fi
        
        cd - > /dev/null
    else
        log_debug "debug_latex.sh:not_standalone" "Skipping include file (no documentclass)" "{\"file\":\"$texfile\"}" "A" "run1"
    fi
done

log_debug "debug_latex.sh:end" "LaTeX compilation debug completed" '{}' "A" "run1"
echo "All LaTeX files compiled successfully!"

