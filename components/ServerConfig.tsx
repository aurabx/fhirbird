'use client';

import { useState, useEffect } from 'react';

interface ServerConfigProps {
  onServerChange: (url: string) => void;
  onProxyChange: (useProxy: boolean) => void;
}

// Predefined FHIR servers for production
const PRODUCTION_FHIR_SERVERS = [
  { name: 'HAPI FHIR R4 (Public Test Server)', url: 'https://hapi.fhir.org/baseR4' },
  { name: 'HAPI FHIR R5 (Public Test Server)', url: 'https://hapi.fhir.org/baseR5' },
  { name: 'Firely Server (Public)', url: 'https://server.fire.ly' },
];

const isProduction = process.env.NODE_ENV === 'production';

export default function ServerConfig({ onServerChange, onProxyChange }: ServerConfigProps) {
  const [serverUrl, setServerUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [useProxy, setUseProxy] = useState(true);

  useEffect(() => {
    // Load saved server URL from localStorage
    const saved = localStorage.getItem('fhirServerUrl');
    const savedProxy = localStorage.getItem('fhirUseProxy');
    if (saved) {
      setServerUrl(saved);
      onServerChange(saved);
    }
    if (savedProxy !== null) {
      const proxyEnabled = savedProxy === 'true';
      setUseProxy(proxyEnabled);
      onProxyChange(proxyEnabled);
    } else {
      onProxyChange(true);
    }
  }, [onServerChange, onProxyChange]);

  const handleSave = () => {
    localStorage.setItem('fhirServerUrl', serverUrl);
    onServerChange(serverUrl);
    setIsEditing(false);
  };

  const handleCancel = () => {
    const saved = localStorage.getItem('fhirServerUrl') || '';
    setServerUrl(saved);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-orange-700">FHIR Server Configuration</h2>
      
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="serverUrl" className="block text-sm font-medium text-orange-700 mb-2">
              FHIR Server {isProduction ? '' : 'URL'}
            </label>
            {isProduction ? (
              <>
                <select
                  id="serverUrl"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-orange-700"
                >
                  <option value="">Select a FHIR server...</option>
                  {PRODUCTION_FHIR_SERVERS.map((server) => (
                    <option key={server.url} value={server.url}>
                      {server.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Public FHIR test servers. You can customize this list in your own deployment.
                </p>
              </>
            ) : (
              <>
                <input
                  id="serverUrl"
                  type="url"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://hapi.fhir.org/baseR4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-orange-700"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter the base URL of your FHIR server (e.g., https://hapi.fhir.org/baseR4)
                </p>
              </>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Current Server:</p>
              <p className="text-lg font-mono text-gray-800">
                {serverUrl || 'Not configured'}
              </p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              {serverUrl ? 'Change' : 'Configure'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useProxy"
              checked={useProxy}
              onChange={(e) => {
                const enabled = e.target.checked;
                setUseProxy(enabled);
                localStorage.setItem('fhirUseProxy', String(enabled));
                onProxyChange(enabled);
              }}
              className="rounded"
            />
            <label htmlFor="useProxy" className="text-sm text-orange-700">
              Use proxy to avoid CORS issues
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
