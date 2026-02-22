import React from 'react';

type Props = {
  builds: any[];
  filteredBuilds: any[];
  buildSearchText: string;
  setBuildSearchText: (s: string) => void;
  selectedBuildBranch: string | null;
  setSelectedBuildBranch: (b: string | null) => void;
  selectedBuildActor: string | null;
  setSelectedBuildActor: (a: string | null) => void;
  setDataModal: (d: any) => void;
};

export default function ReleasesTab({
  builds,
  filteredBuilds,
  buildSearchText,
  setBuildSearchText,
  selectedBuildBranch,
  setSelectedBuildBranch,
  selectedBuildActor,
  setSelectedBuildActor,
  setDataModal,
}: Props) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Releases</h3>

      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by ID, commit, branch..."
              value={buildSearchText}
              onChange={(e) => setBuildSearchText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Branch</label>
            <select
              value={selectedBuildBranch ?? ''}
              onChange={(e) => setSelectedBuildBranch(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
            >
              <option value="">All branches</option>
              {Array.from(new Set(builds.map((b) => b.branch))).map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Actor</label>
            <select
              value={selectedBuildActor ?? ''}
              onChange={(e) => setSelectedBuildActor(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
            >
              <option value="">All actors</option>
              {Array.from(new Set(builds.map((b) => b.actor))).map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          Showing {filteredBuilds.length} of {builds.length} releases
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm table-auto border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Commit</th>
              <th className="px-3 py-2">Branch</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Archive</th>
              <th className="px-3 py-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {filteredBuilds.length > 0 ? (
              filteredBuilds.map((b) => (
                <tr key={b.id} className="border-b">
                  <td className="px-3 py-2 align-top">{b.id}</td>
                  <td className="px-3 py-2 align-top">{b.commit_id}</td>
                  <td className="px-3 py-2 align-top">{b.branch}</td>
                  <td className="px-3 py-2 align-top">{b.actor}</td>
                  <td className="px-3 py-2 align-top">
                    {b.archive && b.archive.length > 0 ? (
                      b.archive.map((a, i) => (
                        <div key={i}>
                          <a href={a.url} className="text-blue-600 dark:text-blue-400" target="_blank" rel="noreferrer">
                            {a.id ?? 'download'}
                          </a>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <button onClick={() => setDataModal(b.data)} className="text-sm text-blue-600 dark:text-blue-400">
                      View JSON
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                  No releases found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
