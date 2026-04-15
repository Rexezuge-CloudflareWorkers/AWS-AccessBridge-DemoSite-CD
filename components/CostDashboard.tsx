'use client';

import { useState, useEffect } from 'react';

interface CostSummary {
  accounts: Record<string, { totalCost: number; currency: string }>;
  grandTotal: number;
}

interface TrendMonth {
  period: string;
  total: number;
  byAccount: Record<string, number>;
}

export default function CostDashboard() {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [trends, setTrends] = useState<TrendMonth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [summaryRes, trendsRes] = await Promise.all([
          fetch('/api/cost/summary'),
          fetch('/api/cost/trends?months=6'),
        ]);

        if (summaryRes.ok) {
          setSummary((await summaryRes.json()) as CostSummary);
        }
        if (trendsRes.ok) {
          const trendsData = (await trendsRes.json()) as { months: TrendMonth[] };
          setTrends(trendsData.months || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cost data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading cost data...</p>
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-800 border border-red-600 text-red-200 px-4 py-3 rounded">{error}</div>;
  }

  const maxTrend: number = trends.length > 0 ? Math.max(...trends.map((t) => t.total), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-6 rounded">
          <p className="text-gray-400 text-sm">Total Spend (30d)</p>
          <p className="text-3xl font-bold text-white">${summary?.grandTotal?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded">
          <p className="text-gray-400 text-sm">Accounts Tracked</p>
          <p className="text-3xl font-bold text-white">{Object.keys(summary?.accounts || {}).length}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded">
          <p className="text-gray-400 text-sm">Months of Data</p>
          <p className="text-3xl font-bold text-white">{trends.length}</p>
        </div>
      </div>

      {/* Trend Chart (SVG bar chart) */}
      {trends.length > 0 && (
        <div className="bg-gray-800 p-6 rounded">
          <h3 className="text-lg font-semibold mb-4">Monthly Cost Trends</h3>
          <div className="flex items-end gap-2 h-48">
            {trends.map((month) => (
              <div key={month.period} className="flex-1 flex flex-col items-center">
                <span className="text-xs text-gray-400 mb-1">${month.total.toFixed(0)}</span>
                <div
                  className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-400"
                  style={{ height: `${(month.total / maxTrend) * 100}%`, minHeight: month.total > 0 ? '4px' : '0' }}
                />
                <span className="text-xs text-gray-500 mt-1">{month.period.substring(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Breakdown */}
      {summary && Object.keys(summary.accounts).length > 0 && (
        <div className="bg-gray-800 p-6 rounded">
          <h3 className="text-lg font-semibold mb-4">Account Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(summary.accounts)
              .sort(([, a], [, b]) => b.totalCost - a.totalCost)
              .map(([accountId, data]) => (
                <div key={accountId} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <span className="font-mono text-sm">{accountId}</span>
                  <span className="font-semibold">${data.totalCost.toFixed(2)} {data.currency}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {!summary || Object.keys(summary.accounts).length === 0 ? (
        <div className="bg-gray-800 p-8 rounded text-center text-gray-400">
          <p className="text-lg mb-2">No cost data available yet.</p>
          <p className="text-sm">Enable data collection for your accounts in the Admin panel to start tracking costs.</p>
        </div>
      ) : null}
    </div>
  );
}
