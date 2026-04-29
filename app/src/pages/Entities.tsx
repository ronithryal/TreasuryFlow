import { useState } from "react";
import { useStore } from "@/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DetailDrawer } from "@/components/shared/DetailDrawer";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ChainBadge } from "@/components/shared/ChainBadge";
import { AccountTypeBadge } from "@/components/shared/AccountTypeBadge";
import { Money } from "@/components/shared/Money";
import { Building2, Plus, Wallet, ChevronRight, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fmtRelative, fmtDateAbs } from "@/lib/format";
import { IS_TESTNET } from "@/web3/mode";
import type { Account, Entity } from "@/types/domain";

export function Entities() {
  if (IS_TESTNET) return <TestnetEntities />;
  return <MockEntities />;
}

// ─── Shared Wallet Components & Dialog ──────────────────────────────────────

function AddWalletDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-card-border">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-bold">Add Assigned Wallet</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground">
            Select a method to provision a new wallet for this entity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* CDP Embedded Wallet Option */}
          <div className="relative group opacity-60 grayscale cursor-not-allowed border border-border rounded-xl p-4 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-bold text-sm">Create Wallet</p>
                  <p className="text-xs text-muted-foreground">Powered by CDP Embedded Wallets</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled
                className="h-7 text-[10px] uppercase font-bold tracking-widest bg-muted/50 border-border opacity-80 cursor-not-allowed"
                title="Coming soon: pending CDP Embedded Wallet enablement."
              >
                Coming Soon
              </Button>
            </div>
          </div>

          {/* Wallet Connect Option */}
          <div className="relative group opacity-60 grayscale cursor-not-allowed border border-border rounded-xl p-4 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-bold text-sm">Bring Wallet</p>
                  <p className="text-xs text-muted-foreground">Via Wallet Connect</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled
                className="h-7 text-[10px] uppercase font-bold tracking-widest bg-muted/50 border-border opacity-80 cursor-not-allowed"
                title="Coming soon: pending CDP Embedded Wallet enablement."
              >
                Coming Soon
              </Button>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pb-1">
          Coming soon: pending CDP Embedded Wallet enablement.
        </p>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WalletDetailDrawer({ 
  wallet, 
  onClose, 
  entities, 
  policies, 
  ledger 
}: { 
  wallet: Account | null, 
  onClose: () => void,
  entities: Entity[],
  policies: any[],
  ledger: any[]
}) {
  if (!wallet) return null;

  const entityName = (id: string) => entities.find((e) => e.id === id)?.name ?? id;
  const relatedPolicies = (acc: Account) =>
    policies.filter((p) => p.sourceAccountIds.includes(acc.id) || p.destinationAccountIds.includes(acc.id));
  const recentActivity = (acc: Account) =>
    [...ledger.filter((l) => l.accountId === acc.id)]
      .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))
      .slice(0, 5);

  return (
    <DetailDrawer
      open={true}
      onOpenChange={(v) => !v && onClose()}
      title={wallet.name}
      description={`${wallet.accountType.replace(/_/g, " ")} · ${wallet.chain} · ${entityName(wallet.entityId)}`}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Balance</span>
            <p className="mt-0.5 text-lg font-semibold"><Money amount={wallet.balance} asset={wallet.asset} /></p>
          </div>
          <div>
            <span className="text-muted-foreground">Available</span>
            <p className="mt-0.5 text-lg font-semibold"><Money amount={wallet.availableBalance} asset={wallet.asset} /></p>
          </div>
          <div>
            <span className="text-muted-foreground">Type</span>
            <p className="mt-0.5"><AccountTypeBadge type={wallet.accountType} /></p>
          </div>
          <div>
            <span className="text-muted-foreground">Chain</span>
            <p className="mt-0.5"><ChainBadge chain={wallet.chain} /></p>
          </div>
          <div>
            <span className="text-muted-foreground">Settlement rail</span>
            <p className="mt-0.5 font-medium capitalize">{wallet.settlementRail}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <p className="mt-0.5"><StatusBadge status={wallet.status} /></p>
          </div>
          <div>
            <span className="text-muted-foreground">Entity</span>
            <p className="mt-0.5 font-medium">{entityName(wallet.entityId)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Last updated</span>
            <p className="mt-0.5 font-medium">{fmtDateAbs(wallet.lastUpdated)}</p>
          </div>
          {wallet.targetBand && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Target band</span>
              <p className="mt-0.5 font-medium">${wallet.targetBand.min.toLocaleString()} – ${wallet.targetBand.max.toLocaleString()}</p>
            </div>
          )}
        </div>

        {relatedPolicies(wallet).length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Related policies</h3>
            {relatedPolicies(wallet).map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-card-border py-2 text-xs last:border-0">
                <span className="font-medium">{p.name}</span>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}

        {recentActivity(wallet).length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent activity</h3>
            {recentActivity(wallet).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between border-b border-card-border py-2 text-xs last:border-0">
                <div>
                  <p className="font-medium">{entry.purpose ?? entry.direction}</p>
                  <p className="text-muted-foreground">{fmtRelative(entry.effectiveAt)}</p>
                </div>
                <Money amount={entry.amount} asset={entry.asset} signed={entry.direction === "outflow"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </DetailDrawer>
  );
}

// ─── Mock variant ────────────────────────────────────────────────────────────

function MockEntities() {
  const entities = useStore((s) => s.entities);
  const accounts = useStore((s) => s.accounts);
  const policies = useStore((s) => s.policies);
  const ledger = useStore((s) => s.ledger);
  
  const [selectedWallet, setSelectedWallet] = useState<Account | null>(null);
  const [addWalletOpen, setAddWalletOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Managed Legal Entities</h2>
        <Button size="sm" className="h-8 gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Add Entity
        </Button>
      </div>

      <div id="entities-list" data-tour="entities-list" className="grid gap-4">
        {entities.map(entity => {
          const entityAccounts = accounts.filter(a => a.entityId === entity.id);
          const entityBalance = entityAccounts.reduce((sum, a) => sum + a.balance, 0);

          return (
            <Card key={entity.id} className="overflow-hidden group hover:border-primary/50 transition-all">
              <div className="flex flex-col md:flex-row">
                <div className="p-6 md:w-1/3 border-b md:border-b-0 md:border-r border-border bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary mb-4">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">
                      {entity.id.includes("us") ? "US Domestic" : "International"}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold">{entity.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Tax ID: {entity.id.toUpperCase()}-XXXXX</p>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total Entity Value</span>
                      <span className="font-bold"><Money amount={entityBalance} /></span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Active Wallets</span>
                      <span className="font-medium flex items-center gap-1">
                        <Wallet className="h-3 w-3" /> {entityAccounts.length}
                      </span>
                    </div>

                    {entityBalance === 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-4 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 gap-2 text-[10px] uppercase font-bold tracking-widest"
                        onClick={() => setAddWalletOpen(true)}
                      >
                        <Plus className="h-3 w-3" /> Provision CDP Wallet
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-6 space-y-4 bg-card">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Assigned Wallets</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={() => setAddWalletOpen(true)}
                      title="Add wallet"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    {entityAccounts.map(acc => (
                      <div 
                        key={acc.id} 
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer group/row"
                        onClick={() => setSelectedWallet(acc)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                            <Wallet className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{acc.name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground uppercase">{acc.chain} · {acc.asset}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-bold"><Money amount={acc.balance} asset={acc.asset} /></p>
                            <p className="text-[10px] text-muted-foreground">Balance</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover/row:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary">
                    View All Assets & Controls
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <WalletDetailDrawer 
        wallet={selectedWallet} 
        onClose={() => setSelectedWallet(null)} 
        entities={entities}
        policies={policies}
        ledger={ledger}
      />
      
      <AddWalletDialog open={addWalletOpen} onOpenChange={setAddWalletOpen} />
    </div>
  );
}

// ─── Testnet variant ─────────────────────────────────────────────────────────

function TestnetEntities() {
  const entities = useStore((s) => s.entities);
  const accounts = useStore((s) => s.accounts);
  const policies = useStore((s) => s.policies);
  const ledger = useStore((s) => s.ledger);
  const [selectedWallet, setSelectedWallet] = useState<Account | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [addWalletOpen, setAddWalletOpen] = useState(false);

  const selectedEntityAccounts = selectedEntity
    ? accounts.filter((a) => a.entityId === selectedEntity.id)
    : [];
  const selectedEntityBalance = selectedEntityAccounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Managed Legal Entities</h2>
        <Button size="sm" className="h-8 gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Add Entity
        </Button>
      </div>

      <div id="entities-list" data-tour="entities-list" className="grid gap-4">
        {entities.map(entity => {
          const entityAccounts = accounts.filter(a => a.entityId === entity.id);
          const entityBalance = entityAccounts.reduce((sum, a) => sum + a.balance, 0);

          return (
            <Card key={entity.id} className="overflow-hidden group hover:border-primary/50 transition-all">
              <div className="flex flex-col md:flex-row">
                {/* Left panel — click to open entity detail */}
                <div
                  className="p-6 md:w-1/3 border-b md:border-b-0 md:border-r border-border bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setSelectedEntity(entity)}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary mb-4">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">
                      {entity.id.includes("us") ? "US Domestic" : "International"}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold">{entity.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Tax ID: {entity.id.toUpperCase()}-XXXXX</p>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total Entity Value</span>
                      <span className="font-bold"><Money amount={entityBalance} /></span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Active Wallets</span>
                      <span className="font-medium flex items-center gap-1">
                        <Wallet className="h-3 w-3" /> {entityAccounts.length}
                      </span>
                    </div>

                    {entityBalance === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-4 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 gap-2 text-[10px] uppercase font-bold tracking-widest"
                        onClick={(e) => { e.stopPropagation(); setAddWalletOpen(true); }}
                      >
                        <Plus className="h-3 w-3" /> Provision CDP Wallet
                      </Button>
                    )}
                  </div>
                </div>

                {/* Right panel — assigned wallets */}
                <div className="flex-1 p-6 space-y-4 bg-card">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Assigned Wallets</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={() => setAddWalletOpen(true)}
                      title="Add wallet"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    {entityAccounts.map(acc => (
                      <div
                        key={acc.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer group/row"
                        onClick={() => setSelectedWallet(acc)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                            <Wallet className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{acc.name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground uppercase">{acc.chain} · {acc.asset}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-bold"><Money amount={acc.balance} asset={acc.asset} /></p>
                            <p className="text-[10px] text-muted-foreground">Balance</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover/row:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary">
                    View All Assets & Controls
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <WalletDetailDrawer 
        wallet={selectedWallet} 
        onClose={() => setSelectedWallet(null)} 
        entities={entities}
        policies={policies}
        ledger={ledger}
      />

      {/* Entity Detail Drawer */}
      {selectedEntity && (
        <DetailDrawer
          open={true}
          onOpenChange={(v) => !v && setSelectedEntity(null)}
          title={selectedEntity.name}
          description={`${selectedEntity.id.includes("us") ? "US Domestic" : "International"} · ${selectedEntity.jurisdiction}`}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Total Value</span>
                <p className="mt-0.5 text-lg font-semibold"><Money amount={selectedEntityBalance} /></p>
              </div>
              <div>
                <span className="text-muted-foreground">Active Wallets</span>
                <p className="mt-0.5 text-lg font-semibold">{selectedEntityAccounts.length}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tax ID</span>
                <p className="mt-0.5 font-medium">{selectedEntity.id.toUpperCase()}-XXXXX</p>
              </div>
              <div>
                <span className="text-muted-foreground">Jurisdiction</span>
                <p className="mt-0.5 font-medium capitalize">{selectedEntity.jurisdiction}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Entity type</span>
                <p className="mt-0.5">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">
                    {selectedEntity.id.includes("us") ? "US Domestic" : "International"}
                  </Badge>
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Assigned Wallets</h3>
              {selectedEntityAccounts.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">No wallets assigned to this entity.</p>
              )}
              {selectedEntityAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between border-b border-card-border py-3 text-xs last:border-0 cursor-pointer hover:bg-muted/20 rounded-md px-2 transition-colors"
                  onClick={() => {
                    setSelectedEntity(null);
                    setTimeout(() => setSelectedWallet(acc), 200);
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-muted-foreground font-mono uppercase text-[10px]">{acc.chain} · {acc.asset}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold"><Money amount={acc.balance} asset={acc.asset} /></p>
                      <StatusBadge status={acc.status} />
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DetailDrawer>
      )}

      <AddWalletDialog open={addWalletOpen} onOpenChange={setAddWalletOpen} />
    </div>
  );
}
