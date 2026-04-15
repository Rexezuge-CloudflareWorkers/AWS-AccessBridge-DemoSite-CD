'use client';

import { useState, useEffect, useCallback } from 'react';

interface ResourceItem {
  awsAccountId: string;
  region: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  state: string;
  metadata: Record<string, string>;
}

interface ResourceSummary {
  totalResources: number;
  byType: Record<string, number>;
  byAccount: Record<string, Record<string, number>>;
}

const TYPE_LABELS: Record<string, string> = { ec2: 'EC2 Instances', s3: 'S3 Buckets', lambda: 'Lambda Functions', rds: 'RDS Databases' };

export default function ResourceInventory() {
  const [summary, setSummary] = useState<ResourceSummary | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    fetch('/api/resources/summary')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setSummary(data as ResourceSummary); });
  }, []);

  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.set('type', filterType);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    params.set('limit', pageSize.toString());
    params.set('offset', (page * pageSize).toString());

    try {
      const res = await fetch(`/api/resources?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { items: ResourceItem[]; total: number };
        setResources(data.items);
        setTotal(data.total);
      }
    } finally {
      setIsLoading(false);
    }
  }, [filterType, searchQuery, page]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const totalPages = Math.ceil(total / pageSize);
  const stateColor = (state: string): string => {
    if (['running', 'active', 'Active', 'available'].includes(state)) return 'text-green-400';
    if (['stopped', 'inactive'].includes(state)) return 'text-red-400';
    return 'text-yellow-400';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-gray-800 p-4 rounded text-center">
            <p className="text-2xl font-bold">{summary.totalResources}</p>
            <p className="text-gray-400 text-xs">Total</p>
          </div>
          {Object.entries(summary.byType).map(([type, count]) => (
            <div key={type} className="bg-gray-800 p-4 rounded text-center">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-gray-400 text-xs">{TYPE_LABELS[type] || type}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-end flex-wrap bg-gray-800 p-4 rounded">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Type</label>
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(0); }} className="p-2 bg-gray-700 rounded border border-gray-600 text-white text-sm">
            <option value="">All Types</option>
            <option value="ec2">EC2</option>
            <option value="s3">S3</option>
            <option value="lambda">Lambda</option>
            <option value="rds">RDS</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Search</label>
          <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }} placeholder="Search by name or ID" className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white text-sm" />
        </div>
        <span className="text-sm text-gray-400">{total} results</span>
      </div>

      {/* Resource Table */}
      {isLoading ? (
        <div className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div></div>
      ) : resources.length === 0 ? (
        <div className="bg-gray-800 p-8 rounded text-center text-gray-400">
          <p className="text-lg mb-2">No resources found.</p>
          <p className="text-sm">Enable resource collection for your accounts in the Admin panel.</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-700 text-gray-300">
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Account</th>
                <th className="text-left p-2">Region</th>
                <th className="text-left p-2">State</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={`${r.awsAccountId}-${r.resourceType}-${r.resourceId}`} className="border-t border-gray-700">
                  <td className="p-2 font-medium uppercase text-xs">{r.resourceType}</td>
                  <td className="p-2">{r.resourceName}</td>
                  <td className="p-2 font-mono text-xs text-gray-400">{r.awsAccountId}</td>
                  <td className="p-2 text-gray-400">{r.region}</td>
                  <td className={`p-2 ${stateColor(r.state)}`}>{r.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 text-sm bg-gray-700 rounded disabled:opacity-50">Prev</button>
          <span className="text-sm text-gray-400">Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 text-sm bg-gray-700 rounded disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
