"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
// YAML not used in this file (Env/Secret tabs handle YAML rendering)
import FlexSearch from 'flexsearch';
import DeploymentTab from '../../components/ServiceTabs/DeploymentTab';
import JobLogTab from '../../components/ServiceTabs/JobLogTab';
import ReleasesTab from '../../components/ServiceTabs/ReleasesTab';
import { useNamespace } from '../../context/NamespaceContext';
import Modal from '../../components/Modal';
import { formatRelativeTime } from '../../lib/time';
import ServiceHeaderCard from '../../components/ServiceDetail/ServiceHeaderCard';
import { Service, Secret, ServiceJob, Build } from '../../types/service';
import KeyValueEditor from '../../components/ServiceTabs/KeyValueEditor';
import { truncateCommit } from '../../components/ServiceTabs/ReleasesTable';


export default function ServiceDetail() {
  const router = useRouter();
  const { id, tab } = router.query as { id?: string, tab?: string };
  const { namespace: _namespace } = useNamespace(); // the user choice
  // const [namespace, setNamespace] = useState<string>(""); // the local namespace

  const [service, setService] = useState<Service | null>(null);

  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [envs, setEnvs] = useState<Secret[]>([]);
  const [jobs, setJobs] = useState<ServiceJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataModal, setDataModal] = useState<any | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [releaseBuilds, setReleaseBuilds] = useState<any[]>([]);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [selectedReleaseIndex, setSelectedReleaseIndex] = useState(0);
  const [selectedEnvForDeploy, setSelectedEnvForDeploy] = useState(0);
  const [selectedSecretForDeploy, setSelectedSecretForDeploy] = useState(0);
  const [hostsForDeploy, setHostsForDeploy] = useState<string[]>([]);
  const [lastSuccessfulJob, setLastSuccessfulJob] = useState<ServiceJob | null>(null);
  const [hasNewBuild, setHasNewBuild] = useState(false);
  const [latestBuild, setLatestBuild] = useState<Build | null>(null);
  const [latestBuildVersion, setLatestBuildVersion] = useState<number | null>(null);
  const [latestEnvVersion, setLatestEnvVersion] = useState<number | null>(null);
  const [latestSecretVersion, setLatestSecretVersion] = useState<number | null>(null);
  const [hasNewSecret, setHasNewSecret] = useState(false);
  const [hasNewEnv, setHasNewEnv] = useState(false);
  const [suggestedReleaseIndex, setSuggestedReleaseIndex] = useState<number | null>(null);
  const [suggestedEnvIndex, setSuggestedEnvIndex] = useState<number | null>(null);
  const [suggestedSecretIndex, setSuggestedSecretIndex] = useState<number | null>(null);
  const [selectedSecretVersionIndex, setSelectedSecretVersionIndex] = useState(0);
  const [secretFormat, setSecretFormat] = useState<'kv' | 'json' | 'yaml'>('kv');
  const [secretEntries, setSecretEntries] = useState<Array<{ key: string; value: string }>>([]);
  const [selectedEnvVersionIndex, setSelectedEnvVersionIndex] = useState(0);
  const [envFormat, setEnvFormat] = useState<'kv' | 'json' | 'yaml'>('kv');
  const [envEntries, setEnvEntries] = useState<Array<{ key: string; value: string }>>([]);
  const [selectedJobIndex, setSelectedJobIndex] = useState(0);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [filteredBuilds, setFilteredBuilds] = useState<Build[]>([]);
  const [buildSearchText, setBuildSearchText] = useState('');
  const [selectedBuildBranch, setSelectedBuildBranch] = useState<string | null>(null);
  const [selectedBuildActor, setSelectedBuildActor] = useState<string | null>(null);
  const [buildIndex, setBuildIndex] = useState<any>(null);
  const [jobLogs, setJobLogs] = useState<Array<{ message: any; timestamp: string }>>([]);
  const [deploySuccess, setDeploySuccess] = useState(false);
  const [deploySuccessMessage, setDeploySuccessMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const fetchService = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_DEPLOYD_ENDPOINT}/deployd/service`, {
          headers: { 'X-Namespace': _namespace }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        const found = Array.isArray(data.success) ? data.success.find((s: any) => s.id === id) : null;
        setService(found ?? null);
        // setNamespace(found.namespace); // use the service's namespace; not the context one
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to fetch service');
      }
    };

    setLoading(true);
    fetchService();

    return () => {
      mounted = false;
    };
  }, [_namespace, id]); // use global namespace

  useEffect(() => {
    if (!service || !service.id || !service.namespace) return;
    let namespace = service.namespace;
    let id = service.id;

    let mounted = true;


    // (removed fetchJob - deployment history is handled by fetchJobs)

    const fetchSecrets = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_DEPLOYD_ENDPOINT}/secretd/secret`, {
          headers: { 'X-Namespace': namespace }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        const serviceSecrets = Array.isArray(data.success)
          ? data.success.filter((s: any) => s.service === id)
          : [];
        setSecrets(serviceSecrets);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to fetch secrets');
      }
    };

    const fetchEnvs = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_DEPLOYD_ENDPOINT}/secretd/env`, {
          headers: { 'X-Namespace': namespace }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        const serviceEnvs = Array.isArray(data.success)
          ? data.success.filter((e: any) => e.service === id)
          : [];
        setEnvs(serviceEnvs);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to fetch envs');
      }
    };

    const fetchJobs = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_DEPLOYD_ENDPOINT}/deployd/job`, {
          headers: { 'X-Namespace': namespace }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        const allJobs = Array.isArray(data.success) ? data.success : [];
        const filtered = allJobs.filter((j: any) => j.request?.service?.id === id);
        const sorted = filtered.sort((a: any, b: any) =>
          new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
        );
        setJobs(sorted);
        setSelectedJobIndex(0);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to fetch jobs');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const fetchLastSuccessfulJob = async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_DEPLOYD_ENDPOINT}/deployd/successful-job`,
        { headers: { "X-Namespace": service.namespace } }
      );
      const data = await res.json();
      const successfulJobs = Array.isArray(data.success) ? data.success : [];
      const svcSuccess =
        successfulJobs.find((j: any) => j.request?.service?.id === service.id) ||
        null;

      setLastSuccessfulJob(svcSuccess);
    };

    fetchSecrets();
    fetchEnvs();
    fetchJobs();
    fetchLastSuccessfulJob();

    return () => {
      mounted = false;
    };
  }, [service]);

  useEffect(() => {
    if (!service?.id || !lastSuccessfulJob) return;

    const req = lastSuccessfulJob.request as any;
    const reqBuild = Number(req?.build_version ?? NaN);
    const reqSecret = Number(req?.secret_version ?? NaN);
    const reqEnv = Number(req?.env_version ?? NaN);

    const latestBuildIndex = builds.reduce((best, b, idx) => {
      const v = Number(b.id ?? NaN);
      const bestV = Number(builds[best]?.id ?? NaN);
      if (isNaN(bestV)) return idx;
      if (isNaN(v)) return best;
      return v > bestV ? idx : best;
    }, 0);

    const latestEnvIndex = envs.reduce((best, e, idx) => {
      const v = Number(e.id ?? NaN);
      const bestV = Number(envs[best]?.id ?? NaN);
      if (isNaN(bestV)) return idx;
      if (isNaN(v)) return best;
      return v > bestV ? idx : best;
    }, 0);

    const latestSecretIndex = secrets.reduce((best, s, idx) => {
      const v = Number(s.id ?? NaN);
      const bestV = Number(secrets[best]?.id ?? NaN);
      if (isNaN(bestV)) return idx;
      if (isNaN(v)) return best;
      return v > bestV ? idx : best;
    }, 0);

    const latestBuildVersion = Number(builds[latestBuildIndex]?.id ?? NaN);
    const latestBuild = builds[latestBuildIndex];
    const latestEnvVersion = Number(envs[latestEnvIndex]?.id ?? NaN);
    const latestSecretVersion = Number(secrets[latestSecretIndex]?.id ?? NaN);


    setLatestBuild(latestBuild);
    setLatestBuildVersion(isNaN(latestBuildVersion) ? null : latestBuildVersion);
    setLatestEnvVersion(isNaN(latestEnvVersion) ? null : latestEnvVersion);
    setLatestSecretVersion(isNaN(latestSecretVersion) ? null : latestSecretVersion);

    const newBuild =
      !isNaN(latestBuildVersion) &&
      (!isFinite(reqBuild) || latestBuildVersion > reqBuild);

    const newEnv =
      !isNaN(latestEnvVersion) &&
      (!isFinite(reqEnv) || latestEnvVersion > reqEnv);

    const newSecret =
      !isNaN(latestSecretVersion) &&
      (!isFinite(reqSecret) || latestSecretVersion > reqSecret);

    setHasNewBuild(newBuild);
    setHasNewEnv(newEnv);
    setHasNewSecret(newSecret);

    setSuggestedReleaseIndex(newBuild ? latestBuildIndex : null);
    setSuggestedEnvIndex(newEnv ? latestEnvIndex : null);
    setSuggestedSecretIndex(newSecret ? latestSecretIndex : null);
  }, [builds, envs, secrets, lastSuccessfulJob, service?.id]);

  // Fetch builds when service is available
  useEffect(() => {
    if (!service?.repository?.id) return;
    if (!service || !service.id || !service.namespace) return;
    let namespace = service.namespace;

    let mounted = true;


    const fetchBuilds = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_DEPLOYD_ENDPOINT}/artifactd/build`, {
          headers: { 'X-Namespace': namespace }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        const list = Array.isArray(data.success)
          ? data.success.filter((b: any) => b.repository_id === service.repository?.id)
          : [];
        setBuilds(list);

        // Create flexsearch index
        const searchIndex = new FlexSearch.Index({ tokenize: 'forward' });
        list.forEach((b: Build) => {
          const combinedText = [
            b.id,
            b.commit_id,
            b.branch,
            b.actor,
            b.tag,
            b.name
          ].filter(Boolean).join(' ');
          searchIndex.add(b.id ?? '', combinedText);
        });
        if (mounted) setBuildIndex(searchIndex);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to fetch builds');
      }
    };

    fetchBuilds();

    return () => {
      mounted = false;
    };
  }, [service, service?.repository?.id, service?.namespace]);

  // Update secretEntries when selected version changes
  useEffect(() => {
    const currentSecret = secrets[selectedSecretVersionIndex];
    if (currentSecret?.value) {
      const entries = Object.entries(currentSecret.value).map(([k, v]) => ({
        key: k,
        value: String(v)
      }));
      setSecretEntries(entries);
    } else {
      setSecretEntries([]);
    }
  }, [selectedSecretVersionIndex, secrets]);

  // Update envEntries when selected version changes
  useEffect(() => {
    const currentEnv = envs[selectedEnvVersionIndex];
    if (currentEnv?.value) {
      const entries = Object.entries(currentEnv.value).map(([k, v]) => ({
        key: k,
        value: String(v)
      }));
      setEnvEntries(entries);
    } else {
      setEnvEntries([]);
    }
  }, [selectedEnvVersionIndex, envs]);

  // Filter builds based on search and filters
  useEffect(() => {
    let result = builds;

    // Apply search
    if (buildSearchText && buildIndex) {
      const searchResults = buildIndex.search(buildSearchText) as string[];
      const buildIds = new Set(searchResults);
      result = result.filter((b) => buildIds.has(b.id ?? ''));
    }

    // Apply branch filter
    if (selectedBuildBranch) {
      result = result.filter((b) => b.branch === selectedBuildBranch);
    }

    // Apply actor filter
    if (selectedBuildActor) {
      result = result.filter((b) => b.actor === selectedBuildActor);
    }

    setFilteredBuilds(result);
  }, [buildSearchText, selectedBuildBranch, selectedBuildActor, builds, buildIndex]);

  // WebSocket connection for real-time job updates (single connection)
  useEffect(() => {
    if (!service || !service.id || !service.namespace) return;
    let namespace = service.namespace;
    let id = service.id;

    const serviceId = id

    let mounted = true;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectWebSocket = () => {
      if (!mounted || ws) return; // Prevent duplicate connections

      try {
        const endpoint = process.env.NEXT_PUBLIC_DEPLOYD_ENDPOINT!
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const endpointNoPrefix = endpoint.replace(/^https?:\/\//, '');

        // const host = window.location.host;
        const wsUrl = `${protocol}://${endpointNoPrefix}/deployd/job/tail/ws?service=${serviceId}&namespace=${namespace}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebSocket connected for service:', serviceId);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (!mounted) return;

            const job = data.job;
            if (!job) return;

            // Add to job logs with formatted message
            const formatStatusMap = (
              statusMap?: Record<string, { status: string }>
            ) => {
              if (!statusMap) return "-";

              return Object.entries(statusMap)
                .map(([host, value]) => `${host}=${value?.status ?? "-"}`)
                .join(",");
            };

            const logMessage = [
              new Date().toLocaleTimeString(),
              `job=${job.id}`,
              `status=${job.status}`,
              `configure=${formatStatusMap(job.configure_host_job?.status)}`,
              `restart=${formatStatusMap(job.restart_service_job?.status)}`,
            ].join(" | ");
            setJobLogs((prev) => [
              ...prev,
              {
                message: logMessage,
                timestamp: new Date().toISOString(),
              },
            ]);

            // Update the job in the jobs list in real-time
            setJobs((prev) => {
              return [...addJob(prev, job)];
            });
          } catch (err) {
            console.error('Failed to parse websocket message:', err);
          }
        };

        ws.onerror = (err) => {
          console.error('WebSocket error:', err);
        };

        ws.onclose = () => {
          ws = null;
          if (mounted) {
            // Attempt to reconnect after 3 seconds
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          }
        };
      } catch (err) {
        console.error('Failed to create websocket:', err);
      }
    };

    connectWebSocket();

    return () => {
      mounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
        ws = null;
      }
    };
  }, [service, service?.id, service?.namespace]);

  // Keep tab content container from collapsing/shrinking when switching tabs.
  const tabContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const adjust = () => {
      const el = tabContentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const available = Math.max(window.innerHeight - rect.top - 24, 200);
      el.style.minHeight = `${available}px`;
    };

    // Adjust on tab change, content updates and resize
    adjust();
    window.addEventListener('resize', adjust);
    return () => window.removeEventListener('resize', adjust);
  }, [tab, jobs.length, jobLogs.length, secrets.length, envs.length, filteredBuilds.length, releaseBuilds.length]);

  const updateSecretEntry = (index: number, field: 'key' | 'value', newValue: string) => {
    const updated = [...secretEntries];
    updated[index] = { ...updated[index], [field]: newValue };
    setSecretEntries(updated);
  };

  const openDeployModal = async () => {
    if (!service?.id || !service.namespace) return;

    setDeployError(null);
    setReleaseLoading(true);

    try {
      // Reuse already-fetched state
      setReleaseBuilds(builds);

      // Hosts: prefer last successful job
      let hosts: string[] = [];

      if (
        lastSuccessfulJob &&
        Array.isArray(lastSuccessfulJob.target) &&
        lastSuccessfulJob.target.length > 0
      ) {
        hosts = lastSuccessfulJob.target.map((t: any) => t.host || t);
      } else {
        // Only fetch hosts if absolutely needed
        const hRes = await fetch(
          `${process.env.NEXT_PUBLIC_DEPLOYD_ENDPOINT}/deployd/host`,
          { headers: { "X-Namespace": service.namespace } }
        );
        const hData = await hRes.json();
        const hostList = Array.isArray(hData.success) ? hData.success : [];
        hosts = hostList.map((h: any) => h.host || h);
      }

      setHostsForDeploy(hosts);

      // Use suggested indices already computed
      setSelectedReleaseIndex(suggestedReleaseIndex ?? 0);
      setSelectedEnvForDeploy(suggestedEnvIndex ?? 0);
      setSelectedSecretForDeploy(suggestedSecretIndex ?? 0);

      setShowDeployModal(true);
    } catch (err: any) {
      setDeployError(err?.message || "Failed to load deployment data");
    } finally {
      setReleaseLoading(false);
    }
  };

  const handleDeploy = async () => {
    setDeployError(null);
    setReleaseLoading(true);
    try {
      const selectedBuild = releaseBuilds[selectedReleaseIndex];
      const selectedEnv = envs[selectedEnvForDeploy];
      const selectedSecret = secrets[selectedSecretForDeploy];

      const build_version = selectedBuild && (typeof selectedBuild.id === 'number')
        ? selectedBuild.id
        : Number(selectedBuild?.id ?? selectedReleaseIndex) || selectedReleaseIndex;

      const secret_version = selectedSecret && (typeof selectedSecret.version === 'number')
        ? selectedSecret.version
        : Number(selectedSecret?.version ?? selectedSecretForDeploy) || selectedSecretForDeploy;

      const env_version = selectedEnv && (typeof selectedEnv.version === 'number')
        ? selectedEnv.version
        : Number(selectedEnv?.version ?? selectedEnvForDeploy) || selectedEnvForDeploy;

      const target_hosts = hostsForDeploy.map((h, idx) => ({
        host: h,
        raft_config: {
          replica_id: idx + 1,
          wal_dir: '/data',
          node_host_dir: '/data'
        }
      }));

      const payloadNamespace = service?.namespace || 'deployd';

      const payload: any = {
        namespace: payloadNamespace,
        service: { id: id },
        build_version,
        secret_version,
        env_version,
        raft_config_version: 0,
        raft_config_replica_version: 0,
        target_hosts,
        raft_replica: {
          '0': {
            id: `auto-replica-${Date.now()}`,
            description: 'Auto replica',
            type: 'auto'
          }
        },
        timeout_seconds: 900,
        is_believe: true
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_DEPLOYD_ENDPOINT}/deployd/submit-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Namespace': payloadNamespace
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status} - ${text}`);
      }

      const data = await res.json();
      setDeploySuccess(true);
      setDeploySuccessMessage(`Deployment job submitted successfully. Job ID: ${data.success?.job?.id || 'Unknown'}`);
      setShowDeployModal(false);

      if (data.success) {
        const job = data.success.job
        setJobs((prev) => {
          return [...addJob(prev, job)];
        });
      }

      // Auto-dismiss after 5 seconds
      setTimeout(() => setDeploySuccess(false), 5000);
    } catch (err: any) {
      setDeployError(err?.message || 'Failed to submit deploy job');
    } finally {
      setReleaseLoading(false);
    }
  };

  const addSecretEntry = () => {
    setSecretEntries([...secretEntries, { key: '', value: '' }]);
  };

  const removeSecretEntry = (index: number) => {
    setSecretEntries(secretEntries.filter((_, i) => i !== index));
  };

  const updateEnvEntry = (index: number, field: 'key' | 'value', newValue: string) => {
    const updated = [...envEntries];
    updated[index] = { ...updated[index], [field]: newValue };
    setEnvEntries(updated);
  };

  const addEnvEntry = () => {
    setEnvEntries([...envEntries, { key: '', value: '' }]);
  };

  const removeEnvEntry = (index: number) => {
    setEnvEntries(envEntries.filter((_, i) => i !== index));
  };

  const getStatusBadgeColor = (status?: string) => {
    if (!status) return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    if (status === 'DEPLOYED') return 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (status === 'FAILED') return 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200';
    return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  };


  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Service: {id}</h2>
          <div className="text-sm text-gray-600 dark:text-gray-300">Namespace: {service?.namespace}</div>
        </div>
        <Link href="/service/list" className="text-sm text-blue-600 dark:text-blue-400">
          ← Back to services
        </Link>
      </div>

      {loading && <div className="text-sm">Loading service...</div>}
      {error && <div className="text-sm text-red-600">Error: {error}</div>}

      {service ? <ServiceHeaderCard
        service={service}
        loading={loading}
        hasNewBuild={hasNewBuild}
        hasNewEnv={hasNewEnv}
        hasNewSecret={hasNewSecret}
        lastSuccessfulJob={lastSuccessfulJob}
        latestBuildVersion={latestBuildVersion}
        latestBuild={latestBuild}
        latestEnvVersion={latestEnvVersion}
        latestSecretVersion={latestSecretVersion}
        onCreateDeployment={openDeployModal}
      /> : (
        !loading && <div className="text-sm text-gray-600">Service not found.</div>
      )}

      {/* Deploy Action */}
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={openDeployModal}
          className="
      px-4 py-2.5
      text-sm font-semibold
      rounded-lg
      border border-gray-900 dark:border-gray-100
      bg-gray-900 dark:bg-gray-100
      text-white dark:text-gray-900
      hover:opacity-90
      transition-all duration-150
    "
        >
          Deploy
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {['deployment', 'releases', 'job-log', 'secret', 'env'].map((t) => (
          <button
            key={t}
            onClick={() => {
              const params = new URLSearchParams();
              id && params.set('id', id);
              t && params.set('tab', t);
              router.push("/service?" + params.toString(), undefined, { shallow: true });
            }}
            className={`px-4 py-2 font-medium text-sm ${(tab ? tab === t : 'deployment' === t)
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
          >
            {t === 'job-log' ? 'Job Log' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Home tab removed */}

      {/* Placeholder for other tabs */}
      <div ref={tabContentRef} className="transition-all">
        {(!tab || tab === 'deployment') && (
          <DeploymentTab
            jobs={jobs}
            builds={builds}
            selectedJobIndex={selectedJobIndex}
            setSelectedJobIndex={setSelectedJobIndex}
            setDataModal={setDataModal}
            getStatusBadgeColor={getStatusBadgeColor}
          />
        )}

        {tab === 'job-log' && (
          <JobLogTab jobLogs={jobLogs} setJobLogs={setJobLogs} />
        )}

        {tab === 'releases' && (
          <ReleasesTab
            builds={builds}
            filteredBuilds={filteredBuilds}
            buildSearchText={buildSearchText}
            setBuildSearchText={setBuildSearchText}
            selectedBuildBranch={selectedBuildBranch}
            setSelectedBuildBranch={setSelectedBuildBranch}
            selectedBuildActor={selectedBuildActor}
            setSelectedBuildActor={setSelectedBuildActor}
            setDataModal={setDataModal}
          />
        )}

        {tab === 'secret' && (
          <KeyValueEditor
            title="Secrets"
            versions={secrets.map((s) => ({
              version: s.id ?? s.version ?? '',
              publishedAt: s.published_at,
              value: s.value ?? {},
            }))}
            selectedVersionIndex={selectedSecretVersionIndex}
            onSelectVersion={setSelectedSecretVersionIndex}
            format={secretFormat}
            onFormatChange={setSecretFormat}
            entries={secretEntries}
            onUpdateEntry={updateSecretEntry}
            onAddEntry={addSecretEntry}
            onRemoveEntry={removeSecretEntry}
            emptyMessage="No secrets found for this service"
          />
        )}

        {tab === 'env' && (
          <KeyValueEditor
            title="Environment Variables"
            versions={envs.map((e) => ({
              version: e.id ?? e.version ?? '',
              publishedAt: e.published_at,
              value: e.value ?? {},
            }))}
            selectedVersionIndex={selectedEnvVersionIndex}
            onSelectVersion={setSelectedEnvVersionIndex}
            format={envFormat}
            onFormatChange={setEnvFormat}
            entries={envEntries}
            onUpdateEntry={updateEnvEntry}
            onAddEntry={addEnvEntry}
            onRemoveEntry={removeEnvEntry}
            emptyMessage="No environment variables found for this service"
          />
        )}
      </div>

      {/* Data Modal */}
      {dataModal && (
        <Modal title="Job Data (Raw JSON)" onClose={() => setDataModal(null)}>
          <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded text-[11px] overflow-auto">{JSON.stringify(dataModal, null, 2)}</pre>
        </Modal>
      )}

      {/* Deploy Success Toast */}
      {deploySuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded shadow-lg text-sm max-w-sm">
          {deploySuccessMessage}
        </div>
      )}

      {/* Deploy Modal */}
      {showDeployModal && (
        <Modal title="Deploy Service" onClose={() => setShowDeployModal(false)}>
          <div className="space-y-4">
            {releaseLoading && <div className="text-sm">Loading deployment data...</div>}
            {deployError && <div className="text-sm text-red-600">Error: {deployError}</div>}

            <div>
              <label className="block text-sm font-medium mb-1">Release Version</label>
              <select
                value={selectedReleaseIndex}
                onChange={(e) => setSelectedReleaseIndex(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
              >
                {releaseBuilds.length > 0 ? (
                  releaseBuilds.map((b, idx) => (
                    <option key={idx} value={idx}>
                      {b.id ?? b.version ?? JSON.stringify(b)} - {truncateCommit(b.commit_id)}
                    </option>
                  ))
                ) : (
                  <option value={0}>No builds available</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Env Version</label>
              <select
                value={selectedEnvForDeploy}
                onChange={(e) => setSelectedEnvForDeploy(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
              >
                {envs.length > 0 ? (
                  envs.map((ev, idx) => (
                    <option key={idx} value={idx}>
                      {ev.id ?? ev.version ?? `v${idx}`} (published {formatRelativeTime(ev.published_at)})
                    </option>
                  ))
                ) : (
                  <option value={0}>No env versions</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Secret Version</label>
              <select
                value={selectedSecretForDeploy}
                onChange={(e) => setSelectedSecretForDeploy(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
              >
                {secrets.length > 0 ? (
                  secrets.map((s, idx) => (
                    <option key={idx} value={idx}>
                      {s.id ?? s.version ?? `v${idx}`} (published {formatRelativeTime(s.published_at)})
                    </option>
                  ))
                ) : (
                  <option value={0}>No secret versions</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Target Hosts</label>
              {hostsForDeploy.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
                  {hostsForDeploy.map((h, idx) => (
                    <li key={idx}>{h}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-600">No target host required (previous successful deployment exists) or no hosts available.</div>
              )}
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button onClick={() => setShowDeployModal(false)} className="px-3 py-2 bg-gray-600 rounded text-sm">Cancel</button>
              <button onClick={handleDeploy} className="px-3 py-2 bg-indigo-600 text-white rounded text-sm">Deploy</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function addJob(prev: ServiceJob[], job: ServiceJob) {
  const index = prev.findIndex((j) => j.id === job.id);
  if (index >= 0) {
    const updated = [...prev];

    // Reconstruct target array from WebSocket data if we have host status info
    let reconstructedTarget = updated[index].target;
    const configureHosts = Object.keys(job.configure_host_job?.status || {});
    const restartHosts = Object.keys(job.restart_service_job?.status || {});
    const allHosts = new Set([...configureHosts, ...restartHosts]);

    if (allHosts.size > 0) {
      reconstructedTarget = Array.from(allHosts).map((host) => ({
        host,
        configure_host_job: {
          status: {
            [host]: job.configure_host_job?.status?.[host],
          },
        },
        restart_service_job: {
          status: {
            [host]: job.restart_service_job?.status?.[host],
          },
        },
      }));
    }

    // Deep merge the new job data with existing to preserve all fields
    updated[index] = {
      ...updated[index],
      ...job,
      target: reconstructedTarget,
      // Ensure nested objects are properly merged
      configure_host_job: {
        ...updated[index].configure_host_job,
        ...job.configure_host_job,
      },
      restart_service_job: {
        ...updated[index].restart_service_job,
        ...job.restart_service_job,
      },
    };
    return updated;
  } else {
    // New job - add to the top
    return [job, ...prev];
  }
}