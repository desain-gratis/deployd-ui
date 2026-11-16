"use client";

import FlexSearch from "flexsearch";
import LocalListControls from "../../components/LocalListControls";
import { groupLocalItems, type LocalListSort } from "../../lib/localList";
import React, { useEffect, useState, useMemo } from 'react';
import Link from "next/link";
import { useNamespace } from "../../context/NamespaceContext";
import { useApiEndpoint } from "../../context/ApiEndpointContext";
import { formatLocalDateTime, formatRelativeTime } from "../../lib/time";

type Website = {
  namespace: string;
  host_address: string;
  name: string;
  description: string;
  artifact_id: string;
  url: string;
  published_at: string;
};

export default function WebsiteListPage() {
  const { namespace } = useNamespace();
  const { apiEndpoint } = useApiEndpoint();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notReady, setNotReady] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState<LocalListSort>("alphabetical");
  const [selectedFilter, setSelectedFilter] = useState("");

  useEffect(() => {
    if (!apiEndpoint) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setNotReady(false);
      try {
        const response = await fetch(`${apiEndpoint}/deployd/website`, {
          headers: { "X-Namespace": namespace },
        });
        if (response.status === 404) {
          if (mounted) setNotReady(true);
          return;
        }
        const data = await response.json().catch(() => null);
        if (!response.ok || data?.error) {
          throw new Error(data?.error?.message || data?.message || `HTTP ${response.status}`);
        }
        if (mounted) setWebsites(Array.isArray(data?.success) ? data.success : []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Failed to load websites");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
  
  return () => { mounted = false; };
  }, [apiEndpoint, namespace]);

  const searchIndex = useMemo(() => {
    const index = new FlexSearch.Index({ tokenize: "forward" });
    websites.forEach((item, id) => {
      index.add(String(id), [item.name, item.host_address, item.description, item.artifact_id, item.namespace, item.url].filter(Boolean).join(" "));
    });
    return index;
  }, [websites]);
  const groups = useMemo(() => {
    const query = searchText.trim();
    const matches = query ? new Set<string>(searchIndex.search(query).map(String)) : null;
    const filtered = matches ? websites.filter((_, id) => matches.has(String(id))) : websites;
    const facetFiltered = selectedFilter ? filtered.filter((website) => (website.artifact_id || "") === selectedFilter) : filtered;
    return groupLocalItems(facetFiltered, sort, (website: Website) => website.name || website.host_address, (website: Website) => website.published_at);
  }, [websites, searchIndex, searchText, sort, selectedFilter]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Websites</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Using namespace: {namespace}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/website/create" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">+ Add website</Link>
          <Link href="/" className="text-sm text-blue-600 dark:text-blue-400">← Back</Link>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading websites...</div>}
      {error && <div className="text-sm text-red-600">Error: {error}</div>}
      {notReady && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          The website API is not available yet (HTTP 404). This page will show registered websites once the endpoint is enabled.
        </div>
      )}
      {!loading && !error && !notReady && websites.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">No websites found in this namespace.</div>
      )}
      <LocalListControls searchText={searchText} onSearchTextChange={setSearchText} sort={sort} onSortChange={setSort} count={groups.reduce((total, group) => total + group.items.length, 0)} total={websites.length} placeholder="Search website name, hostname, description, artifact, URL..." filterLabel="Artifact ID" filterValue={selectedFilter} onFilterChange={setSelectedFilter} filterOptions={Array.from(new Set(websites.map((website) => website.artifact_id).filter(Boolean))).map((value) => ({ label: value, value }))} />
      {groups.length === 0 && <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700">No matching records.</div>}
      {groups.map((group) => (
        <section key={group.label} className="mb-5">
          <h3 className="mb-2 border-b border-gray-200 pb-1 text-sm font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">{group.label}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((website) => (
              <Link key={`${website.namespace}/${website.host_address}`} href={`/deployd/website?id=${encodeURIComponent(website.host_address)}`} className="card block">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold">{website.name || website.host_address}</div>
                    <div className="mt-1 break-all text-sm text-blue-600 dark:text-blue-400">{website.host_address}</div>
                  </div>
                  <div className="shrink-0 text-xs text-gray-500">{website.published_at ? <span title={formatLocalDateTime(website.published_at)}>{formatRelativeTime(website.published_at)}</span> : "—"}</div>
                </div>
                {website.description && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{website.description}</p>}
                <div className="mt-3 break-all text-xs text-gray-500 dark:text-gray-400">Artifact: {website.artifact_id || "—"}</div>
                {website.url && <div className="mt-1 break-all text-xs text-gray-500 dark:text-gray-400">{website.url}</div>}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
