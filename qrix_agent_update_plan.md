# QB Lucy Agent Update Plan

## Current Status

- **SirHand RIX**: Currently in Co-Pilot 01 space (confirmed)
- **QB Lucy/QB Lu**: Currently in Co-Pilot 02 space as a RIX agent

## Requested Changes

1. Replace QB Lucy RIX with QB Lucy QRIX in Co-Pilot 02 space
2. Move QB Lucy RIX to Co-Pilot 03 space

## Implementation Steps

### Step 1: Create QB Lucy QRIX Configuration

Create a new configuration for QB Lucy QRIX by:

1. Using the existing QBLucy configuration as a base
2. Updating it to indicate QRIX status
3. Adding connections to other agents (Grant 02, Burby 01, Sabina 03)

### Step 2: Update Co-Pilot 02 Space

1. Update RIX Command Matrix to replace QB Lu/Lucy with QB Lucy QRIX
2. Update any related configurations pointing to Co-Pilot 02

### Step 3: Configure Co-Pilot 03 Space

1. Create/update configuration for Co-Pilot 03 space
2. Move the existing QB Lucy RIX configuration to this space
3. Update RIX Command Matrix to reflect this change

### Step 4: Verify SirHand RIX Status

1. Confirm SirHand RIX is correctly configured in Co-Pilot 01 space
2. Ensure all references are consistent

## Implementation Files

- `/config/agent-cards/qblucy.json` - Update for QRIX status
- `/config/agent-cards/qblucy_qrix.json` - Create new file
- `/command-matrix/RIX_Command_Matrix_FULL.json` - Update entries
