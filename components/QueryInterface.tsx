'use client';

import { useState } from 'react';

interface QueryInterfaceProps {
  serverUrl: string;
  onQuery: (results: any, error?: string, reqInfo?: {url: string; method: string; headers: Record<string, string>}) => void;
  onLoading: (loading: boolean) => void;
  useProxy: boolean;
}

const COMMON_RESOURCES = [
  'Patient',
  'Observation',
  'Condition',
  'Procedure',
  'MedicationRequest',
  'Encounter',
  'Practitioner',
  'Organization',
  'AllergyIntolerance',
  'DiagnosticReport',
  'Immunization',
  'CarePlan',
];

export default function QueryInterface({ serverUrl, onQuery, onLoading, useProxy }: QueryInterfaceProps) {
  const [resourceType, setResourceType] = useState('Patient');
  const [searchParams, setSearchParams] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [queryMode, setQueryMode] = useState<'search' | 'read' | 'metadata'>('search');
  const [customHeaders, setCustomHeaders] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!serverUrl) {
      onQuery(null, 'Please configure a FHIR server first');
      return;
    }

    onLoading(true);
    onQuery(null); // Clear previous results

    try {
      // Clean and validate server URL
      let url = serverUrl.trim().replace(/\s+/g, '');
      
      // Remove trailing slash
      url = url.endsWith('/') ? url.slice(0, -1) : url;
      
      // Ensure the URL has a protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('Server URL must start with http:// or https://');
      }
      
      if (queryMode === 'metadata') {
        url = `${url}/metadata`;
      } else if (queryMode === 'read' && resourceId) {
        url = `${url}/${resourceType}/${resourceId.trim()}`;
      } else {
        url = `${url}/${resourceType}`;
        if (searchParams) {
          url += `?${searchParams.trim()}`;
        }
      }

      const headers: Record<string, string> = {
        'Accept': 'application/fhir+json',
      };

      // Parse and add custom headers
      if (customHeaders.trim()) {
        try {
          const customHeadersObj = JSON.parse(customHeaders);
          Object.assign(headers, customHeadersObj);
        } catch (e) {
          throw new Error('Invalid JSON in custom headers');
        }
      }

      console.log('Headers being sent:', headers);
      const requestInfo = { url, method: 'GET', headers };

      let fetchUrl = url;
      let fetchHeaders = headers;

      if (useProxy) {
        // Use the proxy to avoid CORS
        const encodedUrl = encodeURIComponent(url);
        const encodedHeaders = encodeURIComponent(JSON.stringify(headers));
        fetchUrl = `/api/fhir-proxy?url=${encodedUrl}&headers=${encodedHeaders}`;
        fetchHeaders = {}; // Proxy will handle headers
      }

      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: fetchHeaders,
      });

      if (!response.ok) {
        const errorText = await response.text();
        onQuery(null, `HTTP ${response.status}: ${errorText}`, requestInfo);
        return;
      }

      const data = await response.json();
      onQuery(data, undefined, requestInfo);
    } catch (error) {
      // Still need to reconstruct URL for network errors
      let errorUrl = serverUrl.trim();
      errorUrl = errorUrl.endsWith('/') ? errorUrl.slice(0, -1) : errorUrl;
      if (queryMode === 'metadata') {
        errorUrl = `${errorUrl}/metadata`;
      } else if (queryMode === 'read' && resourceId) {
        errorUrl = `${errorUrl}/${resourceType}/${resourceId.trim()}`;
      } else {
        errorUrl = `${errorUrl}/${resourceType}`;
        if (searchParams) {
          errorUrl += `?${searchParams.trim()}`;
        }
      }
      const errorHeaders: Record<string, string> = { 'Accept': 'application/fhir+json' };
      // Parse and add custom headers for error case too
      if (customHeaders.trim()) {
        try {
          const customHeadersObj = JSON.parse(customHeaders);
          Object.assign(errorHeaders, customHeadersObj);
        } catch (e) {
          // Ignore JSON parse errors in error handler
        }
      }
      onQuery(null, error instanceof Error ? error.message : 'Unknown error occurred', { url: errorUrl, method: 'GET', headers: errorHeaders });
    } finally {
      onLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-orange-700">Query FHIR Resources</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-orange-700 mb-2">
            Query Mode
          </label>
          <div className="flex gap-4">
            <label className="flex items-center text-orange-700">
              <input
                type="radio"
                value="search"
                checked={queryMode === 'search'}
                onChange={(e) => setQueryMode(e.target.value as 'search' | 'read' | 'metadata')}
                className="mr-2"
              />
              Search
            </label>
            <label className="flex items-center text-orange-700">
              <input
                type="radio"
                value="read"
                checked={queryMode === 'read'}
                onChange={(e) => setQueryMode(e.target.value as 'search' | 'read' | 'metadata')}
                className="mr-2"
              />
              Read by ID
            </label>
            <label className="flex items-center text-orange-700">
              <input
                type="radio"
                value="metadata"
                checked={queryMode === 'metadata'}
                onChange={(e) => setQueryMode(e.target.value as 'search' | 'read' | 'metadata')}
                className="mr-2"
              />
              Capabilities
            </label>
          </div>
        </div>

        {queryMode !== 'metadata' && (
          <div>
            <label htmlFor="resourceType" className="block text-sm font-medium text-orange-700 mb-2">
              Resource Type
            </label>
            <select
              id="resourceType"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-orange-700"
            >
              {COMMON_RESOURCES.map((resource) => (
                <option key={resource} value={resource}>
                  {resource}
                </option>
              ))}
            </select>
          </div>
        )}

        {queryMode === 'read' ? (
          <div>
            <label htmlFor="resourceId" className="block text-sm font-medium text-orange-700 mb-2">
              Resource ID
            </label>
            <input
              id="resourceId"
              type="text"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              placeholder="e.g., 12345"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-orange-700"
            />
          </div>
        ) : queryMode === 'search' ? (
          <div>
            <label htmlFor="searchParams" className="block text-sm font-medium text-orange-700 mb-2">
              Search Parameters (optional)
            </label>
            <input
              id="searchParams"
              type="text"
              value={searchParams}
              onChange={(e) => setSearchParams(e.target.value)}
              placeholder="e.g., _count=10&name=Smith"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-orange-700"
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter query parameters (e.g., _count=10&name=Smith)
            </p>
          </div>
        ) : null}

        <div>
          <label htmlFor="customHeaders" className="block text-sm font-medium text-orange-700 mb-2">
            Custom Headers (optional)
          </label>
          <textarea
            id="customHeaders"
            value={customHeaders}
            onChange={(e) => setCustomHeaders(e.target.value)}
            placeholder='{"Authorization": "Bearer token", "X-Custom": "value"}'
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-orange-700 font-mono text-sm"
          />
          <p className="mt-1 text-sm text-gray-500">
            Enter headers as JSON (e.g., {'{"Authorization": "Bearer token"}'})
          </p>
        </div>

        <button
          type="submit"
          disabled={!serverUrl}
          className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Execute Query
        </button>
      </form>
    </div>
  );
}
