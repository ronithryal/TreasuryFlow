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

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { currentUserId, users, setCurrentUser } = useStore((s) => ({
    currentUserId: s.currentUserId,
    users: s.users,
    setCurrentUser: s.setCurrentUser,
  }));
  const currentUser = users.find((u) => u.id === currentUserId);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="min-w-0">
        <h1 className="text-base font-semibold leading-tight text-foreground">{title}</h1>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        {/* Web3Modal button */}
        {/* @ts-expect-error custom element */}
        <w3m-button />
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
