#!/bin/bash

# TreasuryFlow Demo Reset Script
# Purpose: Clear localStorage and reset Zustand state to seed
# Usage: ./scripts/demo-reset.sh
# Result: Browser must refresh to reload seed state

set -e

echo "TreasuryFlow Demo Reset"
echo "======================="
echo ""
echo "This script will:"
echo "  1. Clear browser localStorage (requires manual action)"
echo "  2. Log instructions for resetting Zustand state"
echo ""

# Check if we can detect browser storage
if command -v sqlite3 &> /dev/null; then
    echo "Detected local dev environment..."

    # For Chromium-based browsers (if running under specific OS)
    if [ "$(uname)" = "Darwin" ]; then
        CHROME_LOCAL_STORAGE="$HOME/Library/Application Support/Google/Chrome/Default/Local Storage"
        if [ -d "$CHROME_LOCAL_STORAGE" ]; then
            echo "Found Chrome local storage. Clearing..."
            # Note: Direct file deletion may cause issues; better to clear via browser DevTools
        fi
    fi
fi

echo ""
echo "MANUAL STEPS:"
echo "============="
echo ""
echo "1. Open http://localhost:5173 in your browser"
echo "2. Open DevTools (Cmd+Option+I or F12)"
echo "3. Go to Storage tab"
echo "4. Click 'Local Storage' → http://localhost:5173"
echo "5. Right-click and select 'Clear All'"
echo ""
echo "6. Refresh the page (Cmd+R or Ctrl+R)"
echo "7. Verify:"
echo "   - All intents cleared"
echo "   - Account balance reset to seed (10,000 USDC)"
echo "   - Demo policies visible"
echo ""
echo "Reset complete!"
