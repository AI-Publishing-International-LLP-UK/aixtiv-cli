import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# Create figure and axis
fig, ax = plt.subplots(figsize=(10, 8))

# Define colors
colors = {
    'MOCOA': '#1f77b4',
    'MOCORIX': '#ff7f0e',
    'MOCORIX2': '#2ca02c'
}

# Plot coordinates
x1, y1 = 1, 5
x2, y2 = 7, 5

# Draw arrow
ax.annotate("",
            xy=(x2 + 1, y2 + 1), xycoords='data',
            xytext=(x1 + 1, y1), textcoords='data',
            arrowprops=dict(arrowstyle="->", color='gray', lw=2))

# Titles
ax.text(4, 10, "Coaching 2100 AI Infrastructure Overview", ha='center', fontsize=16, weight='bold')
ax.text(4, 9.5, "MOCOA – MOCORIX – MOCORIX2 Coordination & Workflow", ha='center', fontsize=12, style='italic')

# Legend
legend_elements = [mpatches.Patch(facecolor=colors[name], edgecolor='black', label=name)
                  for name in colors]
ax.legend(handles=legend_elements, loc='lower right', fontsize=10)

plt.tight_layout()
plt.show()

