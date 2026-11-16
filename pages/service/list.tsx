"use client";

import FlexSearch from "flexsearch";
import LocalListControls from "../../components/LocalListControls";
import { groupLocalItems, type LocalListSort } from "../../lib/localList";
import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useNamespace } from '../../context/NamespaceContext';
import { useApiEndpoint } from '../../context/ApiEndpointContext';
import { formatLocalDateTime, formatRelativeTime } from '../../lib/time';

type Repository = {
  url?: string;
  namespace?: string;
  id?: string;
};

type BoundAddress = {
  host?: string;
  port?: number;
};

type Service = {
  namespace: string;
  id: string;
  name?: string;
  description?: string;
  repository?: Repository;
  executable_path?: string;
  bound_addresses?: BoundAddress[];
  published_at?: string;
  url?: string;
};

export default function ServicePage() {
  const { namespace } = useNamespace();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState<LocalListSort>("alphabetical");

  const { apiEndpoint } = useApiEndpoint();
  
  useEffect(() => {
    let mounted = true;
    const fetchServices = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiEndpoint}/deployd/service`, {
          headers: { 'X-Namespace': namespace }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) setServices(Array.isArray(data.success) ? data.success : []);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load services');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchServices();
  
  return () => {
      mounted = false;
    };
  }, [apiEndpoint, namespace]);

  const searchIndex = useMemo(() => {
    const index = new FlexSearch.Index({ tokenize: "forward" });
    services.forEach((item, id) => {
      index.add(String(id), [item.name, item.id, item.description, item.namespace, item.repository?.namespace, item.repository?.id, item.repository?.url, ...(item.bound_addresses || []).flatMap((address) => [address.host, address.port])].filter(Boolean).join(" "));
    });
    return index;
  }, [services]);
  const groups = useMemo(() => {
    const query = searchText.trim();
    const matches = query ? new Set<string>(searchIndex.search(query).map(String)) : null;
    const filtered = matches ? services.filter((_, id) => matches.has(String(id))) : services;
    return groupLocalItems(filtered, sort, (s: Service) => s.name || s.id, (s: Service) => s.published_at);
  }, [services, searchIndex, searchText, sort]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Services</h2>
        <Link
          href="/service/create"
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Create service
        </Link>
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400">
          ← Back
        </Link>
      </div>

      <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">Using namespace: {namespace}</div>

      {loading && <div className="text-sm">Loading services...</div>}
      <LocalListControls searchText={searchText} onSearchTextChange={setSearchText} sort={sort} onSortChange={setSort} count={groups.reduce((total, group) => total + group.items.length, 0)} total={services.length} placeholder="Search name, ID, description, repository, address..." />
      {groups.length === 0 && <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700">No matching records.</div>}
      {groups.map((group) => (
        <section key={group.label} className="mb-5">
          <h3 className="mb-2 border-b border-gray-200 pb-1 text-sm font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">{group.label}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((s) => (
              <Link key={`${s.namespace}_${s.id}`} href={`/service/?namespace=${encodeURIComponent(s.namespace)}&id=${encodeURIComponent(s.id)}`} className="card block">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">{s.name ?? s.id}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{s.description}</div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{s.published_at ? <span title={formatLocalDateTime(s.published_at)}>{formatRelativeTime(s.published_at)}</span> : '—'}</div>
                </div>
                <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">{s.repository?.namespace}/{s.repository?.id}</div>
                {s.bound_addresses && s.bound_addresses.length > 0 && <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">{s.bound_addresses.map((b, i) => <div key={i}>{b.host}:{b.port}</div>)}</div>}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
