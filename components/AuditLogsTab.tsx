'use client';

import { useState, useCallback, useEffect } from 'react';

interface AuditLog {
  logId: string;
  timestamp: number;
  userEmail: string;
  action: string;
  resource?: string;
  method: string;
  path: string;
  statusCode: number;
  detail?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLogsTabProps {
  showMessage: (type: 'success' | 'error', text: string) => void;
}

export default function AuditLogsTab({ showMessage }: AuditLogsTabProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Filters
  const [filterEmail, setFilterEmail] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEmail.trim()) params.set('userEmail', filterEmail.trim());
      if (filterAction.trim()) params.set('action', filterAction.trim());
      params.set('limit', pageSize.toString());
      params.set('offset', (page * pageSize).toString());

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch logs: ${response.status} ${text}`);
      }
      const data = (await response.json()) as { logs: AuditLog[]; total: number };
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [filterEmail, filterAction, page, showMessage]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatTimestamp = (ts: number): string => {
    return new Date(ts * 1000).toLocaleString();
  };

  const statusColor = (code: number): string => {
    if (code < 300) return 'text-green-400';
    if (code < 400) return 'text-yellow-400';
    return 'text-red-400';
  };

  const totalPages = Math.ceil(total / pageSize);
  const inputClass = 'p-2 bg-gray-700 rounded border border-gray-600 text-white text-sm focus:border-blue-400 focus:outline-none';

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 p-4 rounded">
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs text-gray-400 mb-1">User Email</label>
            <input type="text" value={filterEmail} onChange={(e) => { setFilterEmail(e.target.value); setPage(0); }} placeholder="Filter by email" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Action</label>
            <input type="text" value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(0); }} placeholder="e.g. ASSUME_ROLE" className={inputClass} />
          </div>
          <button onClick={fetchLogs} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-white text-sm">
            Refresh
          </button>
          <span className="text-sm text-gray-400 ml-auto">{total} total entries</span>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div>
        </div>
      )}

      {!isLoading && logs.length === 0 && (
        <div className="text-center py-8 text-gray-400">No audit logs found.</div>
      )}

      {!isLoading && logs.length > 0 && (
        <div className="bg-gray-800 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-700 text-gray-300">
                <th className="text-left p-2">Time</th>
                <th className="text-left p-2">User</th>
                <th className="text-left p-2">Action</th>
                <th className="text-left p-2">Method</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <>
                  <tr
                    key={log.logId}
                    className="border-t border-gray-700 hover:bg-gray-750 cursor-pointer"
                    onClick={() => setExpandedLog(expandedLog === log.logId ? null : log.logId)}
                  >
                    <td className="p-2 text-gray-300 whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
                    <td className="p-2 text-gray-300 truncate max-w-32">{log.userEmail}</td>
                    <td className="p-2 font-medium">{log.action}</td>
                    <td className="p-2 text-gray-400">{log.method}</td>
                    <td className={`p-2 ${statusColor(log.statusCode)}`}>{log.statusCode}</td>
                    <td className="p-2 text-gray-400 text-xs">{log.ipAddress || '-'}</td>
                  </tr>
                  {expandedLog === log.logId && (
                    <tr key={`${log.logId}-detail`} className="bg-gray-750">
                      <td colSpan={6} className="p-3 text-xs text-gray-300 space-y-1">
                        <div><span className="text-gray-500">Path:</span> {log.path}</div>
                        {log.resource && <div><span className="text-gray-500">Resource:</span> {log.resource}</div>}
                        {log.detail && <div><span className="text-gray-500">Detail:</span> {log.detail}</div>}
                        {log.userAgent && <div><span className="text-gray-500">User Agent:</span> {log.userAgent}</div>}
                        <div><span className="text-gray-500">Log ID:</span> {log.logId}</div>
                      </td>
                    </tr>
                  )}
                </>
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
