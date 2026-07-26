import { formatDistanceToNowStrict, format, parseISO } from "date-fns";

/**
 * Portside — display formatting, defined once.
 *
 * Every screen renders money, quantities and timestamps the same way because
 * they all come through here. Inline `toLocaleString` calls are how a table
 * ends up with "$186,000" in one column and "186000 USD" in the next.
 */

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const plain = new Intl.NumberFormat("en-US");

export const formatValue = (value: number | null) =>
  value === null ? "—" : usd.format(value);

/** For dense table cells: $186,000 -> $186K */
export const formatValueCompact = (value: number | null) =>
  value === null ? "—" : compactUsd.format(value);

export const formatQuantity = (value: number | null) =>
  value === null ? "—" : plain.format(value);

/** "2 hours ago" — what a salesperson actually wants to know. */
export const formatRelative = (iso: string) =>
  `${formatDistanceToNowStrict(parseISO(iso))} ago`;

/** "26 Jul 2026, 14:32" — the precise value, for a tooltip or title attribute. */
export const formatAbsolute = (iso: string) =>
  format(parseISO(iso), "d MMM yyyy, HH:mm");

/** Short form for dense columns: "26 Jul" */
export const formatShortDate = (iso: string) =>
  format(parseISO(iso), "d MMM");
