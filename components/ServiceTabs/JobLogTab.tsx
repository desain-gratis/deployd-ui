/* eslint-disable no-unused-vars */
import React from 'react';

type Props = {
  jobLogs: Array<{ message: any; timestamp: string }>;
  setJobLogs: (..._args: any[]) => void;
};

export default function JobLogTab({ jobLogs, setJobLogs }: Props) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Deployment Log</h3>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setJobLogs([])}
          className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Clear Log
        </button>
      </div>

      {jobLogs.length > 0 ? (
        <div className="bg-gray-900 dark:bg-black text-gray-100 p-4 rounded font-mono text-[11px] overflow-auto max-h-[600px] border border-gray-700">
          <div className="space-y-0">
            {[...jobLogs].reverse().map((log, idx) => (
              <div key={idx} className="text-gray-200 leading-tight">
                <span className="text-green-400">$</span> {log.message}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 dark:bg-black text-gray-400 p-6 rounded text-center border border-gray-700 font-mono text-xs">
          No job events yet. Deploy a service to see live updates here.
        </div>
      )}
    </div>
  );
}
