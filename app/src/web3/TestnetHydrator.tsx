import { useEffect } from "react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { useStore } from "@/store";
import { MOCK_USDC_ABI, MOCK_USDC_ADDRESS, TESTNET_CONFIGURED, formatUsdc } from "./testnet";

/**
 * Mounts *only* inside the testnet WagmiProvider tree. Reads the connected
 * wallet's ETH and mUSDC balances and pipes them into the Zustand store.
 * Never rendered in mock mode — see main.tsx.
 */
export function TestnetHydrator() {
  const { address, isConnected } = useAccount();
  const hydratedAddress = useStore((s) => s.testnet.connectedAddress);
  const hydrate = useStore((s) => s.hydrateTestnet);
  const setBalances = useStore((s) => s.setTestnetBalances);
  const clear = useStore((s) => s.clearTestnet);

  const { data: ethBalance } = useBalance({
    address: isConnected ? address : undefined,
    query: { refetchInterval: 12_000 },
  });

  const { data: usdcRaw } = useReadContract({
    abi: MOCK_USDC_ABI,
    address: MOCK_USDC_ADDRESS,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: TESTNET_CONFIGURED && !!address,
      refetchInterval: 8_000,
    },
  });

  useEffect(() => {
    if (isConnected && address && address !== hydratedAddress) {
      hydrate(address);
    } else if (!isConnected && hydratedAddress) {
      clear();
    }
  }, [isConnected, address, hydratedAddress, hydrate, clear]);

  useEffect(() => {
    if (!isConnected) return;
    setBalances({
      eth: ethBalance ? Number(ethBalance.value) / 10 ** ethBalance.decimals : undefined,
      usdc: typeof usdcRaw === "bigint" ? formatUsdc(usdcRaw) : undefined,
    });
  }, [isConnected, ethBalance, usdcRaw, setBalances]);

  return null;
}
