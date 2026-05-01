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
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSummary(data as ResourceSummary);
      });
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

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const totalPages = Math.ceil(total / pageSize);
  const stateColor = (state: string): string => {
    if (['running', 'active', 'Active', 'available'].includes(state)) return '#4ade80';
    if (['stopped', 'inactive'].includes(state)) return '#f87171';
    return '#facc15';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Summary Cards */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${1 + Object.keys(summary.byType).length}, 1fr)`,
            gap: '12px',
          }}
        >
          <div
            style={{
              background: '#1e2433',
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <p className="text-2xl font-bold" style={{ color: '#fff' }}>
              {summary.totalResources}
            </p>
            <p className="text-xs" style={{ color: '#9ca3af', marginTop: '4px' }}>
              Total
            </p>
          </div>
          {Object.entries(summary.byType).map(([type, count]) => (
            <div
              key={type}
              style={{
                background: '#1e2433',
                padding: '16px',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <p className="text-2xl font-bold" style={{ color: '#fff' }}>
                {count}
              </p>
              <p className="text-xs" style={{ color: '#9ca3af', marginTop: '4px' }}>
                {TYPE_LABELS[type] || type}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          background: '#1e2433',
          padding: '16px',
          borderRadius: '12px',
        }}
      >
        <div>
          <label className="text-xs font-medium" style={{ display: 'block', color: '#9ca3af', marginBottom: '6px' }}>
            Type
          </label>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(0);
            }}
            className="text-sm"
            style={{
              padding: '8px',
              background: '#252d3d',
              borderRadius: '8px',
              border: 'none',
              color: '#fff',
              outline: 'none',
            }}
          >
            <option value="">All Types</option>
            <option value="ec2">EC2</option>
            <option value="s3">S3</option>
            <option value="lambda">Lambda</option>
            <option value="rds">RDS</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label className="text-xs font-medium" style={{ display: 'block', color: '#9ca3af', marginBottom: '6px' }}>
            Search
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search by name or ID"
            className="text-sm"
            style={{
              width: '100%',
              padding: '8px',
              background: '#252d3d',
              borderRadius: '8px',
              border: 'none',
              color: '#fff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <span className="text-sm" style={{ color: '#6b7280', paddingBottom: '2px' }}>
          {total} results
        </span>
      </div>

      {/* Resource Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div
            className="animate-spin"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: '2px solid #60a5fa',
              borderTopColor: 'transparent',
              margin: '0 auto',
            }}
          />
        </div>
      ) : resources.length === 0 ? (
        <div
          style={{
            background: '#1e2433',
            padding: '48px',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <svg
            style={{ width: '48px', height: '48px', color: '#4b5563', margin: '0 auto 16px' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <p className="text-lg" style={{ color: '#d1d5db', marginBottom: '8px' }}>
            No resources found.
          </p>
          <p className="text-sm" style={{ color: '#6b7280' }}>
            Enable resource collection for your accounts in the Admin panel.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: '#1e2433',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <table className="text-sm" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th
                  className="text-xs uppercase tracking-wider font-medium"
                  style={{ textAlign: 'left', padding: '12px', color: '#9ca3af', background: '#252d3d' }}
                >
                  Type
                </th>
                <th
                  className="text-xs uppercase tracking-wider font-medium"
                  style={{ textAlign: 'left', padding: '12px', color: '#9ca3af', background: '#252d3d' }}
                >
                  Name
                </th>
                <th
                  className="text-xs uppercase tracking-wider font-medium"
                  style={{ textAlign: 'left', padding: '12px', color: '#9ca3af', background: '#252d3d' }}
                >
                  Account
                </th>
                <th
                  className="text-xs uppercase tracking-wider font-medium"
                  style={{ textAlign: 'left', padding: '12px', color: '#9ca3af', background: '#252d3d' }}
                >
                  Region
                </th>
                <th
                  className="text-xs uppercase tracking-wider font-medium"
                  style={{ textAlign: 'left', padding: '12px', color: '#9ca3af', background: '#252d3d' }}
                >
                  State
                </th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r, idx) => (
                <tr
                  key={`${r.awsAccountId}-${r.resourceType}-${r.resourceId}`}
                  style={{
                    borderTop: idx === 0 ? 'none' : '1px solid #2d3748',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#252d3d';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <td className="font-medium uppercase text-xs" style={{ padding: '12px', color: '#d1d5db' }}>
                    {r.resourceType}
                  </td>
                  <td style={{ padding: '12px', color: '#fff' }}>{r.resourceName}</td>
                  <td className="font-mono text-xs" style={{ padding: '12px', color: '#9ca3af' }}>
                    {r.awsAccountId}
                  </td>
                  <td style={{ padding: '12px', color: '#9ca3af' }}>{r.region}</td>
                  <td style={{ padding: '12px', color: stateColor(r.state) }}>{r.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="text-sm"
            style={{
              padding: '6px 12px',
              background: '#1e2433',
              borderRadius: '8px',
              border: 'none',
              color: '#e5e7eb',
              cursor: page === 0 ? 'default' : 'pointer',
              opacity: page === 0 ? 0.4 : 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              if (page !== 0) (e.currentTarget as HTMLElement).style.background = '#252d3d';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#1e2433';
            }}
          >
            Prev
          </button>
          <span className="text-sm" style={{ color: '#6b7280' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="text-sm"
            style={{
              padding: '6px 12px',
              background: '#1e2433',
              borderRadius: '8px',
              border: 'none',
              color: '#e5e7eb',
              cursor: page >= totalPages - 1 ? 'default' : 'pointer',
              opacity: page >= totalPages - 1 ? 0.4 : 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              if (page < totalPages - 1) (e.currentTarget as HTMLElement).style.background = '#252d3d';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#1e2433';
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
