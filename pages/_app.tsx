"use client";

import React from 'react';
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { NamespaceProvider } from '../context/NamespaceContext';
import Nav from '../components/Nav';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NamespaceProvider>
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="container py-8">
          <Component {...pageProps} />
        </main>
      </div>
    </NamespaceProvider>
  );
}
