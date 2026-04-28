import { useEffect } from "react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { useStore } from "@/store";
import { IS_TESTNET } from "./mode";
import { MOCK_USDC_ABI, MOCK_USDC_ADDRESS, TESTNET_CONFIGURED, formatUsdc } from "./testnet";

/**
 * Hook the testnet demo into the connected wallet:
 *   1. On connect → call store.hydrateTestnet(addr) once.
 *   2. Read native ETH + Mock USDC balances and push them into the store.
 *
 * No-ops in mock mode (IS_TESTNET=false), so it's safe to mount once at the
 * App root regardless of build target.
 */
export function useTestnetHydration() {
  const { address, isConnected } = useAccount();
  const hydratedAddress = useStore((s) => s.testnet.connectedAddress);
  const hydrate = useStore((s) => s.hydrateTestnet);
  const setBalances = useStore((s) => s.setTestnetBalances);
  const clear = useStore((s) => s.clearTestnet);

  const { data: ethBalance } = useBalance({
    address: IS_TESTNET && isConnected ? address : undefined,
    query: { refetchInterval: 12_000 },
  });

  const { data: usdcRaw, refetch: refetchUsdc } = useReadContract({
    abi: MOCK_USDC_ABI,
    address: MOCK_USDC_ADDRESS,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: IS_TESTNET && TESTNET_CONFIGURED && !!address,
      refetchInterval: 8_000,
    },
  });

  // Bind / unbind the wallet on connect/disconnect.
  useEffect(() => {
    if (!IS_TESTNET) return;
    if (isConnected && address && address !== hydratedAddress) {
      hydrate(address);
    } else if (!isConnected && hydratedAddress) {
      clear();
    }
  }, [IS_TESTNET, isConnected, address, hydratedAddress, hydrate, clear]);

  // Push balance updates into the store.
  useEffect(() => {
    if (!IS_TESTNET || !isConnected) return;
    setBalances({
      eth: ethBalance ? Number(ethBalance.value) / 10 ** ethBalance.decimals : undefined,
      usdc: typeof usdcRaw === "bigint" ? formatUsdc(usdcRaw) : undefined,
    });
  }, [IS_TESTNET, isConnected, ethBalance, usdcRaw, setBalances]);

  return { refetchUsdc };
}
