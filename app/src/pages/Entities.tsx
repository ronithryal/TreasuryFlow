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
import { useLocation } from "wouter";
import { IS_TESTNET } from "@/web3/mode";
import type { Account, Entity } from "@/types/domain";

export function Entities() {
  if (IS_TESTNET) return <TestnetEntities />;
  return <MockEntities />;
}

// ─── Mock variant — original layout, no detail drawers ───────────────────────

function MockEntities() {
  const entities = useStore((s) => s.entities);
  const accounts = useStore((s) => s.accounts);

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
                      <Button variant="outline" size="sm" className="w-full mt-4 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 gap-2 text-[10px] uppercase font-bold tracking-widest">
                        <Plus className="h-3 w-3" /> Provision CDP Wallet
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-6 space-y-4 bg-card">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Assigned Wallets</h4>
                  <div className="grid gap-2">
                    {entityAccounts.map(acc => (
                      <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer group/row">
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
    </div>
  );
}

// ─── Testnet variant — wallet/entity detail drawers + add-wallet dialog ───────

function TestnetEntities() {
  const entities = useStore((s) => s.entities);
  const accounts = useStore((s) => s.accounts);
  const policies = useStore((s) => s.policies);
  const ledger = useStore((s) => s.ledger);
  const [, navigate] = useLocation();

  const [selectedWallet, setSelectedWallet] = useState<Account | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [addWalletOpen, setAddWalletOpen] = useState(false);

  const entityName = (id: string) => entities.find((e) => e.id === id)?.name ?? id;
  const relatedPolicies = (acc: Account) =>
    policies.filter((p) => p.sourceAccountIds.includes(acc.id) || p.destinationAccountIds.includes(acc.id));
  const recentActivity = (acc: Account) =>
    [...ledger.filter((l) => l.accountId === acc.id)]
      .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))
      .slice(0, 5);

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
                        onClick={(e) => e.stopPropagation()}
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

      {/* Wallet Detail Drawer — same layout as Accounts page */}
      {selectedWallet && (
        <DetailDrawer
          open={true}
          onOpenChange={(v) => !v && setSelectedWallet(null)}
          title={selectedWallet.name}
          description={`${selectedWallet.accountType.replace(/_/g, " ")} · ${selectedWallet.chain} · ${entityName(selectedWallet.entityId)}`}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Balance</span>
                <p className="mt-0.5 text-lg font-semibold"><Money amount={selectedWallet.balance} asset={selectedWallet.asset} /></p>
              </div>
              <div>
                <span className="text-muted-foreground">Available</span>
                <p className="mt-0.5 text-lg font-semibold"><Money amount={selectedWallet.availableBalance} asset={selectedWallet.asset} /></p>
              </div>
              <div>
                <span className="text-muted-foreground">Type</span>
                <p className="mt-0.5"><AccountTypeBadge type={selectedWallet.accountType} /></p>
              </div>
              <div>
                <span className="text-muted-foreground">Chain</span>
                <p className="mt-0.5"><ChainBadge chain={selectedWallet.chain} /></p>
              </div>
              <div>
                <span className="text-muted-foreground">Settlement rail</span>
                <p className="mt-0.5 font-medium capitalize">{selectedWallet.settlementRail}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className="mt-0.5"><StatusBadge status={selectedWallet.status} /></p>
              </div>
              <div>
                <span className="text-muted-foreground">Entity</span>
                <p className="mt-0.5 font-medium">{entityName(selectedWallet.entityId)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last updated</span>
                <p className="mt-0.5 font-medium">{fmtDateAbs(selectedWallet.lastUpdated)}</p>
              </div>
              {selectedWallet.targetBand && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Target band</span>
                  <p className="mt-0.5 font-medium">${selectedWallet.targetBand.min.toLocaleString()} – ${selectedWallet.targetBand.max.toLocaleString()}</p>
                </div>
              )}
            </div>

            {relatedPolicies(selectedWallet).length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Related policies</h3>
                {relatedPolicies(selectedWallet).map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b border-card-border py-2 text-xs last:border-0">
                    <span className="font-medium">{p.name}</span>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}

            {recentActivity(selectedWallet).length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent activity</h3>
                {recentActivity(selectedWallet).map((entry) => (
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
      )}

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

      {/* Add Wallet — Coming Soon Dialog */}
      <Dialog open={addWalletOpen} onOpenChange={setAddWalletOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                <Zap className="h-5 w-5" />
              </div>
              <DialogTitle>Add Wallet</DialogTitle>
            </div>
            <DialogDescription>
              Embedded wallets and Wallet Connect are coming soon.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We're building seamless wallet provisioning directly within TreasuryFlow — including embedded wallets for instant setup and WalletConnect support for your existing hardware and software signers.
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddWalletOpen(false)}>Close</Button>
            <Button
              size="sm"
              onClick={() => { setAddWalletOpen(false); navigate("/roadmap"); }}
            >
              Learn More
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
