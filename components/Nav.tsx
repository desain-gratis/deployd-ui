"use client";

import Link from 'next/link';
import React from 'react';
import { useNamespace } from '../context/NamespaceContext';

export default function Nav() {
  const { namespace, setNamespace } = useNamespace();

  return (
    <header className="w-full py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="container flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">Deployd UI</Link>
        <div className="flex items-center gap-4">
          <nav className="hidden sm:block">
            <Link href="/host/list" className="mr-4 text-sm">Host</Link>
            <Link href="/service/list" className="mr-4 text-sm">Service</Link>
            <Link href="/website/list" className="mr-4 text-sm">Website</Link>
            <Link href="/repository/list" className="text-sm">Repository</Link>
          </nav>
          <div className="relative">
            <select value={namespace} onChange={(e) => setNamespace(e.target.value as any)} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm">
              <option value="*">*</option>
              <option value="deployd">deployd</option>
            </select>
          </div>
          <details className="relative">
            <summary
              aria-label="More options"
              title="More options"
              className="list-none cursor-pointer rounded px-2 py-1 text-xl leading-none hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              ⋮
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 min-w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <Link
                href="/settings"
                className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Settings
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
