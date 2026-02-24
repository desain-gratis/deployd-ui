/* eslint-disable no-unused-vars */
import React from 'react';
import YAML from 'js-yaml';
import { formatRelativeTime, formatLocalDateTime } from '../../lib/time';

export type KeyValueEntry<V = string> = {
  key: string;
  value: V;
};

export type DataFormat = 'kv' | 'json' | 'yaml';

type VersionedValue<T> = {
  version: string | number;
  publishedAt?: string;
  value: T;
};

type Props<T extends Record<string, any> = Record<string, any>> = {
  title?: string;

  versions?: VersionedValue<T>[];
  selectedVersionIndex?: number;
  onSelectVersion?: (index: number) => void;

  format: DataFormat;
  onFormatChange: (format: DataFormat) => void;

  entries: KeyValueEntry[];
  onUpdateEntry: (index: number, field: 'key' | 'value', value: any) => void;
  onAddEntry: () => void;
  onRemoveEntry: (index: number) => void;

  emptyMessage?: string;
};

const flatToNested = (flatObj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(flatObj)) {
    const parts = key.split('.');
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

export default function KeyValueEditor<
  T extends Record<string, any> = Record<string, any>
>({
  title = 'Key Value Editor',
  versions = [],
  selectedVersionIndex = 0,
  onSelectVersion,
  format,
  onFormatChange,
  entries,
  onUpdateEntry,
  onAddEntry,
  onRemoveEntry,
  emptyMessage = 'No data available',
}: Props<T>) {
  const selectedVersion = versions[selectedVersionIndex];

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">{title}</h3>

      {versions.length > 0 ? (
        <div className="space-y-4">
          <div className="p-4 rounded bg-gray-50 dark:bg-gray-800">
            {/* Header Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {onSelectVersion && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Version
                  </label>
                  <select
                    value={selectedVersionIndex}
                    onChange={(e) =>
                      onSelectVersion(Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
                  >
                    {versions.map((v, idx) => (
                      <option key={idx} value={idx}>
                        Version {v.version}
                        {v.publishedAt ? (
                          <>
                            {' '}
                            (published{' '}
                            {formatRelativeTime(v.publishedAt)} ·{' '}
                            {formatLocalDateTime(v.publishedAt)})
                          </>
                        ) : null}
                      </option>
                    ))}
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
                    onFormatChange(e.target.value as DataFormat)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
                >
                  <option value="kv">Key-Value</option>
                  <option value="json">JSON</option>
                  <option value="yaml">YAML</option>
                </select>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-auto max-h-[400px]">
              {format === 'kv' && (
                <div>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left px-2 py-2 font-medium">
                          Key
                        </th>
                        <th className="text-left px-2 py-2 font-medium">
                          Value
                        </th>
                        <th className="text-center px-2 py-2 font-medium w-20">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={entry.key}
                              onChange={(e) =>
                                onUpdateEntry(
                                  idx,
                                  'key',
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-sm"
                              placeholder="Enter key"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={String(entry.value ?? '')}
                              onChange={(e) =>
                                onUpdateEntry(
                                  idx,
                                  'value',
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-sm"
                              placeholder="Enter value"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => onRemoveEntry(idx)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button
                    onClick={onAddEntry}
                    className="mt-3 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    + Add Entry
                  </button>
                </div>
              )}

              {format === 'json' && (
                <pre className="text-xs text-gray-700 dark:text-gray-300">
                  {JSON.stringify(
                    selectedVersion?.value ?? {},
                    null,
                    2
                  )}
                </pre>
              )}

              {format === 'yaml' && (
                <pre className="text-xs text-gray-700 dark:text-gray-300">
                  {YAML.dump(
                    flatToNested(selectedVersion?.value ?? {})
                  )}
                </pre>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded bg-gray-50 dark:bg-gray-800 text-center text-gray-600 dark:text-gray-400">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}