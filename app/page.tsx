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
      <div className="container mx-auto px-4 py-4">
        <header className="mb-4 flex items-start justify-between">
          <div>
            <Image
              src="/logo-horizonal.png"
              alt="FHIRbird Logo"
              width={828}
              height={224}
              className="drop-shadow-lg w-auto h-auto mb-1"
              style={{ maxWidth: '250px' }}
            />
            <p className="text-gray-600 text-sm">
              A browser for FHIR healthcare resources
            </p>
          </div>
          <div className="flex gap-4 text-sm">
              <span className={"text-orange-500 mr-2"}>
                  Built by&nbsp;
            <a
                href="https://runbeam.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 transition-colors"
            >
              Runbeam.io
            </a>
              </span>
            <a
              href="https://github.com/aurabx/fhirbird"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:text-orange-700 transition-colors underline"
            >
              GitHub
            </a>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 underline">
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

        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <span>Created by <a href="https://runbeam.io" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 transition-colors">Runbeam.io</a></span>
              <span className="hidden md:inline">·</span>
              <span>© Aurabox Pty Ltd 2025</span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <a href="https://github.com/aurabx/fhirbird" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                Fork me on GitHub
              </a>
              <span className="hidden md:inline">·</span>
              <span className="text-gray-500 text-xs">No warranties</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
