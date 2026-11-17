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
  onAddEntry: (host?: string) => void;
  onRemoveEntry: (index: number) => void;

  emptyMessage?: string;

  onSubmit?: (payload: {
    value: Record<string, any>;
    value_by_host: Record<string, Record<string, any>>;
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

  const selectedValue = {
    value: selectedVersion?.value ?? {},
    value_by_host: selectedVersion?.value_by_host ?? {},
  };
  const latestValue = {
    value: latestVersion?.value ?? {},
    value_by_host: latestVersion?.value_by_host ?? {},
  };

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

  const displayHosts = useMemo(() => {
    return Array.from(new Set([
      ...hosts,
      ...entries.map((entry) => String(entry.host ?? "").trim()).filter(Boolean),
    ])).sort((a, b) => a.localeCompare(b));
  }, [hosts, entries]);

  const isLatestSelected =
    selectedVersionIndex === 0;

  const isEdited = useMemo(() => {
    return (
      JSON.stringify(currentValue) !==
      JSON.stringify(selectedValue)
    );
  }, [currentValue, selectedValue]);

  const isSameAsLatest = useMemo(() => {
    return (
      JSON.stringify(currentValue) ===
      JSON.stringify(latestValue)
    );
  }, [currentValue, latestValue]);

  let submitMode: SubmitMode | null = null;

  if (isEdited) {
    submitMode = "update";
  } else if (!isLatestSelected && !isSameAsLatest) {
    submitMode = "revert";
  }

  const hasChanges = submitMode !== null;
  const isReverting = submitMode === "revert";

  const handleSubmit = () => {
    if (!onSubmit || !submitMode) return;

    onSubmit({
      ...currentValue,
      mode: submitMode,
    });
  };


  return (
    <div>
      <h3 className="text-lg font-medium mb-4">
        {title}
      </h3>

      {error && (
        <div className="mb-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="p-4 rounded bg-gray-50 dark:bg-gray-800">
          {/* Header Controls */}
          <div className={`grid grid-cols-1 ${onSelectHost ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4 mb-4`}>
            {onSelectVersion && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Version
                </label>
                <select
                  value={selectedVersionIndex}
                  onChange={(e) =>
                    onSelectVersion?.(Number(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
                >
                  {versions.length === 0 ? (
                    <option value={0}>No previous history yet</option>
                  ) : (
                    versions.sort((a, b) => Date.parse(b.published_at!) - Date.parse(a.published_at!) ).map((v, idx) => (
                      <option key={idx} value={idx}>
                        Version {v.version}
                        {v.published_at && (
                          <>
                            {" "}
                            (published {formatRelativeTime(v.published_at)} ·{" "}
                            {formatLocalDateTime(v.published_at)})
                          </>
                        )}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            

            <div>
              <label className="block text-sm font-medium mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={(e) =>
                  onFormatChange(
                    e.target.value as DataFormat
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
              >
                <option value="kv">
                  Key-Value
                </option>
                <option value="json">JSON</option>
                <option value="yaml">YAML</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {format === "kv" && (
          <div className="space-y-6">
            {[
              { host: "", label: "Global" },
            ].map(({ host, label }) => {
              const hostEntries = entries
                .map((entry, index) => ({ entry, index }))
                .filter(({ entry }) => String(entry.host ?? "").trim() === host);

              return (
                <section
                  key={host || "__global__"}
                  className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                >
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {label}
                    </h4>
                  </div>
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50/70 dark:bg-gray-800/30">
                        <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          <th className="px-4 py-3 font-medium w-2/5">Key</th>
                          <th className="px-4 py-3 font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {hostEntries.length > 0 ? hostEntries.map(({ entry, index }, rowIndex) => (
                          <tr key={index} className={rowIndex % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/40 dark:bg-gray-900/40"}>
                            <td className="px-4 py-3 align-middle">
                              <input
                                type="text"
                                value={entry.key}
                                onChange={(event) => onUpdateEntry(index, "key", event.target.value)}
                                className="w-full bg-transparent border-none outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
                                placeholder="KEY_NAME"
                              />
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <div className="flex items-center gap-3">
                                <input
                                  type="text"
                                  value={String(entry.value ?? "")}
                                  onChange={(event) => onUpdateEntry(index, "value", event.target.value)}
                                  className="min-w-0 flex-1 bg-transparent border-none outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
                                  placeholder="Value"
                                />
                                <button
                                  type="button"
                                  onClick={() => onRemoveEntry(index)}
                                  className="shrink-0 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={2} className="px-4 py-5 text-center text-sm text-gray-500 dark:text-gray-400">
                              No key-value entries
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => onAddEntry(host)}
                      className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                    >
                      + Add Entry
                    </button>
                  </div>
                </section>
              );
            })}

            {displayHosts.length > 0 && (
              <details className="group overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span>Host-specific configurations</span>
                  <span className="flex items-center gap-3 text-xs font-normal text-gray-500 dark:text-gray-400">
                    <span>{displayHosts.length} {displayHosts.length === 1 ? "host" : "hosts"}</span>
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4 transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="space-y-4 border-t border-gray-100 dark:border-gray-800 p-4">
                  {displayHosts.map((host) => {
                    const hostEntries = entries
                      .map((entry, index) => ({ entry, index }))
                      .filter(({ entry }) => String(entry.host ?? "").trim() === host);

                    return (
                      <section
                        key={host}
                        className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                      >
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            {host}
                          </h4>
                        </div>
                        <div className="overflow-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50/70 dark:bg-gray-800/30">
                              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                <th className="px-4 py-3 font-medium w-2/5">Key</th>
                                <th className="px-4 py-3 font-medium">Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {hostEntries.length > 0 ? hostEntries.map(({ entry, index }, rowIndex) => (
                                <tr key={index} className={rowIndex % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/40 dark:bg-gray-900/40"}>
                                  <td className="px-4 py-3 align-middle">
                                    <input
                                      type="text"
                                      value={entry.key}
                                      onChange={(event) => onUpdateEntry(index, "key", event.target.value)}
                                      className="w-full bg-transparent border-none outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
                                      placeholder="KEY_NAME"
                                    />
                                  </td>
                                  <td className="px-4 py-3 align-middle">
                                    <div className="flex items-center gap-3">
                                      <input
                                        type="text"
                                        value={String(entry.value ?? "")}
                                        onChange={(event) => onUpdateEntry(index, "value", event.target.value)}
                                        className="min-w-0 flex-1 bg-transparent border-none outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
                                        placeholder="Value"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => onRemoveEntry(index)}
                                        className="shrink-0 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )) : (
                                <tr>
                                  <td colSpan={2} className="px-4 py-5 text-center text-sm text-gray-500 dark:text-gray-400">
                                    No key-value entries
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                          <button
                            type="button"
                            onClick={() => onAddEntry(host)}
                            className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                          >
                            + Add Entry
                          </button>
                        </div>
                      </section>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        )}

        {format === "json" && (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">
                JSON View
              </span>
            </div>

            <div className="overflow-auto max-h-[400px]">
              <pre className="px-4 py-4 text-xs font-mono leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                {JSON.stringify(currentValue, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {format === "yaml" && (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">
                YAML View
              </span>
            </div>

            <div className="overflow-auto max-h-[400px]">
              <pre className="px-4 py-4 text-xs font-mono leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                {YAML.dump(currentValue)}
              </pre>
            </div>
          </div>
        )}

      </div>

      {/* Submit Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!hasChanges || isSubmitting}
          className={`
            px-4 py-2 rounded text-sm font-medium
            ${!hasChanges
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
            }
          `}
        >
          {isSubmitting
            ? "Updating..."
            : isReverting
              ? "Revert to this version"
              : "Update"}
        </button>
      </div>
    </div>
  );
}