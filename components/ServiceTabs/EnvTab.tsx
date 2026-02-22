import React from 'react';
import YAML from 'js-yaml';

type Props = {
  envs: any[];
  selectedEnvVersionIndex: number;
  setSelectedEnvVersionIndex: (n: number) => void;
  envFormat: 'kv' | 'json' | 'yaml';
  setEnvFormat: (f: 'kv' | 'json' | 'yaml') => void;
  envEntries: Array<{ key: string; value: string }>;
  updateEnvEntry: (index: number, field: 'key' | 'value', newValue: string) => void;
  addEnvEntry: () => void;
  removeEnvEntry: (index: number) => void;
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

export default function EnvTab({
  envs,
  selectedEnvVersionIndex,
  setSelectedEnvVersionIndex,
  envFormat,
  setEnvFormat,
  envEntries,
  updateEnvEntry,
  addEnvEntry,
  removeEnvEntry,
}: Props) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Environment Variables</h3>

      {envs.length > 0 ? (
        <div className="space-y-4">
          <div className="p-4 rounded bg-gray-50 dark:bg-gray-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Version</label>
                <select
                  value={selectedEnvVersionIndex}
                  onChange={(e) => setSelectedEnvVersionIndex(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
                >
                  {envs.map((e, idx) => (
                    <option key={idx} value={idx}>
                      Version {e.version} (published {new Date(e.published_at || '').toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Format</label>
                <select
                  value={envFormat}
                  onChange={(e) => setEnvFormat(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
                >
                  <option value="kv">Key-Value</option>
                  <option value="json">JSON</option>
                  <option value="yaml">YAML</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Environment Variables</label>
              <div className="p-3 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-auto max-h-[400px]">
                {envFormat === 'kv' && (
                  <div>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left px-2 py-2 font-medium">Key</th>
                          <th className="text-left px-2 py-2 font-medium">Value</th>
                          <th className="text-center px-2 py-2 font-medium w-20">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {envEntries.map((entry, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={entry.key}
                                onChange={(e) => updateEnvEntry(idx, 'key', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-sm"
                                placeholder="e.g., DEPLOYD_RAFT_PORT"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={entry.value}
                                onChange={(e) => updateEnvEntry(idx, 'value', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-sm"
                                placeholder="e.g., 9966"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                onClick={() => removeEnvEntry(idx)}
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
                      onClick={addEnvEntry}
                      className="mt-3 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      + Add Entry
                    </button>
                  </div>
                )}
                {envFormat === 'json' && (
                  <pre className="text-xs text-gray-700 dark:text-gray-300">{JSON.stringify(envs[selectedEnvVersionIndex]?.value, null, 2)}</pre>
                )}
                {envFormat === 'yaml' && (
                  <pre className="text-xs text-gray-700 dark:text-gray-300">{YAML.dump(flatToNested(envs[selectedEnvVersionIndex]?.value || {}))}</pre>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded bg-gray-50 dark:bg-gray-800 text-center text-gray-600 dark:text-gray-400">
          No environment variables found for this service
        </div>
      )}
    </div>
  );
}
