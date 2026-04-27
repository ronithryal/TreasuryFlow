import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export function fmtMoney(amount: number, asset: "USDC" | "USD" = "USDC", opts?: { compact?: boolean; sign?: boolean }) {
  const sign = opts?.sign && amount > 0 ? "+" : "";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: opts?.compact ? "compact" : "standard",
    minimumFractionDigits: opts?.compact ? 0 : 2,
    maximumFractionDigits: opts?.compact ? 1 : 2,
  });
  const formatted = formatter.format(amount).replace("$", "$");
  return asset === "USDC" ? `${sign}${formatted} USDC` : `${sign}${formatted}`;
}

export function fmtAmountOnly(amount: number, opts?: { compact?: boolean }) {
  return new Intl.NumberFormat("en-US", {
    notation: opts?.compact ? "compact" : "standard",
    minimumFractionDigits: opts?.compact ? 0 : 2,
    maximumFractionDigits: opts?.compact ? 1 : 2,
  }).format(amount);
}

export function fmtPercent(num: number, denom: number) {
  if (denom === 0) return "0%";
  return `${Math.round((num / denom) * 100)}%`;
}

export function fmtDateAbs(iso: string) {
  return dayjs(iso).format("MMM D, YYYY · h:mm A");
}

export function fmtDateShort(iso: string) {
  return dayjs(iso).format("MMM D");
}

export function fmtRelative(iso: string) {
  return dayjs(iso).fromNow();
}

export function fmtTitle(s: string) {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
