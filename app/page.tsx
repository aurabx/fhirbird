'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import ServerConfig from '@/components/ServerConfig';
import QueryInterface from '@/components/QueryInterface';
import ResultsDisplay from '@/components/ResultsDisplay';

export default function Home() {
  const [serverUrl, setServerUrl] = useState('');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestInfo, setRequestInfo] = useState<{url: string; method: string; headers: Record<string, string>} | null>(null);
  const [useProxy, setUseProxy] = useState(true);

  const handleServerChange = useCallback((url: string) => {
    setServerUrl(url);
  }, []);

  const handleProxyChange = useCallback((proxy: boolean) => {
    setUseProxy(proxy);
  }, []);

  const handleQuery = useCallback((queryResults: any, queryError?: string, reqInfo?: {url: string; method: string; headers: Record<string, string>}) => {
    if (queryError) {
      setError(queryError);
      setResults(null);
    } else {
      setResults(queryResults);
      setError(null);
    }
    if (reqInfo) {
      setRequestInfo(reqInfo);
    }
  }, []);

  const handleLoading = useCallback((isLoading: boolean) => {
    setLoading(isLoading);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 flex items-center gap-6">
          <div className="flex-shrink-0">
            <Image 
              src="/phoenix-logo.svg" 
              alt="FHIRbird Phoenix Logo"
              width={80} 
              height={80}
              className="drop-shadow-lg"
            />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-orange-700 mb-2">
              FHIRbird
            </h1>
            <p className="text-gray-700">
              A browser for FHIR healthcare resources
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <ServerConfig onServerChange={handleServerChange} onProxyChange={handleProxyChange} />
            <QueryInterface 
              serverUrl={serverUrl} 
              onQuery={handleQuery}
              onLoading={handleLoading}
              useProxy={useProxy}
            />
            {requestInfo && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-orange-700">Request Details</h2>
                <div className="space-y-2 font-mono text-sm">
                  <div>
                    <span className="text-orange-700 font-semibold">Method:</span>
                    <span className="ml-2 text-gray-800">{requestInfo.method}</span>
                  </div>
                  <div>
                    <span className="text-orange-700 font-semibold">URL:</span>
                    <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-200 break-all text-gray-800">
                      {requestInfo.url}
                    </div>
                  </div>
                  <div>
                    <span className="text-orange-700 font-semibold">Headers:</span>
                    <pre className="mt-1 p-2 bg-gray-50 rounded border border-gray-200 text-gray-800">
{JSON.stringify(requestInfo.headers, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <ResultsDisplay 
              results={results}
              error={error}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
