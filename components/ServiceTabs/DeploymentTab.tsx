import React from 'react';

type Props = {
  jobs: any[];
  selectedJobIndex: number;
  setSelectedJobIndex: (n: number) => void;
  setDataModal: (d: any) => void;
  getStatusBadgeColor: (s?: string) => string;
};

export default function DeploymentTab({
  jobs,
  selectedJobIndex,
  setSelectedJobIndex,
  setDataModal,
  getStatusBadgeColor,
}: Props) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Deployment History</h3>

      {jobs.length > 0 ? (
        <div className="space-y-4">
          <div className="p-4 rounded bg-gray-50 dark:bg-gray-800">
            <label className="block text-sm font-medium mb-1">Select Job</label>
            <select
              value={selectedJobIndex}
              onChange={(e) => setSelectedJobIndex(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
            >
              {jobs.map((j, idx) => (
                <option key={idx} value={idx}>
                  {j.id} - {new Date(j.published_at || '').toLocaleString()} ({j.status || 'UNKNOWN'})
                </option>
              ))}
            </select>
          </div>

          {jobs[selectedJobIndex] && (
            <div className="space-y-4">
              <div className="p-4 rounded bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium">Job ID: {jobs[selectedJobIndex].id}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Published: {new Date(jobs[selectedJobIndex].published_at || '').toLocaleString()}</div>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadgeColor(jobs[selectedJobIndex].status)}`}>
                    {jobs[selectedJobIndex].status || 'UNKNOWN'}
                  </span>
                </div>
              </div>

              {jobs[selectedJobIndex].status === 'FAILED' && (
                <div className="p-4 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="text-red-800 dark:text-red-200 font-medium mb-3">Deployment Errors</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-red-300 dark:border-red-700">
                          <th className="text-left px-2 py-2 font-medium">Host</th>
                          <th className="text-left px-2 py-2 font-medium">Configure Status</th>
                          <th className="text-left px-2 py-2 font-medium">Restart Status</th>
                          <th className="text-left px-2 py-2 font-medium">Error Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs[selectedJobIndex].target?.map((target: any) => (
                          <tr key={target.host} className="border-b border-red-200 dark:border-red-800">
                            <td className="px-2 py-2">{target.host}</td>
                            <td className="px-2 py-2 text-xs">{target.configure_host_job?.status?.status || 'UNKNOWN'}</td>
                            <td className="px-2 py-2 text-xs">{target.restart_host_job?.status?.status || 'N/A'}</td>
                            <td className="px-2 py-2 text-xs text-red-700 dark:text-red-300">{target.configure_host_job?.status?.error_message || target.restart_host_job?.status?.error_message || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {jobs[selectedJobIndex].status === 'DEPLOYED' && (
                <div className="p-4 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="text-green-800 dark:text-green-200 font-medium mb-3">Deployment Completed Successfully</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-green-300 dark:border-green-700">
                          <th className="text-left px-2 py-2 font-medium">Host</th>
                          <th className="text-left px-2 py-2 font-medium">Configure Status</th>
                          <th className="text-left px-2 py-2 font-medium">Restart Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs[selectedJobIndex].target?.map((target: any) => (
                          <tr key={target.host} className="border-b border-green-200 dark:border-green-800">
                            <td className="px-2 py-2">{target.host}</td>
                            <td className="px-2 py-2 text-xs">{target.configure_host_job?.status?.status || 'DEPLOYED'}</td>
                            <td className="px-2 py-2 text-xs">{target.restart_host_job?.status?.status || 'COMPLETED'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {jobs[selectedJobIndex].status && jobs[selectedJobIndex].status !== 'FAILED' && jobs[selectedJobIndex].status !== 'DEPLOYED' && (
                <div className="p-4 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <div className="text-yellow-800 dark:text-yellow-200 font-medium">Deployment In Progress</div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">Status: {jobs[selectedJobIndex].status}</div>
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-yellow-300 dark:border-yellow-700">
                          <th className="text-left px-2 py-2 font-medium">Host</th>
                          <th className="text-left px-2 py-2 font-medium">Configure Status</th>
                          <th className="text-left px-2 py-2 font-medium">Restart Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs[selectedJobIndex].target?.map((target: any) => (
                          <tr key={target.host} className="border-b border-yellow-200 dark:border-yellow-800">
                            <td className="px-2 py-2">{target.host}</td>
                            <td className="px-2 py-2 text-xs">{target.configure_host_job?.status?.status || 'PENDING'}</td>
                            <td className="px-2 py-2 text-xs">{target.restart_host_job?.status?.status || 'PENDING'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button
                onClick={() => setDataModal(jobs[selectedJobIndex])}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                View Raw JSON
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="text-blue-800 dark:text-blue-200 font-medium">No Deployment Jobs</div>
          <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">This service has no deployment history yet.</div>
        </div>
      )}
    </div>
  );
}
