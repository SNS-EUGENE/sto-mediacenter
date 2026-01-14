'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface TableInfo {
  name: string
  count: number | null
  sample: Record<string, unknown>[] | null
  error: string | null
  loading: boolean
}

export default function DebugPage() {
  const [tables, setTables] = useState<TableInfo[]>([
    { name: 'studios', count: null, sample: null, error: null, loading: true },
    { name: 'equipments', count: null, sample: null, error: null, loading: true },
    { name: 'bookings', count: null, sample: null, error: null, loading: true },
  ])
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'success' | 'error'>('checking')
  const [supabaseUrl, setSupabaseUrl] = useState('')

  useEffect(() => {
    setSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set')
    fetchAllTables()
  }, [])

  async function fetchAllTables() {
    // Studios
    fetchTable('studios', 0)
    // Equipments
    fetchTable('equipments', 1)
    // Bookings
    fetchTable('bookings', 2)
  }

  async function fetchTable(tableName: string, index: number) {
    try {
      // Get count
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (countError) throw countError

      // Get sample (5 rows)
      const { data: sample, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(5)

      if (sampleError) throw sampleError

      setTables(prev => {
        const updated = [...prev]
        updated[index] = {
          name: tableName,
          count: count,
          sample: sample,
          error: null,
          loading: false,
        }
        return updated
      })

      setConnectionStatus('success')
    } catch (err) {
      setTables(prev => {
        const updated = [...prev]
        updated[index] = {
          name: tableName,
          count: null,
          sample: null,
          error: err instanceof Error ? err.message : 'Unknown error',
          loading: false,
        }
        return updated
      })
      setConnectionStatus('error')
    }
  }

  function formatValue(value: unknown): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (Array.isArray(value)) return `[${value.join(', ')}]`
    if (typeof value === 'object') return JSON.stringify(value)
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    return String(value)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Supabase Debug</h1>

        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-gray-400">Status:</span>
              {connectionStatus === 'checking' && (
                <span className="text-yellow-400">Checking...</span>
              )}
              {connectionStatus === 'success' && (
                <span className="text-green-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Connected
                </span>
              )}
              {connectionStatus === 'error' && (
                <span className="text-red-400">Connection Failed</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400">Supabase URL:</span>
              <code className="text-sm bg-gray-700 px-2 py-1 rounded">{supabaseUrl}</code>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {tables.map((table) => (
            <div key={table.name} className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-300 mb-2 capitalize">{table.name}</h3>
              {table.loading ? (
                <div className="text-2xl font-bold text-gray-500">Loading...</div>
              ) : table.error ? (
                <div className="text-red-400 text-sm">{table.error}</div>
              ) : (
                <div className="text-3xl font-bold text-blue-400">{table.count?.toLocaleString()}</div>
              )}
            </div>
          ))}
        </div>

        {/* Table Details */}
        {tables.map((table) => (
          <div key={table.name} className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold capitalize">{table.name}</h2>
              <button
                onClick={() => {
                  const index = tables.findIndex(t => t.name === table.name)
                  setTables(prev => {
                    const updated = [...prev]
                    updated[index] = { ...updated[index], loading: true }
                    return updated
                  })
                  fetchTable(table.name, index)
                }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              >
                Refresh
              </button>
            </div>

            {table.loading ? (
              <div className="text-gray-400">Loading...</div>
            ) : table.error ? (
              <div className="text-red-400 bg-red-900/20 p-4 rounded">
                <strong>Error:</strong> {table.error}
              </div>
            ) : table.sample && table.sample.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      {Object.keys(table.sample[0]).map((key) => (
                        <th key={key} className="text-left py-2 px-3 text-gray-400 font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.sample.map((row, i) => (
                      <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        {Object.values(row).map((value, j) => (
                          <td key={j} className="py-2 px-3 max-w-xs truncate" title={formatValue(value)}>
                            {formatValue(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-gray-500 text-sm mt-3">
                  Showing 5 of {table.count?.toLocaleString()} rows
                </div>
              </div>
            ) : (
              <div className="text-gray-400">No data</div>
            )}
          </div>
        ))}

        {/* Raw Query Test */}
        <RawQueryTester />
      </div>
    </div>
  )
}

function RawQueryTester() {
  const [query, setQuery] = useState('studios')
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  async function runQuery() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from(query).select('*').limit(10)
      if (error) {
        setResult(JSON.stringify({ error: error.message }, null, 2))
      } else {
        setResult(JSON.stringify(data, null, 2))
      }
    } catch (err) {
      setResult(JSON.stringify({ error: String(err) }, null, 2))
    }
    setLoading(false)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Raw Query Tester</h2>
      <div className="flex gap-4 mb-4">
        <select
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-3 py-2"
        >
          <option value="studios">studios</option>
          <option value="equipments">equipments</option>
          <option value="bookings">bookings</option>
        </select>
        <button
          onClick={runQuery}
          disabled={loading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded"
        >
          {loading ? 'Running...' : 'Run Query'}
        </button>
      </div>
      <pre className="bg-gray-900 p-4 rounded overflow-auto max-h-96 text-xs">
        {result || 'Click "Run Query" to see results'}
      </pre>
    </div>
  )
}
