#!/usr/bin/env python3
"""
Generate Matching Algorithm FSM diagrams using python-statemachine library.
Split into three focused FSMs for clarity: Matching, Request, and Viewing.
Exports PDF files for inclusion in LaTeX document.
"""

from statemachine import StateMachine, State

class MatchingFSM(StateMachine):
    """Matching FSM - Handles match discovery, filtering, scoring, and ranking."""
    
    idle = State("Idle", initial=True)
    searching = State("Searching for Matches")
    applying_constraints = State("Applying Hard Constraints")
    scoring = State("Scoring Compatibility")
    filtering_ranking = State("Filtering and Ranking")
    matches_ready = State("Matches Ready", final=True)
    no_matches = State("No Matches Found", final=True)
    
    # Main flow transitions
    start_search = idle.to(searching)
    apply_filters = searching.to(applying_constraints)
    compute_scores = applying_constraints.to(scoring)
    filter_and_rank = scoring.to(filtering_ranking)
    results_ready = filtering_ranking.to(matches_ready)
    no_results = (applying_constraints.to(no_matches) | 
                  filtering_ranking.to(no_matches))


class RequestFSM(StateMachine):
    """Request FSM - Handles ride request lifecycle."""
    
    idle = State("Idle", initial=True)
    requesting = State("Requesting Ride")
    pending = State("Pending Request")
    accepted = State("Accepted Request")
    confirmed = State("Confirmed Match", final=True)
    cancelled = State("Cancelled Request", final=True)
    
    # Main flow transitions
    create_request = idle.to(requesting)
    create_pending = requesting.to(pending)
    accept = pending.to(accepted)
    confirm = accepted.to(confirmed)
    cancel = (pending.to(cancelled) | 
              accepted.to(cancelled))


class ViewingFSM(StateMachine):
    """Viewing FSM - Handles viewing confirmed matches."""
    
    idle = State("Idle", initial=True)
    viewing = State("Viewing Matches", final=True)
    
    # Simple transition
    start_viewing = idle.to(viewing)


def generate_fsm_diagrams():
    """Generate and save all FSM diagrams as PDFs."""
    
    fsms = [
        (MatchingFSM, 'matching_fsm.pdf', 'Matching FSM'),
        (RequestFSM, 'request_fsm.pdf', 'Request FSM'),
        (ViewingFSM, 'viewing_fsm.pdf', 'Viewing FSM'),
    ]
    
    for fsm_class, output_file, name in fsms:
        try:
            sm = fsm_class()
            graph = sm._graph()
            graph.write_pdf(output_file)
            print(f"Generated: {output_file} ({name})")
        except Exception as e:
            print(f"Error generating {output_file}: {e}")
            # Fallback to PNG if PDF fails
            try:
                graph.write_png(output_file.replace('.pdf', '.png'))
                print(f"Generated PNG instead: {output_file.replace('.pdf', '.png')}")
            except Exception as e2:
                print(f"PNG generation also failed: {e2}")


if __name__ == '__main__':
    print("Generating Matching Algorithm FSM diagrams (split into 3 focused machines)...")
    generate_fsm_diagrams()
    print("FSM diagram generation complete!")
