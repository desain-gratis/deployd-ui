"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useNamespace } from "../../context/NamespaceContext";
import { useApiEndpoint } from "../../context/ApiEndpointContext";

type ArtifactRepository = {
  id: string;
  namespace: string;
  name?: string;
  source?: string;
  url?: string;
};

function errorMessage(data: any, fallback: string) {
  return data?.error?.errors?.[0]?.message || data?.error?.message ||
    (typeof data?.error === "string" ? data.error : null) || data?.message || fallback;
}

export default function CreateWebsitePage() {
  const router = useRouter();
  const { namespace } = useNamespace();
  const { apiEndpoint } = useApiEndpoint();

  const [websiteNamespace, setWebsiteNamespace] = useState(namespace || "");
  const [namespaceEdited, setNamespaceEdited] = useState(false);
  const [hostAddress, setHostAddress] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [listenAddress, setListenAddress] = useState("");
  const [custom404Page, setCustom404Page] = useState("");
  const [repositories, setRepositories] = useState<ArtifactRepository[]>([]);
  const [repositorySearch, setRepositorySearch] = useState("");
  const [selectedRepository, setSelectedRepository] = useState<ArtifactRepository | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [repositoriesLoading, setRepositoriesLoading] = useState(false);
  const [repositoriesError, setRepositoriesError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!namespaceEdited && namespace) setWebsiteNamespace(namespace);
  }, [namespace, namespaceEdited]);

  useEffect(() => {
    if (!apiEndpoint || !websiteNamespace.trim() || websiteNamespace.trim() === "*") {
      setRepositories([]);
      return;
    }
    let mounted = true;
    const load = async () => {
      setRepositoriesLoading(true);
      setRepositoriesError(null);
      try {
        const response = await fetch(`${apiEndpoint}/artifactd/repository`, {
          headers: { "X-Namespace": websiteNamespace.trim() },
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || data?.error) throw new Error(errorMessage(data, `HTTP ${response.status}`));
        if (mounted) setRepositories(Array.isArray(data?.success) ? data.success : []);
      } catch (err: any) {
        if (mounted) setRepositoriesError(err?.message || "Failed to load artifact repositories");
      } finally {
        if (mounted) setRepositoriesLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [apiEndpoint, websiteNamespace]);

  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const filteredRepositories = useMemo(() => {
    const q = repositorySearch.trim().toLowerCase();
    if (!q) return repositories;
    return repositories.filter((repository) =>
      [repository.name, repository.id, repository.namespace, repository.source, repository.url]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(q))
    );
  }, [repositories, repositorySearch]);

  const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const ns = websiteNamespace.trim();
    const host = hostAddress.trim();
    if (!apiEndpoint) return setError("API endpoint is not configured.");
    if (!ns || ns === "*") return setError('Enter a writable namespace. The "*" namespace is read-only.');
    if (!host) return setError("Host name is required.");
    if (!selectedRepository) return setError("Select an artifact repository.");

    setSubmitting(true);
    try {
      const payload = {
        namespace: ns,
        host_address: host,
        name: name.trim(),
        description: description.trim(),
        artifact_id: selectedRepository.id,
        listen_address: listenAddress.trim(),
        custom_404_page: custom404Page.trim(),
      };
      const response = await fetch(`${apiEndpoint}/deployd/website`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Namespace": ns },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.error) throw new Error(errorMessage(data, `Failed to create website (HTTP ${response.status})`));
      await router.push(`/deployd/website?id=${encodeURIComponent(host)}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create website");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Add website</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Register a website and associate it with an artifact repository.</p>
        </div>
        <Link href="/website/list" className="shrink-0 text-sm text-blue-600 dark:text-blue-400">← Back to websites</Link>
      </div>

      <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50">
        <label className="mb-1.5 block text-sm font-medium">Namespace <span className="text-red-500">*</span></label>
        <input value={websiteNamespace} onChange={(e) => { setWebsiteNamespace(e.target.value); setNamespaceEdited(true); setSelectedRepository(null); }} className={inputClass} placeholder="e.g. production" required />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Defaults to your current namespace. The "*" namespace is read-only.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-950">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Host address <span className="text-red-500">*</span></label>
          <input value={hostAddress} onChange={(e) => setHostAddress(e.target.value)} className={inputClass} placeholder="www.example.com" required autoComplete="off" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="My website" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} rows={3} placeholder="Website description" />
        </div>
        <div ref={pickerRef} className="relative">
          <label className="mb-1.5 block text-sm font-medium">Artifact repository <span className="text-red-500">*</span></label>
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className={`${inputClass} flex items-center justify-between gap-3 text-left`} aria-expanded={menuOpen}>
            <span className={selectedRepository ? "truncate" : "text-gray-500"}>{selectedRepository ? `${selectedRepository.namespace}/${selectedRepository.name || selectedRepository.id}` : "Select an artifact repository"}</span>
            <span className="text-gray-500">⌄</span>
          </button>
          {menuOpen && <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-200 p-2 dark:border-gray-700"><input autoFocus value={repositorySearch} onChange={(e) => setRepositorySearch(e.target.value)} placeholder="Search name, ID, namespace, or source..." className={inputClass} /></div>
            <div className="max-h-64 overflow-y-auto p-1">
              {repositoriesLoading && <div className="px-3 py-4 text-sm text-gray-500">Loading repositories...</div>}
              {repositoriesError && <div className="px-3 py-3 text-sm text-red-600">{repositoriesError}</div>}
              {!repositoriesLoading && !repositoriesError && filteredRepositories.length === 0 && <div className="px-3 py-4 text-sm text-gray-500">No matching repositories found.</div>}
              {!repositoriesLoading && !repositoriesError && filteredRepositories.map((repository) => <button key={`${repository.namespace}/${repository.id}`} type="button" onClick={() => { setSelectedRepository(repository); setRepositorySearch(""); setMenuOpen(false); }} className="block w-full rounded-md px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800">
                <span className="block text-sm font-medium">{repository.name || repository.id}</span>
                <span className="mt-0.5 block text-xs text-gray-500">{repository.namespace}/{repository.id}{repository.source ? ` · ${repository.source}` : ""}</span>
              </button>)}
            </div>
          </div>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Listen address</label>
          <input value={listenAddress} onChange={(e) => setListenAddress(e.target.value)} className={inputClass} placeholder=":8080 or 127.0.0.1:8080" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Custom 404 page</label>
          <textarea value={custom404Page} onChange={(e) => setCustom404Page(e.target.value)} className={inputClass} rows={3} placeholder="Optional custom 404 page content or configuration" />
        </div>
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
        <div className="flex justify-end gap-2">
          <Link href="/website/list" className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">Cancel</Link>
          <button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{submitting ? "Creating..." : "Create website"}</button>
        </div>
      </form>
    </div>
  );
}
