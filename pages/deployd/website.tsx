"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Modal from "../../components/Modal";
import { useNamespace } from "../../context/NamespaceContext";
import { useApiEndpoint } from "../../context/ApiEndpointContext";
import { formatLocalDateTime, formatRelativeTime } from "../../lib/time";

type Website = {
  namespace: string; host_address: string; name: string; description: string;
  artifact_id: string; custom_404_page?: string; listen_address?: string; url: string; published_at: string;
};
type Build = { id: string; name?: string; branch?: string; commit_id?: string; actor?: string; repository_id?: string; published_at?: string };
type HostUpdateResult = { status: string; error?: string; message: string; host_id: string; job_id: string; time?: string };
type WebsiteJob = {
  namespace: string; id: string; status: string; result?: Record<string, HostUpdateResult>;
  request: { website: Website; build_id?: string; from_url?: string };
  url?: string; published_at?: string; finished_at?: string;
};

const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

function getError(data: any, fallback: string) {
  return data?.error?.errors?.[0]?.message || data?.error?.message ||
    (typeof data?.error === "string" ? data.error : null) || data?.message || fallback;
}
function statusClass(status?: string) {
  if (status === "SUCCESS" || status === "DEPLOYED" || status === "CONFIGURED") return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
  if (status === "FAILED" || status === "TIMEOUT" || status === "CANCELLED") return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200";
  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200";
}

export default function WebsiteDetailPage() {
  const router = useRouter();
  const hostname = typeof router.query.id === "string" ? router.query.id : "";
  const { namespace: currentNamespace } = useNamespace();
  const { apiEndpoint } = useApiEndpoint();

  const [website, setWebsite] = useState<Website | null>(null);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [jobs, setJobs] = useState<WebsiteJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeploy, setShowDeploy] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [sourceMode, setSourceMode] = useState<"build" | "url">("build");
  const [buildID, setBuildID] = useState("");
  const [fromUrl, setFromUrl] = useState("");

  const loadWebsite = useCallback(async () => {
    if (!apiEndpoint || !hostname) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiEndpoint}/deployd/website?id=${encodeURIComponent(hostname)}`, {
        headers: { "X-Namespace": currentNamespace },
      });
      if (response.status === 404) {
        setWebsite(null);
        setError("Website endpoint or website was not found (HTTP 404).");
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.error) throw new Error(getError(data, `HTTP ${response.status}`));
      const value = data?.success;
      const found = Array.isArray(value) ? value.find((item: Website) => item.host_address === hostname) : value;
      setWebsite(found?.website || found || null);
    } catch (err: any) {
      setError(err?.message || "Failed to load website");
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, hostname, currentNamespace]);

  useEffect(() => { loadWebsite(); }, [loadWebsite]);

  useEffect(() => {
    if (!apiEndpoint || !website?.namespace) return;
    let mounted = true;
    const headers = { "X-Namespace": website.namespace };
    const load = async () => {
      try {
        const jobResponse = await fetch(
          `${apiEndpoint}/deployd/job/deploy-website?host_address=${encodeURIComponent(website.host_address)}`,
          { headers },
        );
        if (jobResponse.ok) {
          const data = await jobResponse.json();
          const value = data?.success;
          const list = Array.isArray(value) ? value : value ? [value] : [];
          list.sort((a: WebsiteJob, b: WebsiteJob) => Date.parse(b.published_at || "") - Date.parse(a.published_at || ""));
          if (mounted) setJobs(list);
        }
      } catch {
        // Website details remain usable if optional host/job endpoints are unavailable.
      }
    };
    load();
    return () => { mounted = false; };
  }, [apiEndpoint, website]);

  useEffect(() => {
    if (!apiEndpoint || !website?.namespace || !website?.artifact_id) {
      setBuilds([]);
      return;
    }
    let mounted = true;
    fetch(`${apiEndpoint}/artifactd/build?repository=${encodeURIComponent(website.artifact_id)}`, {
      headers: { "X-Namespace": website.namespace },
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const list = Array.isArray(data?.success) ? data.success : [];
      const matching = list.filter((build: Build) => !build.repository_id || build.repository_id === website.artifact_id);
      matching.sort((a: Build, b: Build) => Date.parse(b.published_at || "") - Date.parse(a.published_at || ""));
      if (mounted) {
        setBuilds(matching);
        setBuildID(matching[0]?.id || "");
      }
    }).catch(() => { if (mounted) setBuilds([]); });
    return () => { mounted = false; };
  }, [apiEndpoint, website]);

  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deletingWebsite, setDeletingWebsite] = useState(false);
  const [settings, setSettings] = useState<Website | null>(null);

  useEffect(() => {
    if (website) setSettings({ ...website });
  }, [website]);

  const saveWebsiteSettings = async () => {
    if (!settings || !apiEndpoint) return;
    setSettingsError(null);
    setSavingSettings(true);
    try {
      const response = await fetch(`${apiEndpoint}/deployd/website`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Namespace": settings.namespace },
        body: JSON.stringify(settings),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.error) throw new Error(getError(data, `HTTP ${response.status}`));
      const updated = data?.success?.website || data?.success;
      if (updated && typeof updated === "object" && updated.host_address) {
        setWebsite(updated);
        setSettings(updated);
      } else {
        setWebsite(settings);
      }
    } catch (err: any) {
      setSettingsError(err?.message || "Failed to save website settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const deleteWebsite = async () => {
    if (!website || !apiEndpoint) return;
    if (!window.confirm(`Delete website "${website.host_address}"? This action cannot be undone.`)) return;
    setSettingsError(null);
    setDeletingWebsite(true);
    try {
      const response = await fetch(`${apiEndpoint}/deployd/website`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "X-Namespace": website.namespace },
        body: JSON.stringify(website),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.error) throw new Error(getError(data, `HTTP ${response.status}`));
      await router.push("/website/list");
    } catch (err: any) {
      setSettingsError(err?.message || "Failed to delete website");
    } finally {
      setDeletingWebsite(false);
    }
  };

  const latestJob = jobs[0];

  const openDeploy = async () => {
    setDeployError(null);
    setSourceMode("build");
    setFromUrl("");
    setBuildID((current) => current || builds[0]?.id || "");
    setShowDeploy(true);
  };

  const submitDeploy = async () => {
    if (!apiEndpoint || !website) return;
    setDeployError(null);
    if (sourceMode === "build" && !buildID) return setDeployError("Select a build.");
    if (sourceMode === "url" && !fromUrl.trim()) return setDeployError("Enter an archive URL.");
    const payload: any = { website };
    if (sourceMode === "url") payload.from_url = fromUrl.trim();
    else payload.build_id = buildID;

    setDeploying(true);
    try {
      const response = await fetch(
        `${apiEndpoint}/deployd/job/deploy-website?host_address=${encodeURIComponent(website.host_address)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Namespace": website.namespace },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.error) throw new Error(getError(data, `Failed to deploy website (HTTP ${response.status})`));
      const job = data?.success?.job || data?.success;
      if (job) setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]);
      setShowDeploy(false);
    } catch (err: any) {
      setDeployError(err?.message || "Failed to submit website deployment");
    } finally {
      setDeploying(false);
    }
  };

  const statusSummary = useMemo(() => {
    if (!latestJob) return "No deployment history";
    return latestJob.status || "Unknown";
  }, [latestJob]);

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{website?.name || hostname}</h2>
          <div className="mt-1 break-all text-sm text-blue-600 dark:text-blue-400">{hostname}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Namespace: {website?.namespace || currentNamespace}</div>
        </div>
        <Link href="/website/list" className="shrink-0 text-sm text-blue-600 dark:text-blue-400">← Back to websites</Link>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading website...</div>}
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      {website && <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {website.description && <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">{website.description}</p>}
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div><div className="text-xs text-gray-500">Artifact ID</div><div className="mt-1 font-mono">{website.artifact_id || "—"}</div></div>
              <div><div className="text-xs text-gray-500">Published</div><div className="mt-1">{website.published_at ? <span title={formatLocalDateTime(website.published_at)}>{formatRelativeTime(website.published_at)}</span> : "—"}</div></div>
              <div><div className="text-xs text-gray-500">Latest deployment</div><div className="mt-1"><span className={`rounded px-2 py-1 text-xs font-medium ${statusClass(statusSummary)}`}>{statusSummary}</span></div></div>
            </div>
          </div>
          <button onClick={openDeploy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Deploy website</button>
        </div>
      </div>}

      {website && settings && <div className="mb-6 space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-950">
          <div className="mb-5">
            <h3 className="text-lg font-semibold">Website settings</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Update website information and host configuration.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Namespace</label>
              <input value={settings.namespace} disabled className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Host address</label>
              <input value={settings.host_address} disabled className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Name</label>
              <input value={settings.name || ""} onChange={(e) => setSettings({ ...settings, name: e.target.value })} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <textarea rows={3} value={settings.description || ""} onChange={(e) => setSettings({ ...settings, description: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Artifact ID</label>
              <input value={settings.artifact_id || ""} onChange={(e) => setSettings({ ...settings, artifact_id: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Listen address</label>
              <input value={settings.listen_address || ""} onChange={(e) => setSettings({ ...settings, listen_address: e.target.value })} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Custom 404 page</label>
              <textarea rows={4} value={settings.custom_404_page || ""} onChange={(e) => setSettings({ ...settings, custom_404_page: e.target.value })} className={inputClass} />
            </div>
          </div>
          {settingsError && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{settingsError}</div>}
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={saveWebsiteSettings} disabled={savingSettings || deletingWebsite} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{savingSettings ? "Saving..." : "Save changes"}</button>
          </div>
        </section>
        <section className="rounded-xl border border-red-300 bg-white p-5 dark:border-red-900 dark:bg-gray-950">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Danger zone</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Permanently delete this website. This action cannot be undone.</p>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={deleteWebsite} disabled={deletingWebsite || savingSettings} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{deletingWebsite ? "Deleting..." : "Delete website"}</button>
          </div>
        </section>
      </div>}

      <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Deployment history</h3><span className="text-xs text-gray-500">{jobs.length} jobs</span></div>
      {jobs.length === 0 ? <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-500 dark:border-gray-700">No website deployment jobs found.</div> : (
        <div className="space-y-3">{jobs.map((job) => (
          <div key={job.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-sm">{job.id}</div>
              <span className={`rounded px-2 py-1 text-xs font-medium ${statusClass(job.status)}`}>{job.status}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-gray-500">{job.published_at && <span title={formatLocalDateTime(job.published_at)}>Published {formatRelativeTime(job.published_at)}</span>}{job.finished_at && <span title={formatLocalDateTime(job.finished_at)}>Finished {formatRelativeTime(job.finished_at)}</span>}</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(job.result || {}).map(([host, result]) => (
              <div key={host} className="rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-900">
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{host}</span><span className={`rounded px-2 py-0.5 text-xs ${statusClass(result.status)}`}>{result.status}</span></div>
                {result.message && <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{result.message}</p>}
                {result.error && <p className="mt-1 break-words text-xs text-red-600">{result.error}</p>}
                <div className="mt-1 text-xs text-gray-500">Host ID: {result.host_id || "—"} · Job ID: {result.job_id || "—"}</div>
              </div>
            ))}</div>
          </div>
        ))}</div>
      )}

      {showDeploy && <Modal title={`Deploy ${website?.host_address || "website"}`} onClose={() => !deploying && setShowDeploy(false)}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Deployment source</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSourceMode("build")} className={`rounded-md border px-3 py-2 text-sm ${sourceMode === "build" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40" : "border-gray-300 dark:border-gray-700"}`}>Artifact build</button>
              <button type="button" onClick={() => setSourceMode("url")} className={`rounded-md border px-3 py-2 text-sm ${sourceMode === "url" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40" : "border-gray-300 dark:border-gray-700"}`}>Archive URL</button>
            </div>
          </div>
          {sourceMode === "build" ? <div>
            <label className="mb-1 block text-sm font-medium">Build</label>
            <select value={buildID} onChange={(e) => setBuildID(e.target.value)} className={inputClass}>
              <option value="">Select a build</option>
              {builds.map((build) => <option key={build.id} value={build.id}>{build.id}{build.name ? ` · ${build.name}` : ""}{build.branch ? ` · ${build.branch}` : ""}</option>)}
            </select>
            {builds.length === 0 && <p className="mt-1 text-xs text-gray-500">No builds found for this artifact repository.</p>}
          </div> : <div>
            <label className="mb-1 block text-sm font-medium">Archive URL <span className="text-red-500">*</span></label>
            <input value={fromUrl} onChange={(e) => setFromUrl(e.target.value)} className={inputClass} placeholder="https://example.com/site.tar.gz" />
            <p className="mt-1 text-xs text-gray-500">Use a tar.gz archive URL. Repository and build IDs will be omitted.</p>
          </div>}

          {deployError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{deployError}</div>}
          <div className="flex justify-end gap-2"><button type="button" disabled={deploying} onClick={() => setShowDeploy(false)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">Cancel</button><button type="button" disabled={deploying} onClick={submitDeploy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{deploying ? "Submitting..." : "Deploy"}</button></div>
        </div>
      </Modal>}
    </div>
  );
}
