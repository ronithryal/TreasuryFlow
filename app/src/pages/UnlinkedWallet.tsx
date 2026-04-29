import React, { useState } from "react";
import { useStore } from "@/store";
import { useAccount } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { web3Modal } from "@/web3/Web3Provider";
import { useLocation } from "wouter";
import { 
  ShieldAlert, 
  Building2, 
  Link as LinkIcon, 
  ArrowRight, 
  Wallet,
  CheckCircle2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { EntityId } from "@/types/domain";

export function UnlinkedWallet() {
  const { isConnected, address } = useAccount();
  const modalHook = useWeb3Modal();
  const [, setLocation] = useLocation();

  const handleOpenModal = () => {
    if (modalHook && typeof modalHook.open === 'function') {
      modalHook.open();
    } else if (web3Modal && typeof web3Modal.open === 'function') {
      web3Modal.open();
    }
  };
  
  const entities = useStore((s) => s.entities);
  const accounts = useStore((s) => s.accounts);
  const linkAccount = useStore((s) => s.linkAccount);
  
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [isLinking, setIsLinking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // If already linked, redirect to the account page.
  // If disconnected, redirect to home.
  React.useEffect(() => {
    if (!isConnected) {
      setLocation("/");
      return;
    }
    if (address) {
      const match = accounts.find(a => a.address?.toLowerCase() === address.toLowerCase());
      if (match) {
        setLocation(`/accounts?id=${match.id}`);
      }
    }
  }, [isConnected, address, accounts, setLocation]);

  const handleLink = async () => {
    if (!address || !selectedEntityId) return;
    
    setIsLinking(true);
    // Simulate some "onchain" indexing delay
    await new Promise(r => setTimeout(r, 800));
    
    const entityName = entities.find(e => e.id === selectedEntityId)?.name ?? "New Entity";
    const accountId = linkAccount(address, selectedEntityId as EntityId, `${entityName} Wallet`);
    
    setIsSuccess(true);
    setIsLinking(false);
    
    // Redirect after showing success
    setTimeout(() => {
      setLocation(`/accounts?id=${accountId}`);
    }, 2000);
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <Card className="max-w-md w-full shadow-2xl border-primary/20 bg-background/95 backdrop-blur-xl animate-in fade-in zoom-in duration-500">
        {!isConnected ? (
          <>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto p-3 rounded-2xl bg-primary/10 text-primary w-fit mb-4">
                <Wallet className="h-10 w-10" />
              </div>
              <CardTitle className="text-2xl font-bold">Connect Your Treasury</CardTitle>
              <p className="text-sm text-muted-foreground mt-2 px-4">
                Bring your own wallet to enable autonomous policies, onchain approvals, and forensic audit trails.
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <Button 
                onClick={handleOpenModal} 
                size="lg" 
                className="w-full h-14 text-lg font-bold gap-3 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
              >
                <Wallet className="h-5 w-5" />
                Bring Wallet
              </Button>
            </CardContent>
            <CardFooter className="justify-center border-t bg-muted/30 p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Supported: Base Sepolia Testnet
              </p>
            </CardFooter>
          </>
        ) : isSuccess ? (
          <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-chart-5/20 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="h-10 w-10 text-chart-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Wallet Linked!</h2>
              <p className="text-sm text-muted-foreground">Redirecting to your new treasury dashboard...</p>
            </div>
          </CardContent>
        ) : (
          <>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <Badge variant="outline" className="font-mono text-[10px] uppercase">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </Badge>
              </div>
              <CardTitle className="text-2xl font-bold">Sovereign Wallet Detected</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                This address is not yet registered in the TreasuryFlow ecosystem.
              </p>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                    Select Legal Entity to Link
                  </label>
                  <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                    <SelectTrigger className="h-12 border-primary/20 bg-muted/20">
                      <SelectValue placeholder="Choose an existing entity..." />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {e.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50 italic">
                  "To enable non-custodial governance and AI policies for this wallet, please link it to an existing legal entity. If this wallet belongs to a new entity, please complete organizational setup first."
                </p>
              </div>

              <Button 
                onClick={handleLink} 
                disabled={!selectedEntityId || isLinking}
                className="w-full h-12 gap-2 text-sm font-bold shadow-lg shadow-primary/10"
              >
                {isLinking ? (
                  "Registering onchain..."
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4" />
                    Link Wallet to Entity
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </>
                )}
              </Button>
            </CardContent>
            <CardFooter className="flex-col gap-3 border-t bg-muted/30 p-4">
              <Button variant="link" size="sm" onClick={() => setLocation("/")} className="text-xs text-muted-foreground h-auto p-0">
                Cancel and return to Overview
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
