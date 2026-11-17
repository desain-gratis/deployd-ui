/* eslint-disable no-unused-vars */
import React, { useMemo } from "react";
import YAML from "js-yaml";
import {
  formatRelativeTime,
  formatLocalDateTime,
} from "../../lib/time";
import { KV } from "../../types/service";

export type DataFormat = "kv" | "json" | "yaml";

type SubmitMode = "update" | "revert";

type Props = {
  title?: string;

  versions?: KV[];
  selectedVersionIndex?: number;
  onSelectVersion?: (index: number) => void;

  hosts?: string[];
  selectedHost?: string;
  onSelectHost?: (host: string) => void;

  format: DataFormat;
  onFormatChange: (format: DataFormat) => void;

  entries: Record<string, any>[];
  onUpdateEntry: (
    index: number,
    field: "host" | "key" | "value",
    value: any
  ) => void;
  onAddEntry: () => void;
  onRemoveEntry: (index: number) => void;

  emptyMessage?: string;

  onSubmit?: (payload: {
    value: Record<string, any>;
    mode: SubmitMode;
  }) => void;

  isSubmitting?: boolean;
  error?: string | null;
};

const flatToNested = (
  flatObj: Record<string, any>
): Record<string, any> => {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(
    flatObj
  )) {
    const parts = key.split(".");
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }

  return result;
};

export default function KeyValueEditor({
  title = "Key Value Editor",
  versions = [],
  selectedVersionIndex = 0,
  onSelectVersion,
  hosts = [],
  selectedHost = "",
  onSelectHost,
  format,
  onFormatChange,
  entries,
  onUpdateEntry,
  onAddEntry,
  onRemoveEntry,
  emptyMessage = "No data available",
  onSubmit,
  isSubmitting = false,
  error,
}: Props) {

  const safeVersions: KV[] = versions.length
    ? versions
    : [
      {
        version: 0,
        value: {},
        published_at: null,
      } as unknown as KV,
    ];

  const selectedVersion = safeVersions[selectedVersionIndex];
  const latestVersion = safeVersions[0];

  const selectedValue = { value: selectedVersion?.value ?? {}, value_by_host: selectedVersion?.value_by_host ?? {} };
  const latestValue = { value: latestVersion?.value ?? {}, value_by_host: latestVersion?.value_by_host ?? {} };

  const currentValue = useMemo(() => {
    const value: Record<string, any> = {};
    const value_by_host: Record<string, Record<string, any>> = {};
    entries.forEach((entry) => {
      if (!entry.key) return;
      const host = String(entry.host ?? "").trim();
      if (host) {
        value_by_host[host] ??= {};
        value_by_host[host][entry.key] = entry.value;
      } else {
        value[entry.key] = entry.value;
      }
    });
    return { value, value_by_host };
  }, [entries]);