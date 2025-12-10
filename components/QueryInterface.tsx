'use client';

import { useState } from 'react';

interface QueryInterfaceProps {
  serverUrl: string;
  onQuery: (results: any, error?: string, reqInfo?: {url: string; method: string; headers: Record<string, string>}) => void;
  onLoading: (loading: boolean) => void;
  useProxy: boolean;
  basicAuth: { username: string; password: string } | null;
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

export default function QueryInterface({ serverUrl, onQuery, onLoading, useProxy, basicAuth }: QueryInterfaceProps) {
  const [resourceType, setResourceType] = useState('Patient');
  const [resourceOptions, setResourceOptions] = useState(COMMON_RESOURCES);
  const [searchParams, setSearchParams] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [queryMode, setQueryMode] = useState<'search' | 'read' | 'metadata'>('search');
  const [customHeaders, setCustomHeaders] = useState('');
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourceError, setResourceError] = useState<string | null>(null);

  const handleLoadResourcesFromCapabilities = async () => {
    if (!serverUrl) {
      setResourceError('Please configure a FHIR server first');
      return;
    }

    setLoadingResources(true);
    setResourceError(null);

    try {
      let url = serverUrl.trim().replace(/\s+/g, '');
      url = url.endsWith('/') ? url.slice(0, -1) : url;

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('Server URL must start with http:// or https://');
      }

      url = `${url}/metadata`;

      const headers: Record<string, string> = {
        'Accept': 'application/fhir+json',
      };

      // Append Basic Auth if provided
      let authHeaderValue: string | null = null;
      if (basicAuth && (basicAuth.username || basicAuth.password)) {
        const creds = `${basicAuth.username || ''}:${basicAuth.password || ''}`;
        // Browser-safe base64 for UTF-8
        const encoded = typeof window === 'undefined'
          ? Buffer.from(creds, 'utf-8').toString('base64')
          : btoa(unescape(encodeURIComponent(creds)));
        authHeaderValue = `Basic ${encoded}`;
        headers['Authorization'] = authHeaderValue;
      }

      let fetchUrl = url;
      let fetchHeaders: Record<string, string> = headers;

      if (useProxy) {
        const encodedUrl = encodeURIComponent(url);
        // Do NOT send Authorization via query string
        const { Authorization, ...safeHeaders } = headers;
        const encodedHeaders = encodeURIComponent(JSON.stringify(safeHeaders));
        fetchUrl = `/api/fhir-proxy?url=${encodedUrl}&headers=${encodedHeaders}`;
        fetchHeaders = authHeaderValue ? { 'X-FHIR-Authorization': authHeaderValue } : {};
      }

      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: fetchHeaders,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const resourceTypes: string[] = Array.isArray(data?.rest)
        ? Array.from(
          new Set(
            data.rest.flatMap((restEntry: any) =>
              Array.isArray(restEntry.resource)
                ? restEntry.resource
                  .map((r: any) => r.type)
                  .filter((t: unknown): t is string => typeof t === 'string')
                : [],
            ),
          ),
        )
        : [];

      if (resourceTypes.length === 0) {
        throw new Error('CapabilityStatement did not list any resources');
      }

      resourceTypes.sort();
      setResourceOptions(resourceTypes);

      if (!resourceTypes.includes(resourceType)) {
        setResourceType(resourceTypes[0]);
      }
    } catch (error) {
      setResourceError(error instanceof Error ? error.message : 'Failed to load resources from CapabilityStatement');
    } finally {
      setLoadingResources(false);
    }
  };

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

      // Add/override with Basic Auth if provided
      let authHeaderValue: string | null = null;
      if (basicAuth && (basicAuth.username || basicAuth.password)) {
        const creds = `${basicAuth.username || ''}:${basicAuth.password || ''}`;
        const encoded = typeof window === 'undefined'
          ? Buffer.from(creds, 'utf-8').toString('base64')
          : btoa(unescape(encodeURIComponent(creds)));
        authHeaderValue = `Basic ${encoded}`;
        headers['Authorization'] = authHeaderValue;
      }

      // Prepare display-safe headers for Request Details
      const displayHeaders: Record<string, string> = { ...headers };
      if (displayHeaders['Authorization']) {
        displayHeaders['Authorization'] = displayHeaders['Authorization'].replace(/^(Basic|Bearer)\s.+$/, '$1 ***');
      }
      const requestInfo = { url, method: 'GET', headers: displayHeaders };

      let fetchUrl = url;
      let fetchHeaders: Record<string, string> = headers;

      if (useProxy) {
        // Use the proxy to avoid CORS. Do NOT include Authorization in query string.
        const encodedUrl = encodeURIComponent(url);
        const { Authorization, ...safeHeaders } = headers;
        const encodedHeaders = encodeURIComponent(JSON.stringify(safeHeaders));
        fetchUrl = `/api/fhir-proxy?url=${encodedUrl}&headers=${encodedHeaders}`;
        fetchHeaders = authHeaderValue ? { 'X-FHIR-Authorization': authHeaderValue } : {};
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
              {resourceOptions.map((resource) => (
                <option key={resource} value={resource}>
                  {resource}
                </option>
              ))}
            </select>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleLoadResourcesFromCapabilities}
                className="px-3 py-1 text-xs rounded-md border border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loadingResources || !serverUrl}
              >
                {loadingResources ? 'Loading from capabilities...' : 'Load resources from server capabilities'}
              </button>
              <span className="text-xs text-gray-500">
                Using {resourceOptions.length} resource{resourceOptions.length === 1 ? '' : 's'}
              </span>
            </div>
            {resourceError && (
              <p className="mt-1 text-xs text-red-600">
                {resourceError}
              </p>
            )}
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
