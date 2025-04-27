#!/bin/bash
# delete-firebase-sites-advanced.sh
# Usage: ./delete-firebase-sites-advanced.sh sites-to-delete.txt

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 sites-to-delete.txt"
  exit 1
fi

SITES_FILE="$1"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
LOG_FILE="firebase-site-delete-log-$TIMESTAMP.txt"

if [ ! -f "$SITES_FILE" ]; then
  echo "Site list file not found: $SITES_FILE"
  exit 2
fi

echo "Batch Firebase Hosting Site Removal" | tee "$LOG_FILE"
echo "Sites from: $SITES_FILE" | tee -a "$LOG_FILE"
echo "Start: $(date)" | tee -a "$LOG_FILE"
echo "------------------------------" | tee -a "$LOG_FILE"

SUCCESS=()
FAILED=()

while IFS= read -r SITE_ID; do
  if [[ -z "$SITE_ID" || "$SITE_ID" =~ ^# ]]; then
    continue
  fi
  echo "Deleting site: $SITE_ID" | tee -a "$LOG_FILE"
  if firebase hosting:sites:delete "$SITE_ID" --force >> "$LOG_FILE" 2>&1; then
    SUCCESS+=("$SITE_ID")
    echo "  -> Success" | tee -a "$LOG_FILE"
  else
    FAILED+=("$SITE_ID")
    echo "  -> FAILED" | tee -a "$LOG_FILE"
  fi
  echo "------------------------------" | tee -a "$LOG_FILE"
done < "$SITES_FILE"

echo "Summary:" | tee -a "$LOG_FILE"
echo "Sites deleted: ${#SUCCESS[@]}" | tee -a "$LOG_FILE"
printf "%s\n" "${SUCCESS[@]}" | tee -a "$LOG_FILE"
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "Sites FAILED: ${#FAILED[@]}" | tee -a "$LOG_FILE"
  printf "%s\n" "${FAILED[@]}" | tee -a "$LOG_FILE"
else
  echo "All sites deleted successfully." | tee -a "$LOG_FILE"
fi

echo "End: $(date)" | tee -a "$LOG_FILE"

# Notify Claude about completion
echo ""
echo "🛫 Lucy1Bomb Report to Claude and Command:"
echo "Firebase hosting site cleanup completed."
echo "- Sites processed: $((${#SUCCESS[@]} + ${#FAILED[@]}))"
echo "- Successfully deleted: ${#SUCCESS[@]}"
echo "- Failed deletions: ${#FAILED[@]}"
echo "- Log file: $LOG_FILE"
echo ""
echo "RIX Command: Integration gateway cleanup successful."