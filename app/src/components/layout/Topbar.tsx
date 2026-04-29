import { useStore } from "@/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, User } from "lucide-react";
import type { UserId } from "@/types/domain";
import { useAccount, useDisconnect } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { web3Modal } from "@/web3/Web3Provider";


export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { currentUserId, users, setCurrentUser } = useStore((s) => ({
    currentUserId: s.currentUserId,
    users: s.users,
    setCurrentUser: s.setCurrentUser,
  }));
  const currentUser = users.find((u) => u.id === currentUserId);
  
  const { isConnected, address } = useAccount();
  const modalHook = useWeb3Modal();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    // Priority 1: Use the hook's open function
    if (modalHook && typeof modalHook.open === 'function') {
      modalHook.open();
    } 
    // Priority 2: Use the exported instance's open function (fallback for hook issues)
    else if (web3Modal && typeof web3Modal.open === 'function') {
      web3Modal.open();
    }
    else {
      console.error("Web3Modal initialization failed - both hook and instance are unavailable");
    }
  };

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="min-w-0">
        <h1 className="text-base font-semibold leading-tight text-foreground">{title}</h1>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        {/* Web3Modal button */}
        <div id="wallet-status" data-tour="wallet-status">
          {isConnected && address ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10">
                  <div className="h-2 w-2 rounded-full bg-chart-5" />
                  <span className="text-xs font-mono">{shortenAddress(address)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Connected Wallet</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => handleConnect()}>
                  Wallet Details
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => disconnect()} className="text-destructive">
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              size="sm" 
              onClick={() => handleConnect()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
            >
              Connect Wallet
            </Button>
          )}
        </div>
        {/* User switcher (maker-checker demo) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span className="max-w-[120px] truncate text-xs">{currentUser?.name ?? "Unknown"}</span>
              <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                {currentUser?.role}
              </span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Switch user (maker-checker)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {users.map((u) => (
                <DropdownMenuItem
                  key={u.id}
                  onSelect={() => setCurrentUser(u.id as UserId)}
                  className={u.id === currentUserId ? "bg-accent" : ""}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{u.name}</span>
                    <span className="text-xs text-muted-foreground">{u.role} · {u.email}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
