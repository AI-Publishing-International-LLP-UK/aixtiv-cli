#!/bin/bash

# compare_files.sh - A script to properly compare text files
# Handles cases where target may be a file or directory
# Supports side-by-side comparison and provides clear error messages

# Color Constants for Enhanced Output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Display usage information
function show_usage() {
    echo -e "${BLUE}Usage:${NC} $0 <source_file> <target_file_or_directory> [options]"
    echo -e ""
    echo -e "${YELLOW}Description:${NC}"
    echo -e "  Compare two text files or find and compare a file with the same name in a target directory."
    echo -e ""
    echo -e "${YELLOW}Arguments:${NC}"
    echo -e "  ${CYAN}source_file${NC}              The source file to compare"
    echo -e "  ${CYAN}target_file_or_directory${NC} Target file or directory to compare against"
    echo -e ""
    echo -e "${YELLOW}Options:${NC}"
    echo -e "  ${CYAN}-s, --side-by-side${NC}       Show comparison side by side (default)"
    echo -e "  ${CYAN}-u, --unified${NC}            Show unified diff format instead"
    echo -e "  ${CYAN}-h, --help${NC}               Show this help message"
    echo -e ""
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  $0 ./deploy-ci-cttt.sh /path/to/another/deploy-ci-cttt.sh"
    echo -e "  $0 ./deploy-ci-cttt.sh /path/to/directory"
    echo -e "  $0 ./deploy-ci-cttt.sh ./other-file.sh --unified"
    echo -e ""
}

# Function to print error messages
function print_error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

# Function to print info messages
function print_info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Function to print success messages
function print_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Function to check if a file exists and is readable
function check_file() {
    if [ ! -e "$1" ]; then
        print_error "File not found: $1"
        return 1
    elif [ ! -f "$1" ]; then
        print_error "Not a regular file: $1"
        return 1
    elif [ ! -r "$1" ]; then
        print_error "File not readable: $1"
        return 1
    fi
    return 0
}

# Default to side-by-side comparison
DIFF_MODE="--side-by-side"

# Parse command line options
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -s|--side-by-side)
            DIFF_MODE="--side-by-side"
            shift
            ;;
        -u|--unified)
            DIFF_MODE="-u"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            # If both SOURCE_FILE and TARGET are not set, set them
            if [ -z "$SOURCE_FILE" ]; then
                SOURCE_FILE="$1"
            elif [ -z "$TARGET" ]; then
                TARGET="$1"
            else
                print_error "Unknown parameter: $1"
                show_usage
                exit 1
            fi
            shift
            ;;
    esac
done

# Check if required arguments are provided
if [ -z "$SOURCE_FILE" ] || [ -z "$TARGET" ]; then
    print_error "Missing required arguments"
    show_usage
    exit 1
fi

# Resolve source file path
SOURCE_FILE=$(realpath -q "$SOURCE_FILE" 2>/dev/null)
if [ $? -ne 0 ]; then
    SOURCE_FILE=$(readlink -f "$SOURCE_FILE" 2>/dev/null)
    if [ $? -ne 0 ]; then
        SOURCE_FILE=$(cd "$(dirname "$SOURCE_FILE")" && pwd)/$(basename "$SOURCE_FILE")
    fi
fi

# Check if source file exists and is readable
if ! check_file "$SOURCE_FILE"; then
    exit 1
fi

# Process target (file or directory)
if [ -d "$TARGET" ]; then
    # Target is a directory
    SOURCE_BASENAME=$(basename "$SOURCE_FILE")
    TARGET_FILE="$TARGET/$SOURCE_BASENAME"
    print_info "Target is a directory. Looking for '$SOURCE_BASENAME' in '$TARGET'"
else
    # Target is a file (or doesn't exist yet)
    TARGET_FILE="$TARGET"
fi

# Resolve target file path
TARGET_FILE=$(realpath -q "$TARGET_FILE" 2>/dev/null)
if [ $? -ne 0 ]; then
    TARGET_FILE=$(readlink -f "$TARGET_FILE" 2>/dev/null)
    if [ $? -ne 0 ]; then
        TARGET_FILE=$(cd "$(dirname "$TARGET_FILE")" 2>/dev/null && pwd)/$(basename "$TARGET_FILE")
    fi
fi

# Check if target file exists and is readable
if ! check_file "$TARGET_FILE"; then
    exit 1
fi

# Print comparison information
echo -e "${GREEN}=============== File Comparison ===============${NC}"
echo -e "${YELLOW}Source File:${NC} $SOURCE_FILE"
echo -e "${YELLOW}Target File:${NC} $TARGET_FILE"
echo -e "${GREEN}=============================================${NC}"

# Compare the files
if [ "$SOURCE_FILE" = "$TARGET_FILE" ]; then
    print_info "Source and target are the same file."
    exit 0
fi

# Get file information
SOURCE_SIZE=$(wc -l < "$SOURCE_FILE")
TARGET_SIZE=$(wc -l < "$TARGET_FILE")
SOURCE_MD5=$(md5sum "$SOURCE_FILE" 2>/dev/null | cut -d ' ' -f1)
if [ $? -ne 0 ]; then
    SOURCE_MD5=$(md5 -q "$SOURCE_FILE" 2>/dev/null)
fi
TARGET_MD5=$(md5sum "$TARGET_FILE" 2>/dev/null | cut -d ' ' -f1)
if [ $? -ne 0 ]; then
    TARGET_MD5=$(md5 -q "$TARGET_FILE" 2>/dev/null)
fi

echo -e "${YELLOW}Source File Size:${NC} $SOURCE_SIZE lines"
echo -e "${YELLOW}Target File Size:${NC} $TARGET_SIZE lines"

# Quick check if files are identical
if [ "$SOURCE_MD5" = "$TARGET_MD5" ]; then
    print_success "Files are identical (MD5: $SOURCE_MD5)"
    exit 0
fi

echo -e "${BLUE}[DIFF] Showing differences between files:${NC}"
echo ""

# Compare the files using diff
TERMINAL_WIDTH=$(tput cols 2>/dev/null || echo 80)
if [ "$DIFF_MODE" = "--side-by-side" ] && [ $TERMINAL_WIDTH -lt 160 ]; then
    print_info "Terminal width ($TERMINAL_WIDTH) is too small for side-by-side view. Switching to unified diff."
    DIFF_MODE="-u"
fi

# Set color options for diff if supported
if diff --color=auto /dev/null /dev/null &>/dev/null; then
    COLOR_OPTION="--color=always"
else
    COLOR_OPTION=""
fi

# Perform the diff with line numbers
if [ "$DIFF_MODE" = "--side-by-side" ]; then
    diff $COLOR_OPTION $DIFF_MODE --width=$TERMINAL_WIDTH "$SOURCE_FILE" "$TARGET_FILE"
else
    diff $COLOR_OPTION $DIFF_MODE "$SOURCE_FILE" "$TARGET_FILE"
fi

DIFF_EXIT=$?

# Analyze diff result
case $DIFF_EXIT in
    0)
        # Files are identical (should have been caught by MD5 check)
        print_success "Files are identical in content (but may have different metadata)"
        ;;
    1)
        # Files differ
        print_info "Files differ. Review the differences above."
        ;;
    *)
        # Error occurred
        print_error "Error occurred during comparison (exit code: $DIFF_EXIT)"
        exit $DIFF_EXIT
        ;;
esac

echo ""
echo -e "${GREEN}============== Comparison Summary ==============${NC}"
echo -e "${YELLOW}Source MD5:${NC} $SOURCE_MD5"
echo -e "${YELLOW}Target MD5:${NC} $TARGET_MD5"
echo -e "${GREEN}=============================================${NC}"

exit $DIFF_EXIT

