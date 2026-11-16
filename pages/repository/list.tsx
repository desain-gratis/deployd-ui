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
  id: string;
  namespace: string;
  name?: string;
  source?: string;
  published_at?: string;
  url?: string;
};

export default function ArtifactPage() {
  const { namespace } = useNamespace();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState<LocalListSort>("alphabetical");

  const { apiEndpoint } = useApiEndpoint();
  

  useEffect(() => {
    let mounted = true;
    const fetchRepos = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiEndpoint}/artifactd/repository`, {
          headers: { 'X-Namespace': namespace }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) setRepos(Array.isArray(data.success) ? data.success : []);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load repositories');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRepos();
  
  return () => {
      mounted = false;
    };
  }, [namespace, apiEndpoint]);

  const searchIndex = useMemo(() => {
    const index = new FlexSearch.Index({ tokenize: "forward" });
    repos.forEach((item, id) => {
      index.add(String(id), [item.name, item.id, item.source, item.namespace, item.url].filter(Boolean).join(" "));
    });
    return index;
  }, [repos]);
  const groups = useMemo(() => {
    const query = searchText.trim();
    const matches = query ? new Set<string>(searchIndex.search(query).map(String)) : null;
    const filtered = matches ? repos.filter((_, id) => matches.has(String(id))) : repos;
    return groupLocalItems(filtered, sort, (r: Repository) => r.name || r.id, (r: Repository) => r.published_at);
  }, [repos, searchIndex, searchText, sort]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Repositories</h2>
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400">
          ← Back
        </Link>
      </div>

      <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">Using namespace: {namespace}</div>

      {loading && <div className="text-sm">Loading repositories...</div>}
      <LocalListControls searchText={searchText} onSearchTextChange={setSearchText} sort={sort} onSortChange={setSort} count={groups.reduce((total, group) => total + group.items.length, 0)} total={repos.length} placeholder="Search repository name, ID, source, namespace, URL..." />
      {groups.length === 0 && <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700">No matching records.</div>}
      {groups.map((group) => (
        <section key={group.label} className="mb-5">
          <h3 className="mb-2 border-b border-gray-200 pb-1 text-sm font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">{group.label}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((r) => (
              <Link key={`${r.namespace}_${r.id}`} href={`/repository?namespace=${encodeURIComponent(r.namespace)}&id=${encodeURIComponent(r.id)}`} className="card block">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">{r.name ?? r.id}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{r.source}</div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{r.published_at ? <span title={formatLocalDateTime(r.published_at)}>{formatRelativeTime(r.published_at)}</span> : '—'}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
