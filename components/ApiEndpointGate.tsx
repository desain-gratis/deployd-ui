"use client";

import React, { useState } from 'react';
import { useApiEndpoint } from '../context/ApiEndpointContext';

export default function ApiEndpointGate({ children }: { children: React.ReactNode }) {
  const { apiEndpoint, setApiEndpoint, isLoaded } = useApiEndpoint();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  // Avoid flashing content/modal before we've checked localStorage
  if (!isLoaded) return null;

  if (!apiEndpoint) {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const value = input.trim();
      if (!value) {
        setError('Please enter an API endpoint.');
        return;
      }
      try {
        new URL(value); // basic validation
      } catch {
        setError('Please enter a valid URL (e.g. https://api.example.com).');
        return;
      }
      setApiEndpoint(value);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-background border rounded-lg shadow-lg p-6 w-full max-w-md">
          <h2 className="text-lg font-semibold mb-2">Set API Endpoint</h2>
          <p className="text-sm text-muted-foreground mb-4">
            No API endpoint is configured. Enter the base URL to continue.
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://api.example.com"
              className="w-full border rounded px-3 py-2 mb-2 bg-transparent"
            />
            {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground rounded px-3 py-2"
            >
              Save & Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}