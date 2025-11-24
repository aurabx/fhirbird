'use client';

import { useState } from 'react';

interface ResultsDisplayProps {
  results: any;
  error: string | null;
  loading: boolean;
}

export default function ResultsDisplay({ results, error, loading }: ResultsDisplayProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']));

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-orange-700">Results</h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <span className="ml-4 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-orange-700">Results</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-orange-700">Results</h2>
        <p className="text-gray-500 text-center py-12">
          No results yet. Configure a server and execute a query to see results.
        </p>
      </div>
    );
  }

  const toggleExpand = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderValue = (value: any, path: string, depth: number = 0): React.JSX.Element => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">null</span>;
    }

    if (typeof value === 'boolean') {
      return <span className="text-purple-600">{value.toString()}</span>;
    }

    if (typeof value === 'number') {
      return <span className="text-blue-600">{value}</span>;
    }

    if (typeof value === 'string') {
      return <span className="text-green-600">"{value}"</span>;
    }

    if (Array.isArray(value)) {
      const isExpanded = expanded.has(path);
      return (
        <div className="inline">
          <button
            onClick={() => toggleExpand(path)}
            className="text-gray-600 hover:text-gray-800 font-mono"
          >
            {isExpanded ? '▼' : '▶'} [{value.length}]
          </button>
          {isExpanded && (
            <div className="ml-4 border-l-2 border-gray-200 pl-2 mt-1">
              {value.map((item, index) => (
                <div key={index} className="my-1">
                  <span className="text-gray-500">[{index}]:</span>{' '}
                  {renderValue(item, `${path}.${index}`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value);
      const isExpanded = expanded.has(path);
      return (
        <div className="inline">
          <button
            onClick={() => toggleExpand(path)}
            className="text-gray-600 hover:text-gray-800 font-mono"
          >
            {isExpanded ? '▼' : '▶'} {'{'}...{'}'} ({keys.length} keys)
          </button>
          {isExpanded && (
            <div className="ml-4 border-l-2 border-gray-200 pl-2 mt-1">
              {keys.map((key) => (
                <div key={key} className="my-1">
                  <span className="text-blue-800 font-medium">{key}:</span>{' '}
                  {renderValue(value[key], `${path}.${key}`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  const getSummary = () => {
    if (results.resourceType === 'Bundle') {
      const total = results.total || results.entry?.length || 0;
      return `Bundle containing ${total} resources`;
    }
    return `${results.resourceType} resource`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-orange-700">Results</h2>
        <div className="text-sm text-gray-600">
          {getSummary()}
        </div>
      </div>

      <div className="bg-gray-50 rounded-md p-4 overflow-auto max-h-[600px]">
        <div className="font-mono text-sm">
          {renderValue(results, 'root', 0)}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <details className="cursor-pointer">
          <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
            View Raw JSON
          </summary>
          <pre className="mt-2 bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto max-h-96 text-xs">
            {JSON.stringify(results, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
