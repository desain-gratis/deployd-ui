"use client";

import React from 'react';
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { NamespaceProvider } from '../context/NamespaceContext';
import Nav from '../components/Nav';
import { ThemeProvider } from 'next-themes';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NamespaceProvider>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <div className="min-h-screen flex flex-col">
          <Nav />
          <main className="container py-8">
            <Component {...pageProps} />
          </main>
        </div>
      </ThemeProvider>
    </NamespaceProvider>
  );
}
