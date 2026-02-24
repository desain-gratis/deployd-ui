"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
// YAML not used in this file (Env/Secret tabs handle YAML rendering)
import FlexSearch from 'flexsearch';
import DeploymentTab from '../../components/ServiceTabs/DeploymentTab';
import JobLogTab from '../../components/ServiceTabs/JobLogTab';
import ReleasesTab from '../../components/ServiceTabs/ReleasesTab';
import SecretTab from '../../components/ServiceTabs/SecretTab';
import EnvTab from '../../components/ServiceTabs/EnvTab';
import { useNamespace } from '../../context/NamespaceContext';
import Modal from '../../components/Modal';
import { formatRelativeTime, formatLocalDateTime } from '../../lib/time';
import ServiceHeaderCard from '../../components/ServiceDetail/ServiceHeaderCard';
import { Service, Secret, ServiceJob, Build } from '../../types/service';


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
        const res = await fetch('http://localhost:9401/deployd/service', {
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
        const res = await fetch('http://localhost:9401/secretd/secret', {
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
        const res = await fetch('http://localhost:9401/secretd/env', {
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
        const res = await fetch('http://localhost:9401/deployd/job', {
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

    // Fetch last successful job for this service and detect newer versions
    const detectNewerVersions = async () => {
      try {
        const sRes = await fetch('http://localhost:9401/deployd/successful-job', { headers: { 'X-Namespace': namespace } });
        const sData = await sRes.json();
        const successfulJobs = Array.isArray(sData.success) ? sData.success : [];
        const svcSuccess = successfulJobs.find((j: any) => j.request?.service?.id === id) || null;
        if (!mounted) return;
        setLastSuccessfulJob(svcSuccess);

        // fetch current available builds/secrets/envs
        const [bRes, eRes, secRes] = await Promise.all([
          fetch('http://localhost:9401/artifactd/build', { headers: { 'X-Namespace': namespace } }),
          fetch('http://localhost:9401/secretd/env', { headers: { 'X-Namespace': namespace } }),
          fetch('http://localhost:9401/secretd/secret', { headers: { 'X-Namespace': namespace } })
        ]);
        const [bData, eData, secData] = await Promise.all([bRes.json(), eRes.json(), secRes.json()]);
        const builds = Array.isArray(bData.success) ? bData.success : [];
        const allEnvs = Array.isArray(eData.success) ? eData.success : [];
        const allSecrets = Array.isArray(secData.success) ? secData.success : [];

        // Determine latest indices for builds, envs, secrets (prefer numeric version, else published_at)
        const latestBuildIndex = builds.reduce((best: number, b: any, idx: number) => {
          const v = Number(b.id ?? NaN);
          const bestV = Number(builds[best]?.id ?? NaN);
          if (isNaN(bestV) && isNaN(v)) return best; // keep
          if (isNaN(bestV)) return idx;
          if (isNaN(v)) return best;
          return v > bestV ? idx : best;
        }, 0);

        const svcEnvs = allEnvs.filter((e: any) => e.service === id);
        const svcSecrets = allSecrets.filter((s: any) => s.service === id);

        const latestEnvIndex = svcEnvs.reduce((best: number, e: any, idx: number) => {
          const v = Number(e.id ?? NaN);
          const bestV = Number(svcEnvs[best]?.id ?? NaN);
          if (isNaN(bestV) && isNaN(v)) return best;
          if (isNaN(bestV)) return idx;
          if (isNaN(v)) return best;
          return v > bestV ? idx : best;
        }, 0);

        const latestSecretIndex = svcSecrets.reduce((best: number, s: any, idx: number) => {
          const v = Number(s.id ?? NaN);
          const bestV = Number(svcSecrets[best]?.id ?? NaN);
          if (isNaN(bestV) && isNaN(v)) return best;
          if (isNaN(bestV)) return idx;
          if (isNaN(v)) return best;
          return v > bestV ? idx : best;
        }, 0);

        // Compare against last successful job's request
        if (svcSuccess && svcSuccess.request) {
          const req = svcSuccess.request as any;
          const reqBuild = Number(req.build_version ?? NaN);
          const reqSecret = Number(req.secret_version ?? NaN);
          const reqEnv = Number(req.env_version ?? NaN);

          const latestBuildVersion = Number(builds[latestBuildIndex]?.id ?? NaN);
          const latestEnvVersion = Number(svcEnvs[latestEnvIndex]?.id ?? NaN);
          const latestSecretVersion = Number(svcSecrets[latestSecretIndex]?.id ?? NaN);

          const newBuild = !isNaN(latestBuildVersion) && (!isFinite(reqBuild) || latestBuildVersion > reqBuild);
          const newEnv = !isNaN(latestEnvVersion) && (!isFinite(reqEnv) || latestEnvVersion > reqEnv);
          const newSecret = !isNaN(latestSecretVersion) && (!isFinite(reqSecret) || latestSecretVersion > reqSecret);

          setHasNewBuild(newBuild);
          setHasNewEnv(newEnv);
          setHasNewSecret(newSecret);

          // store suggested indices if newer
          setSuggestedReleaseIndex(newBuild ? latestBuildIndex : null);
          setSuggestedEnvIndex(newEnv ? latestEnvIndex : null);
          setSuggestedSecretIndex(newSecret ? latestSecretIndex : null);
        } else {
          setHasNewBuild(false);
          setHasNewEnv(false);
          setHasNewSecret(false);
          setSuggestedReleaseIndex(null);
          setSuggestedEnvIndex(null);
          setSuggestedSecretIndex(null);
        }
      } catch (err) {
        // ignore detection errors
      }
    };

    fetchSecrets();
    fetchEnvs();
    fetchJobs();
    detectNewerVersions();
    return () => {
      mounted = false;
    };
  }, [service]);

  // Fetch builds when service is available
  useEffect(() => {
    if (!service?.repository?.id) return;
    if (!service || !service.id || !service.namespace) return;
    let namespace = service.namespace;

    let mounted = true;


    const fetchBuilds = async () => {
      try {
        const res = await fetch('http://localhost:9401/artifactd/build', {
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
  }, [service?.repository?.id, service?.namespace]);

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
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        // const host = window.location.host;
        const wsUrl = `${protocol}://localhost:9401/deployd/job/tail/ws?service=${serviceId}&namespace=${namespace}`;
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
            const logMessage = [
              `[${new Date().toLocaleTimeString()}] Job: ${job.id}`,
              `Status: ${job.status}`,
              job.configure_host_job?.status && `Configure: ${JSON.stringify(job.configure_host_job.status)}`,
              job.restart_service_job?.status && `Restart: ${JSON.stringify(job.restart_service_job.status)}`,
            ].filter(Boolean).join(' | ');

            setJobLogs((prev) => [
              ...prev,
              {
                message: logMessage,
                timestamp: new Date().toISOString(),
              },
            ]);

            // Update the job in the jobs list in real-time
            setJobs((prev) => {
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
                    restart_host_job: {
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
  }, [service?.id, service?.namespace]);

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
    if (!id) return;
    if (!service || !service.id || !service.namespace) return;
    setDeployError(null);
    setReleaseLoading(true);

    let namespace = service.namespace;

    try {
      // Fetch builds (artifactd)
      const bRes = await fetch('http://localhost:9401/artifactd/build', {
        headers: { 'X-Namespace': namespace }
      });
      const bData = await bRes.json();
      const builds = Array.isArray(bData.success) ? bData.success : [];
      setReleaseBuilds(builds);

      // Fetch envs and secrets filtered for this service (reuse endpoints semantics)
      const eRes = await fetch('http://localhost:9401/secretd/env', { headers: { 'X-Namespace': namespace } });
      const eData = await eRes.json();
      const allEnvs = Array.isArray(eData.success) ? eData.success : [];
      const svcEnvs = allEnvs.filter((e: any) => e.service === id);

      const sRes = await fetch('http://localhost:9401/secretd/secret', { headers: { 'X-Namespace': namespace } });
      const sData = await sRes.json();
      const allSecrets = Array.isArray(sData.success) ? sData.success : [];
      const svcSecrets = allSecrets.filter((s: any) => s.service === id);

      // Prefer targets from the latest successful job for this service, fallback to /deployd/host
      const successRes = await fetch('http://localhost:9401/deployd/successful-job', { headers: { 'X-Namespace': namespace } });
      const successData = await successRes.json();
      const successfulJobs = Array.isArray(successData.success) ? successData.success : [];
      const successfulForService = successfulJobs.find((j: any) => j.request?.service?.id === id);

      let hosts: string[] = [];
      if (successfulForService && Array.isArray(successfulForService.target) && successfulForService.target.length > 0) {
        hosts = successfulForService.target.map((t: any) => t.host || t);
      } else {
        const hRes = await fetch('http://localhost:9401/deployd/host', { headers: { 'X-Namespace': namespace } });
        const hData = await hRes.json();
        const hostList = Array.isArray(hData.success) ? hData.success : [];
        hosts = hostList.map((h: any) => h.host || h);
      }

      setHostsForDeploy(hosts);

      // Use suggested indices (if detection found new versions) otherwise default to 0
      setSelectedReleaseIndex(suggestedReleaseIndex ?? 0);
      setSelectedEnvForDeploy(suggestedEnvIndex ?? 0);
      setSelectedSecretForDeploy(suggestedSecretIndex ?? 0);

      // Merge envs/secrets into local state so modal can show them (we keep the main page states for list rendering elsewhere)
      setEnvs(svcEnvs);
      setSecrets(svcSecrets);

      setShowDeployModal(true);
    } catch (err: any) {
      setDeployError(err?.message || 'Failed to load deployment data');
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

      const secret_version = selectedSecret && (typeof selectedSecret.id === 'number')
        ? selectedSecret.id
        : Number(selectedSecret?.id ?? selectedSecretForDeploy) || selectedSecretForDeploy;

      const env_version = selectedEnv && (typeof selectedEnv.id === 'number')
        ? selectedEnv.id
        : Number(selectedEnv?.id ?? selectedEnvForDeploy) || selectedEnvForDeploy;

      const target_hosts = hostsForDeploy.map((h, idx) => ({
        host: h,
        raft_config: {
          replica_id: idx + 1,
          wal_dir: '/data',
          node_host_dir: '/data'
        }
      }));

      const payloadNamespace = service?.namespace  || 'deployd';

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

      const res = await fetch('http://localhost:9401/deployd/submit-job', {
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
      setDeploySuccessMessage(`Deployment job submitted successfully. Job ID: ${data.success?.id || 'Unknown'}`);
      setShowDeployModal(false);
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

  // flatToNested removed from this file because it's unused here

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
        lastSuccessfulJob={lastSuccessfulJob }
        onCreateDeployment={openDeployModal}
      /> : (
        !loading && <div className="text-sm text-gray-600">Service not found.</div>
      )}

      {/* Deploy button */}
      <div className="flex items-center justify-end mb-2">
        <button
          onClick={openDeployModal}
          className="px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
        >
          DEPLOY
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
            className={`px-4 py-2 font-medium text-sm ${
              (tab ? tab === t : 'deployment' === t)
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
          <SecretTab
            secrets={secrets}
            selectedSecretVersionIndex={selectedSecretVersionIndex}
            setSelectedSecretVersionIndex={setSelectedSecretVersionIndex}
            secretFormat={secretFormat}
            setSecretFormat={setSecretFormat}
            secretEntries={secretEntries}
            updateSecretEntry={updateSecretEntry}
            addSecretEntry={addSecretEntry}
            removeSecretEntry={removeSecretEntry}
          />
        )}

        {tab === 'env' && (
          <EnvTab
            envs={envs}
            selectedEnvVersionIndex={selectedEnvVersionIndex}
            setSelectedEnvVersionIndex={setSelectedEnvVersionIndex}
            envFormat={envFormat}
            setEnvFormat={setEnvFormat}
            envEntries={envEntries}
            updateEnvEntry={updateEnvEntry}
            addEnvEntry={addEnvEntry}
            removeEnvEntry={removeEnvEntry}
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
                      {b.id ?? b.version ?? JSON.stringify(b)}
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
