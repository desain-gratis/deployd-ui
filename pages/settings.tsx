"use client";

import React, { useEffect, useState } from 'react';
import { useApiEndpoint } from '../context/ApiEndpointContext';

export default function SettingsPage() {
  const { apiEndpoint, setApiEndpoint, isLoaded } = useApiEndpoint();
  const [endpoint, setEndpoint] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoaded) setEndpoint(apiEndpoint);
  }, [apiEndpoint, isLoaded]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const value = endpoint.trim();

    if (!value) {
      setError('Please enter an API endpoint.');
      setSaved(false);
      return;
    }

    try {
      new URL(value);
    } catch {
      setError('Please enter a valid URL (e.g. https://api.example.com).');
      setSaved(false);
      return;
    }

    setApiEndpoint(value);
    setEndpoint(value.replace(/\\/+$/, ''));
    setError('');
    setSaved(true);
  };

  if (!isLoaded) return null;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure application-wide settings for this browser.
        </p>
      </div>

      <section className="rounded-lg border border-gray-200 p-5 dark:border-gray-700">
        <h2 className="text-base font-semibold">API Endpoint</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          The base URL used by Deployd UI to communicate with the API. This value is stored locally in this browser.
        </p>

        <form onSubmit={handleSave}>
          <label htmlFor="api-endpoint" className="mb-1 block text-sm font-medium">
            Base URL
          </label>
          <input
            id="api-endpoint"
            type="url"
            value={endpoint}
            onChange={(e) => {
              setEndpoint(e.target.value);
              setSaved(false);
              setError('');
            }}
            placeholder="https://api.example.com"
            className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
          />
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          {saved && <p className="mt-2 text-sm text-green-600 dark:text-green-400">API endpoint saved.</p>}

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={!endpoint.trim() || endpoint.trim().replace(/\\/+$/, '') === apiEndpoint}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save changes
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
