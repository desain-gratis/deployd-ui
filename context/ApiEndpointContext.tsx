"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const STORAGE_KEY = 'apiEndpoint';

type ApiEndpointContext = {
  apiEndpoint: string;
  setApiEndpoint: (url: string) => void;
  isLoaded: boolean; // true once we've checked localStorage
};

const ApiEndpointContext = createContext<ApiEndpointContext | undefined>(undefined);

export const ApiEndpointProvider = ({ children }: { children: ReactNode }) => {
  const [apiEndpoint, setApiEndpointState] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) ?? '';
    setApiEndpointState(stored);
    setIsLoaded(true);
  }, []);

  const setApiEndpoint = (url: string) => {
    const trimmed = url.trim().replace(/\/+$/, ''); // strip trailing slash
    window.localStorage.setItem(STORAGE_KEY, trimmed);
    setApiEndpointState(trimmed);
  };

  return (
    <ApiEndpointContext.Provider value={{ apiEndpoint, setApiEndpoint, isLoaded }}>
      {children}
    </ApiEndpointContext.Provider>
  );
};

export const useApiEndpoint = () => {
  const ctx = useContext(ApiEndpointContext);
  if (!ctx) throw new Error('useApiEndpoint must be used within ApiEndpointProvider');
  return ctx;
};

export default ApiEndpointContext;