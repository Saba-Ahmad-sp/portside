import { formatDistanceToNowStrict, format, parseISO } from "date-fns";

/**
 * Portside — display formatting, defined once.
 *
 * Every screen renders money, quantities and timestamps the same way because
 * they all come through here. Inline `toLocaleString` calls are how a table
 * ends up with "₹1,86,000" in one column and "186000 INR" in the next.
 *
 * Money is Indian rupees, formatted with the `en-IN` locale so grouping is
 * lakh/crore (₹1,55,00,000) rather than thousands (₹15,500,000). Getting that
 * wrong is immediately obvious to anyone the app is actually for.
 */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Compact form for dense table cells. `en-IN` compact notation is already
 * lakh/crore aware, so ₹1,54,38,000 renders as ₹1.5Cr rather than ₹15M.
 */
const compactInr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const quantity = new Intl.NumberFormat("en-IN");

export const formatValue = (value: number | null) =>
  value === null ? "—" : inr.format(value);

/** For dense table cells: ₹1,54,38,000 -> ₹1.5Cr */
export const formatValueCompact = (value: number | null) =>
  value === null ? "—" : compactInr.format(value);

export const formatQuantity = (value: number | null) =>
  value === null ? "—" : quantity.format(value);

/** "2 hours ago" — what a salesperson actually wants to know. */
export const formatRelative = (iso: string) =>
  `${formatDistanceToNowStrict(parseISO(iso))} ago`;

/** "26 Jul 2026, 14:32" — the precise value, for a tooltip or title attribute. */
export const formatAbsolute = (iso: string) =>
  format(parseISO(iso), "d MMM yyyy, HH:mm");

/** Short form for dense columns: "26 Jul" */
export const formatShortDate = (iso: string) => format(parseISO(iso), "d MMM");
