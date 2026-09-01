import { daysBetween } from "./format";
import type { Sale } from "./queries";

export type CustomerRow = {
  customer_name: string;
  totalCredit: number;
  totalPaid: number;
  balance: number;
  oldestUnpaid: string | null;
  daysOverdue: number;
  sales: Sale[];
};

export function buildCustomerLedger(
  sales: Sale[],
  payments: Array<{ customer_name: string; amount: number }>,
): CustomerRow[] {
  const map = new Map<string, CustomerRow>();

  for (const s of sales) {
    if (!s.is_credit) continue;
    const key = s.customer_name.trim();
    const row =
      map.get(key) ??
      ({
        customer_name: key,
        totalCredit: 0,
        totalPaid: 0,
        balance: 0,
        oldestUnpaid: null,
        daysOverdue: 0,
        sales: [],
      } satisfies CustomerRow);
    row.totalCredit += Number(s.total_amount) - Number(s.amount_paid);
    row.sales.push(s);
    if (!row.oldestUnpaid || s.sale_date < row.oldestUnpaid) row.oldestUnpaid = s.sale_date;
    map.set(key, row);
  }

  for (const p of payments) {
    const key = p.customer_name.trim();
    const row = map.get(key);
    if (row) row.totalPaid += Number(p.amount);
  }

  return [...map.values()]
    .map((r) => {
      r.balance = r.totalCredit - r.totalPaid;
      r.daysOverdue = r.balance > 0 && r.oldestUnpaid ? daysBetween(r.oldestUnpaid) : 0;
      return r;
    })
    .sort((a, b) => b.balance - a.balance);
}

export const OVERDUE_DAYS = 21;
export const AGING_DAYS = 60;

export function inRange(date: string, from: string, to: string) {
  return (!from || date >= from) && (!to || date <= to);
}
