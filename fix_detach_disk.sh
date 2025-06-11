#!/bin/bash

# Find which instance lucy-disk is attached to
echo "Checking which instance lucy-disk is attached to..."
ATTACHED_INSTANCE=$(gcloud compute disks describe lucy-disk --zone us-west1-a --format="value(users[0])" | awk -F'/' '{print $NF}')

if [ -n "$ATTACHED_INSTANCE" ]; then
  echo "Detaching lucy-disk from $ATTACHED_INSTANCE..."
  # Detach the disk using the correct command format
  gcloud compute instances detach-disk $ATTACHED_INSTANCE --disk=lucy-disk --zone=us-west1-a
  
  # Create snapshot
  echo "Creating snapshot of lucy-disk..."
  gcloud compute disks snapshot lucy-disk --snapshot-names=lucy-drift-snapshot --zone=us-west1-a
else
  echo "lucy-disk is not attached to any instance"
  # Create snapshot directly
  echo "Creating snapshot of lucy-disk..."
  gcloud compute disks snapshot lucy-disk --snapshot-names=lucy-drift-snapshot --zone=us-west1-a
fi
