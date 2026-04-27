import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/cn";

export interface FilterDef<TValue extends string = string> {
  id: string;
  label: string;
  options: { value: TValue; label: string }[];
}

export function FilterBar({
  search,
  onSearch,
  filters,
  values,
  onChange,
  onClear,
  className,
  rightSlot,
}: {
  search?: string;
  onSearch?: (v: string) => void;
  filters?: FilterDef[];
  values?: Record<string, string>;
  onChange?: (id: string, value: string) => void;
  onClear?: () => void;
  className?: string;
  rightSlot?: React.ReactNode;
}) {
  const hasActive =
    (search && search.length > 0) ||
    (values && Object.values(values).some((v) => v && v !== "all"));
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {onSearch && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search…"
            className="h-8 w-[220px] pl-7"
            value={search ?? ""}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      )}
      {filters?.map((f) => (
        <Select key={f.id} value={values?.[f.id] ?? "all"} onValueChange={(v) => onChange?.(f.id, v)}>
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder={f.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {f.label.toLowerCase()}</SelectItem>
            {f.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {hasActive && onClear ? (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-8 text-xs">
          <X className="h-3 w-3" />
          Clear
        </Button>
      ) : null}
      {rightSlot ? <div className="ml-auto flex items-center gap-2">{rightSlot}</div> : null}
    </div>
  );
}
