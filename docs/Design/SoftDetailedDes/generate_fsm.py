#!/usr/bin/env python3
"""
Generate FSM diagram for Matching Module using Matplotlib and NetworkX.
Exports as PDF for inclusion in LaTeX document.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
import numpy as np

# Create figure with appropriate size
fig, ax = plt.subplots(1, 1, figsize=(12, 6))
ax.set_xlim(0, 10)
ax.set_ylim(0, 6)
ax.axis('off')

# Define state positions (horizontal flow with ERROR below)
positions = {
    'initial': (1, 4),
    'retrieving': (3, 4),
    'filtering': (5, 4),
    'scoring': (7, 4),
    'ranking': (7, 2),
    'complete': (5, 2),
    'error': (4, 1)
}

# State properties
states = {
    'initial': {'label': 'INITIAL', 'shape': 'doublecircle', 'color': 'lightblue'},
    'retrieving': {'label': 'RETRIEVING\nCANDIDATES', 'shape': 'circle', 'color': 'lightgray'},
    'filtering': {'label': 'FILTERING', 'shape': 'circle', 'color': 'lightgray'},
    'scoring': {'label': 'SCORING', 'shape': 'circle', 'color': 'lightgray'},
    'ranking': {'label': 'RANKING', 'shape': 'circle', 'color': 'lightgray'},
    'complete': {'label': 'COMPLETE', 'shape': 'doublecircle', 'color': 'lightgreen'},
    'error': {'label': 'ERROR', 'shape': 'circle', 'color': 'lightcoral'}
}

# Draw states
state_circles = {}
for state_name, (x, y) in positions.items():
    props = states[state_name]
    radius = 0.4
    
    if props['shape'] == 'doublecircle':
        # Outer circle
        outer = Circle((x, y), radius + 0.05, fill=True, facecolor=props['color'], 
                      edgecolor='black', linewidth=2)
        ax.add_patch(outer)
        # Inner circle
        inner = Circle((x, y), radius, fill=True, facecolor='white', 
                      edgecolor='black', linewidth=1)
        ax.add_patch(inner)
    else:
        circle = Circle((x, y), radius, fill=True, facecolor=props['color'], 
                       edgecolor='black', linewidth=2)
        ax.add_patch(circle)
    
    # Add text label
    ax.text(x, y, props['label'], ha='center', va='center', fontsize=9, 
           weight='bold' if state_name in ['initial', 'complete', 'error'] else 'normal')
    
    state_circles[state_name] = (x, y, radius)

# Define transitions
transitions = [
    ('initial', 'retrieving', 'userId provided', 'solid'),
    ('retrieving', 'filtering', 'candidates found', 'solid'),
    ('retrieving', 'error', 'no candidates', 'dashed'),
    ('filtering', 'scoring', 'filtered exist', 'solid'),
    ('filtering', 'error', 'no valid', 'dashed'),
    ('scoring', 'ranking', 'scores computed', 'solid'),
    ('ranking', 'complete', 'ranking complete', 'solid'),
]

# Draw transitions (arrows)
for from_state, to_state, label, style in transitions:
    x1, y1, r1 = state_circles[from_state]
    x2, y2, r2 = state_circles[to_state]
    
    # Calculate arrow start and end points (on circle edges)
    dx = x2 - x1
    dy = y2 - y1
    dist = np.sqrt(dx**2 + dy**2)
    
    # Start point (on source circle edge)
    start_x = x1 + (dx / dist) * r1
    start_y = y1 + (dy / dist) * r1
    
    # End point (on target circle edge)
    end_x = x2 - (dx / dist) * r2
    end_y = y2 - (dy / dist) * r2
    
    # Draw arrow
    arrow = FancyArrowPatch((start_x, start_y), (end_x, end_y),
                           arrowstyle='->', mutation_scale=20, 
                           linestyle=style, linewidth=1.5, color='black')
    ax.add_patch(arrow)
    
    # Add label
    mid_x = (start_x + end_x) / 2
    mid_y = (start_y + end_y) / 2
    
    # Offset label perpendicular to arrow
    perp_x = -dy / dist * 0.3
    perp_y = dx / dist * 0.3
    
    ax.text(mid_x + perp_x, mid_y + perp_y, label, fontsize=8, 
           ha='center', va='center', bbox=dict(boxstyle='round,pad=0.3', 
           facecolor='white', edgecolor='none', alpha=0.8))

# Save as PDF
output_file = 'matching_fsm.pdf'
plt.tight_layout()
plt.savefig(output_file, format='pdf', bbox_inches='tight', dpi=300)
print(f"FSM diagram generated: {output_file}")
plt.close()
