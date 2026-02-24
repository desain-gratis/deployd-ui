/* eslint-disable no-unused-vars */
import React from 'react';
import { formatRelativeTime, formatLocalDateTime } from '../../lib/time';

type Props = {
  jobs: any[];
  selectedJobIndex: number;
  setSelectedJobIndex: (..._args: any[]) => void;
  setDataModal: (..._args: any[]) => void;
  getStatusBadgeColor: (..._args: any[]) => string;
};

function getHostStatusColor(status?: string) {
  switch (status) {
    case 'SUCCESS':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';

    case 'FAILED':
    case 'TIMEOUT':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';

    case 'CONFIGURING':
    case 'STARTING':
    case 'RESTARTING':
    case 'WAIT_READY':
    case 'ROUTING_TRAFFIC':
    case 'DRAIN_TRAFFIC':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';

    case 'CANCELLED':
      return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

    case 'PENDING':
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
  }
}

function HostStatusTable({ job }: { job: any }) {
  return (
    <div className="p-4 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="font-medium mb-3">Host Deployment Status</div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-700">
              <th className="text-left px-2 py-2 font-medium">Host</th>
              <th className="text-left px-2 py-2 font-medium">Configure Status</th>
              <th className="text-left px-2 py-2 font-medium">Restart Status</th>
              <th className="text-left px-2 py-2 font-medium">Error Message</th>
            </tr>
          </thead>

          <tbody>
            {job.target?.map((target: any) => {
              const configureStatus =
                target.configure_host_job?.status?.status ||
                job.configure_host_job?.status?.[target.host]?.status ||
                'PENDING';

              const restartStatus =
                target.restart_host_job?.status?.status ||
                job.restart_service_job?.status?.[target.host]?.status ||
                'PENDING';

              const errorMessage =
                target.configure_host_job?.status?.[target.host]?.error_message ||
                target.restart_host_job?.status?.[target.host]?.error_message ||
                '-';

              return (
                <tr
                  key={target.host}
                  className="border-b border-gray-200 dark:border-gray-700"
                >
                  <td className="px-2 py-2 font-medium">{target.host}</td>

                  <td className="px-2 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getHostStatusColor(
                        configureStatus
                      )}`}
                    >
                      {configureStatus}
                    </span>
                  </td>

                  <td className="px-2 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getHostStatusColor(
                        restartStatus
                      )}`}
                    >
                      {restartStatus}
                    </span>
                  </td>

                  <td className="px-2 py-2 text-xs text-red-600 dark:text-red-400">
                    {errorMessage}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DeploymentTab({
  jobs,
  selectedJobIndex,
  setSelectedJobIndex,
  setDataModal,
  getStatusBadgeColor,
}: Props) {
  const selectedJob = jobs[selectedJobIndex];

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Deployment History</h3>

      {jobs.length > 0 ? (
        <div className="space-y-4">
          {/* Job Selector */}
          <div className="p-4 rounded bg-gray-50 dark:bg-gray-800">
            <label className="block text-sm font-medium mb-1">
              Select Job
            </label>

            <select
              value={selectedJobIndex}
              onChange={(e) => setSelectedJobIndex(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-sm"
            >
              {jobs.map((j, idx) => (
                <option key={idx} value={idx}>
                  {j.id} - {formatRelativeTime(j.published_at)} ({j.status || 'UNKNOWN'})
                </option>
              ))}
            </select>
          </div>

          {selectedJob && (
            <div className="space-y-4">
              {/* Job Summary */}
              <div className="p-4 rounded bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium">
                      Job ID: {selectedJob.id}
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Published:{' '}
                      <span
                        title={formatLocalDateTime(selectedJob.published_at)}
                        className="cursor-help underline decoration-dotted"
                      >
                        {formatRelativeTime(selectedJob.published_at)}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadgeColor(
                      selectedJob.status
                    )}`}
                  >
                    {selectedJob.status || 'UNKNOWN'}
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              {selectedJob.status === 'FAILED' && (
                <div className="p-4 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 font-medium">
                  Deployment Failed
                </div>
              )}

              {selectedJob.status === 'DEPLOYED' && (
                <div className="p-4 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 font-medium">
                  Deployment Completed Successfully
                </div>
              )}

              {selectedJob.status &&
                selectedJob.status !== 'FAILED' &&
                selectedJob.status !== 'DEPLOYED' && (
                  <div className="p-4 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 font-medium">
                    Deployment In Progress — Status: {selectedJob.status}
                  </div>
                )}

              {/* Unified Host Table */}
              <HostStatusTable job={selectedJob} />

              {/* Raw JSON Button */}
              <button
                onClick={() => setDataModal(selectedJob)}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                View Raw JSON
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="text-blue-800 dark:text-blue-200 font-medium">
            No Deployment Jobs
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            This service has no deployment history yet.
          </div>
        </div>
      )}
    </div>
  );
}