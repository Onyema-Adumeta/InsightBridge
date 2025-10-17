export function extractFinancialInsights(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(line =>
      /revenue|expense|income|margin|profit|loss|increase|decrease/i.test(line)
    );
}

export function getInsightBadge(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("increase") || lower.includes("growth") || lower.includes("+")) {
    return "🟢";
  }
  if (lower.includes("decrease") || lower.includes("decline") || lower.includes("-")) {
    return "🔴";
  }
  return "⚪";
}

export interface FinancialKPIs {
  revenue?: number;
  expenses?: number;
  netIncome?: number;
}

export function extractKPIs(text: string | undefined): FinancialKPIs {
  const kpis: FinancialKPIs = {};
  if (!text) return kpis;

  const revenueMatch = text.match(/revenue[:\s]*\$?([\d,\.]+)/i);
  const expensesMatch = text.match(/expenses[:\s]*\$?([\d,\.]+)/i);
  const incomeMatch = text.match(/net\s*income[:\s]*\$?([\d,\.]+)/i);

  if (revenueMatch) {
    kpis.revenue = parseFloat(revenueMatch[1].replace(/,/g, ""));
  }
  if (expensesMatch) {
    kpis.expenses = parseFloat(expensesMatch[1].replace(/,/g, ""));
  }
  if (incomeMatch) {
    kpis.netIncome = parseFloat(incomeMatch[1].replace(/,/g, ""));
  }

  return kpis;
}

export function getInsightClassification(text: string | undefined): string[] {
  if (!text) return [];
  const lines = text.split("\n");
  const tags = new Set<string>();

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/revenue/.test(lower)) tags.add("Revenue Alert");
    if (/expense/.test(lower)) tags.add("Expense Pattern");
    if (/income/.test(lower)) tags.add("Income Notice");
    if (/profit/.test(lower)) tags.add("Profitability Insight");
    if (/loss/.test(lower)) tags.add("Loss Alert");
  }

  return Array.from(tags);
}
