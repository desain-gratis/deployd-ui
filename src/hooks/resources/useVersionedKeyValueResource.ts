import { useState, useEffect, useMemo } from "react";
import { DataFormat } from "../../../components/ServiceTabs/KeyValueEditor";
import { KV } from "../../../types/service";
import { getStandardizedTimestamp } from "../../../lib/time";

type SubmitMode = "update" | "revert";

type Entry = { host: string; key: string; value: any };

type Options = {
    endpoint: string;
    namespace: string;
    service: string;
    initialVersions: KV[];
    refetch: () => Promise<void>;
    hosts?: string[];
};

function toEntries(version?: KV): Entry[] {
    if (!version) return [];
    const entries: Entry[] = Object.entries(version.value ?? {}).map(([key, value]) => ({
        host: "", key, value,
    }));
    for (const [host, values] of Object.entries(version.value_by_host ?? {})) {
        for (const [key, value] of Object.entries(values ?? {})) {
            entries.push({ host, key, value });
        }
    }
    return entries.sort((a, b) =>
        a.host.localeCompare(b.host) || a.key.localeCompare(b.key)
    );
}

function toPayload(entries: Entry[]) {
    const value: Record<string, any> = {};
    const value_by_host: Record<string, Record<string, any>> = {};
    for (const entry of entries) {
        const key = entry.key.trim();
        if (!key) continue;
        if (entry.host.trim()) {
            const host = entry.host.trim();
            value_by_host[host] ??= {};
            value_by_host[host][key] = entry.value;
        } else {
            value[key] = entry.value;
        }
    }
    return { value, value_by_host };
}

export function useVersionedKeyValueResource({
    endpoint, namespace, service, initialVersions, refetch,
}: Options) {
    const [versions, setVersions] = useState<KV[]>(initialVersions);
    const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [format, setFormat] = useState<DataFormat>("kv");

    useEffect(() => { setVersions(initialVersions); }, [initialVersions]);

    const selectedVersion = versions[selectedVersionIndex];
    const latestVersion = versions[0];

    useEffect(() => {
        setEntries(toEntries(selectedVersion));
    }, [selectedVersion]);

    const currentValue = useMemo(() => toPayload(entries), [entries]);
    const selectedValue = {
        value: selectedVersion?.value ?? {},
        value_by_host: selectedVersion?.value_by_host ?? {},
    };
    const latestValue = {
        value: latestVersion?.value ?? {},
        value_by_host: latestVersion?.value_by_host ?? {},
    };

    const isLatestSelected = selectedVersionIndex === 0;
    const isEdited = JSON.stringify(currentValue) !== JSON.stringify(selectedValue);
    const isSameAsLatest = JSON.stringify(currentValue) === JSON.stringify(latestValue);
    const submitMode: SubmitMode | null = isEdited ? "update"
        : (!isLatestSelected && !isSameAsLatest ? "revert" : null);
    const hasChanges = submitMode !== null;
    const isReverting = submitMode === "revert";

    const submit = async () => {
        if (!hasChanges) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const optimisticVersion = latestVersion?.version ?? 0;
            const payload = toPayload(entries);
            const body = {
                ...latestVersion,
                namespace,
                service,
                version: undefined,
                id: "",
                ...payload,
                published_at: getStandardizedTimestamp(),
            };
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Namespace": namespace,
                    "DG-Optimistic-Lock-Version": String(optimisticVersion),
                },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                let payload: any = null;
                try { payload = await res.json(); }
                catch { throw new Error(`HTTP ${res.status}`); }
                throw new Error(extractApiErrorMessage(payload));
            }
            await refetch();
            setSelectedVersionIndex(0);
        } catch (err: any) {
            setError(err?.message || "Failed to update resource");
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateEntry = (index: number, field: "host" | "key" | "value", value: any) => {
        setEntries(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };
    const addEntry = (host = "") => setEntries(prev =>
        [...prev, { host, key: "", value: "" }]
    );
    const removeEntry = (index: number) =>
        setEntries(prev => prev.filter((_, i) => i !== index));

    return {
        versions, selectedVersionIndex,
        selectVersion: setSelectedVersionIndex,
        format, setFormat,
        entries, updateEntry, addEntry, removeEntry,
        hasChanges, isReverting, submit, isSubmitting, error,
    };
}

function extractApiErrorMessage(payload: any): string {
    if (!payload) return "Unknown error";
    if (payload.error && Array.isArray(payload.error.errors) && payload.error.errors.length > 0) {
        return payload.error.errors.map((e: any) => e.message || e.code || "Unknown error").join(" | ");
    }
    if (typeof payload.message === "string") return payload.message;
    return "Unexpected server error";
}
