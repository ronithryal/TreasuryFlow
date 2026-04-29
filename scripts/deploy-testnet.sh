#!/bin/bash

# TreasuryFlow Testnet Deployment Script
# Purpose: Deploy all P0 contracts to Base Sepolia testnet
# Usage: ./scripts/deploy-testnet.sh
# Requirements:
#   - foundry (forge) installed
#   - PRIVATE_KEY env var set (deployer account with Base Sepolia ETH)
#   - ALCHEMY_RPC_URL env var set (or use default Base Sepolia RPC)

set -e

echo "TreasuryFlow Contract Deployment"
echo "================================="
echo ""

# Check prerequisites
if ! command -v forge &> /dev/null; then
    echo "ERROR: foundry not found. Install with: curl -L https://foundry.paradigm.xyz | bash"
    exit 1
fi

if [ -z "$PRIVATE_KEY" ]; then
    echo "ERROR: PRIVATE_KEY not set. Export your deployer private key:"
    echo "  export PRIVATE_KEY=0x..."
    exit 1
fi

echo "Deploying to Base Sepolia..."
echo ""

# Navigate to contracts directory
cd "$(dirname "$0")/../contracts"

# Run forge deployment script
# Note: This runs Deploy.s.sol which should:
#   1. Deploy MockUSDC
#   2. Deploy PolicyEngine
#   3. Deploy LedgerContract
#   4. Deploy TreasuryVault
#   5. Deploy IntentRegistry
#   6. Wire contracts with setIntentRegistry and setAuthorized
#   7. Create 3 demo policies
#   8. Log all 5 addresses

CHAIN_ID=84532  # Base Sepolia testnet
RPC_URL="${ALCHEMY_RPC_URL:-https://base-sepolia.g.alchemy.com/v2/demo}"

echo "Using RPC: $RPC_URL"
echo ""

# Run the deployment script
forge script script/Deploy.s.sol \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    --verify \
    -vvv \
    2>&1 | tee deployment.log

echo ""
echo "Deployment complete!"
echo ""
echo "CONTRACT ADDRESSES:"
echo "=================="
echo ""
echo "Check deployment.log or run:"
echo "  grep -E '(MockUSDC|PolicyEngine|IntentRegistry|TreasuryVault|LedgerContract)' deployment.log"
echo ""
echo "NEXT STEPS:"
echo "==========="
echo "1. Copy the contract addresses from above"
echo "2. Update app/src/web3/testnet.ts with the new addresses"
echo "3. Run the golden path test:"
echo "   cd ../app && npm run dev"
echo "   (then manually test in browser on Base Sepolia)"
echo ""
echo "OPTIONAL:"
echo "==========="
echo "To verify contracts on Basescan, add to forge command:"
echo "  --verify \\
echo "  --etherscan-api-key \\$BASESCAN_API_KEY \\
echo "  --verifier-url https://api.basescan.org"
