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
  published_at?: string;
};

function getErrorMessage(data: any, fallback: string) {
  return (
    data?.error?.errors?.[0]?.message ||
    data?.error?.message ||
    (typeof data?.error === "string" ? data.error : null) ||
    data?.message ||
    fallback
  );
}

export default function CreateServicePage() {
  const router = useRouter();
  const { namespace: ns2 } = useNamespace();
  const { apiEndpoint } = useApiEndpoint();

  const [repositories, setRepositories] = useState<ArtifactRepository[]>([]);
  const [repositoriesLoading, setRepositoriesLoading] = useState(false);
  const [repositoriesError, setRepositoriesError] = useState<string | null>(null);

    const [namespace, setNamespace] = useState("");
  const [serviceID, setServiceID] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [executablePath, setExecutablePath] = useState("");
  const [repositorySearch, setRepositorySearch] = useState("");
  const [selectedRepository, setSelectedRepository] =
    useState<ArtifactRepository | null>(null);
  const [repositoryMenuOpen, setRepositoryMenuOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repositoryPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!apiEndpoint) return;

    let mounted = true;

    const fetchRepositories = async () => {
      setRepositoriesLoading(true);
      setRepositoriesError(null);

      try {
        const response = await fetch(`${apiEndpoint}/artifactd/repository`, {
          headers: { "X-Namespace": namespace },
        });

        const data = await response.json().catch(() => null);
        if (!response.ok || data?.error) {
          throw new Error(
            getErrorMessage(data, `Failed to load artifacts (HTTP ${response.status})`)
          );
        }

        if (mounted) {
          const items = Array.isArray(data?.success) ? data.success : [];
          setRepositories(items);
        }
      } catch (err: any) {
        if (mounted) {
          setRepositoriesError(err?.message || "Failed to load artifacts");
        }
      } finally {
        if (mounted) setRepositoriesLoading(false);
      }
    };

    fetchRepositories();

    return () => {
      mounted = false;
    };
  }, [apiEndpoint, namespace]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        repositoryPickerRef.current &&
        !repositoryPickerRef.current.contains(event.target as Node)
      ) {
        setRepositoryMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
    
    useEffect(() => {
        if (selectedRepository?.namespace !== namespace) {
            setSelectedRepository(null);
        }
    }, [namespace, selectedRepository]);

  const filteredRepositories = useMemo(() => {
    const query = repositorySearch.trim().toLowerCase();
    if (!query) return repositories;

    return repositories.filter((repository) =>
      [
        repository.name,
        repository.id,
        repository.namespace,
        repository.source,
        repository.url,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [repositories, repositorySearch]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!apiEndpoint) {
      setError("API endpoint is not configured.");
      return;
    }

    if (!serviceID.trim()) {
      setError("Service ID is required.");
      return;
    }

    if (!selectedRepository) {
      setError("Select an artifact repository.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        namespace,
        id: serviceID.trim(),
        name: name.trim(),
        description: description.trim(),
        repository: {
          url: selectedRepository.url || "",
          namespace: selectedRepository.namespace,
          id: selectedRepository.id,
        },
        executable_path: executablePath.trim(),
      };

      const response = await fetch(`${apiEndpoint}/deployd/service`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Namespace": namespace,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.error) {
        throw new Error(
          getErrorMessage(data, `Failed to create service (HTTP ${response.status})`)
        );
      }

      const createdService = data?.success?.service || data?.success || payload;
      const createdID = createdService?.id || payload.id;

      await router.push(
        `/service/?namespace=${encodeURIComponent(namespace)}&id=${encodeURIComponent(createdID)}`
      );
    } catch (err: any) {
      setError(err?.message || "Failed to create service");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Create a new service</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Register a service and link it to an artifact repository.
          </p>
        </div>
        <Link
          href="/service/list"
          className="shrink-0 text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Back to services
        </Link>
      </div>

      <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900/50">
        <span className="text-gray-500 dark:text-gray-400">Namespace</span>
              <span className="ml-2 font-medium">{namespace}</span>
          <label htmlFor="service-id" className="mb-1.5 block text-sm font-medium">
            Namespace <span className="text-red-500">*</span>
          </label>
          <input
            id="namespace"
            value={namespace}
            onChange={(event) => setNamespace(event.target.value)}
            placeholder="e.g. deployd"
            className={inputClass}
            required
            autoComplete="off"
          />
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-950"
      >
        <div>
          <label htmlFor="service-id" className="mb-1.5 block text-sm font-medium">
            Service ID <span className="text-red-500">*</span>
          </label>
          <input
            id="service-id"
            value={serviceID}
            onChange={(event) => setServiceID(event.target.value)}
            placeholder="e.g. my-api"
            className={inputClass}
            required
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Unique identifier used by Deployd for this service.
          </p>
        </div>

        <div>
          <label htmlFor="service-name" className="mb-1.5 block text-sm font-medium">
            Name
          </label>
          <input
            id="service-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="My API"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="service-description" className="mb-1.5 block text-sm font-medium">
            Description
          </label>
          <textarea
            id="service-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What does this service do?"
            rows={3}
            className={inputClass}
          />
        </div>

        <div ref={repositoryPickerRef} className="relative">
          <label className="mb-1.5 block text-sm font-medium">
            Artifact repository <span className="text-red-500">*</span>
          </label>

          <button
            type="button"
            onClick={() => setRepositoryMenuOpen((open) => !open)}
            className={`${inputClass} flex items-center justify-between gap-3 text-left`}
            aria-expanded={repositoryMenuOpen}
          >
            <span className={selectedRepository ? "truncate" : "text-gray-500"}>
              {selectedRepository
                ? `${selectedRepository.namespace}/${selectedRepository.name || selectedRepository.id}`
                : "Select an artifact repository"}
            </span>
            <span className="text-gray-500" aria-hidden="true">⌄</span>
          </button>

          {repositoryMenuOpen && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
              <div className="border-b border-gray-200 p-2 dark:border-gray-700">
                <input
                  autoFocus
                  value={repositorySearch}
                  onChange={(event) => setRepositorySearch(event.target.value)}
                  placeholder="Search by name, ID, namespace, or source..."
                  className={inputClass}
                />
              </div>

              <div className="max-h-64 overflow-y-auto p-1">
                {repositoriesLoading && (
                  <div className="px-3 py-4 text-sm text-gray-500">
                    Loading artifact repositories...
                  </div>
                )}

                {!repositoriesLoading && repositoriesError && (
                  <div className="px-3 py-3 text-sm text-red-600">
                    {repositoriesError}
                  </div>
                )}

                {!repositoriesLoading &&
                  !repositoriesError &&
                  filteredRepositories.length === 0 && (
                    <div className="px-3 py-4 text-sm text-gray-500">
                      {repositories.length === 0
                        ? "No artifact repositories found in this namespace."
                        : "No repositories match your search."}
                    </div>
                  )}

                {!repositoriesLoading &&
                  !repositoriesError &&
                  filteredRepositories.map((repository) => {
                    const selected =
                      selectedRepository?.namespace === repository.namespace &&
                      selectedRepository?.id === repository.id;

                    return (
                      <button
                        key={`${repository.namespace}/${repository.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedRepository(repository);
                          setRepositorySearch("");
                          setRepositoryMenuOpen(false);
                        }}
                        className={`block w-full rounded-md px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 ${
                          selected ? "bg-blue-50 dark:bg-blue-950/40" : ""
                        }`}
                      >
                        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                          {repository.name || repository.id}
                        </span>
                        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                          {repository.namespace}/{repository.id}
                          {repository.source ? ` · ${repository.source}` : ""}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {selectedRepository && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-gray-900">
              <span className="min-w-0 truncate text-gray-600 dark:text-gray-300">
                Linked: {selectedRepository.namespace}/{selectedRepository.id}
              </span>
              <button
                type="button"
                onClick={() => setSelectedRepository(null)}
                className="shrink-0 text-red-600 hover:underline dark:text-red-400"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="executable-path" className="mb-1.5 block text-sm font-medium">
            Executable path
          </label>
          <input
            id="executable-path"
            value={executablePath}
            onChange={(event) => setExecutablePath(event.target.value)}
            placeholder="e.g. ./server"
            className={inputClass}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <Link
            href="/service/list"
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || repositoriesLoading || !selectedRepository}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create service"}
          </button>
        </div>
      </form>
    </div>
  );
}
