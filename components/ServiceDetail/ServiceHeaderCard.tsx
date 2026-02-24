"use client";

import React from "react";
import { formatRelativeTime, formatLocalDateTime } from "../../lib/time";
import { Service, ServiceJob } from "../../types/service";

type Repository = {
  namespace?: string;
  id?: string;
};

type BoundAddress = {
  host?: string;
  port?: number;
};

type Props = {
  service: Service | null;
  loading: boolean;
  hasNewBuild: boolean;
  hasNewEnv: boolean;
  hasNewSecret: boolean;
  lastSuccessfulJob: ServiceJob | null;
  onCreateDeployment: () => void;
};

export default function ServiceHeaderCard({
  service,
  loading,
  hasNewBuild,
  hasNewEnv,
  hasNewSecret,
  lastSuccessfulJob,
  onCreateDeployment,
}: Props) {
  if (!service) {
    if (!loading) {
      return (
        <div className="text-sm text-gray-600">
          Service not found.
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mb-6">
      <div className="p-4 rounded bg-gray-50 dark:bg-gray-800">
        <div className="text-lg font-semibold">
          {service.name ?? service.id}
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-300">
          Description: {service.description}
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-300">
          Executable: {service.executable_path}
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-300">
          Repository: {service.repository?.namespace}/{service.repository?.id}
        </div>

        {service.bound_addresses?.length! > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Ports:{" "}
            {service.bound_addresses!
              .map((b) => `${b.host}:${b.port}`)
              .join(", ")}
          </div>
        )}

        <div className="text-sm text-gray-500 mt-2">
          Updated:{" "}
          <span title={formatLocalDateTime(service.published_at)}>
            {formatRelativeTime(service.published_at)}
          </span>
        </div>

        {/* New-version banner */}
        {(hasNewBuild || hasNewEnv || hasNewSecret) && (
          <div className="mt-3 p-3 rounded-lg border-l-4 bg-teal-50 dark:bg-teal-900/20 border-teal-400">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-teal-800 dark:text-teal-200">
                  New configuration available
                </div>

                <div className="text-sm text-teal-700 dark:text-teal-300 mt-1">
                  {hasNewBuild && <span className="font-medium">Build</span>}
                  {hasNewBuild && (hasNewEnv || hasNewSecret) && <span>, </span>}
                  {hasNewEnv && <span className="font-medium">Env</span>}
                  {hasNewEnv && hasNewSecret && <span>, </span>}
                  {hasNewSecret && <span className="font-medium">Secret</span>}
                  {". "} Create a new deployment to pick up latest changes.
                </div>

                {lastSuccessfulJob?.request && (
                  <div className="text-xs text-teal-700 dark:text-teal-300 mt-2">
                    Last deployed:{" "}
                    <span
                      title={formatLocalDateTime(
                        lastSuccessfulJob.published_at
                      )}
                    >
                      {formatRelativeTime(
                        lastSuccessfulJob.published_at
                      )}
                    </span>{" "}
                    — build{" "}
                    {String(
                      lastSuccessfulJob.request.build_version ?? "-"
                    )}
                    , env{" "}
                    {String(
                      lastSuccessfulJob.request.env_version ?? "-"
                    )}
                    , secret{" "}
                    {String(
                      lastSuccessfulJob.request.secret_version ?? "-"
                    )}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                <button
                  onClick={onCreateDeployment}
                  className="px-3 py-1 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
                >
                  Create Deployment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Up-to-date banner */}
        {lastSuccessfulJob &&
          !hasNewBuild &&
          !hasNewEnv &&
          !hasNewSecret && (
            <div className="mt-3 p-3 rounded-lg border-l-4 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400">
              <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                ✓ All components are up to date
              </div>

              <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                Build{" "}
                {String(lastSuccessfulJob.request?.build_version ?? "-")},{" "}
                Env{" "}
                {String(lastSuccessfulJob.request?.env_version ?? "-")},{" "}
                Secret{" "}
                {String(lastSuccessfulJob.request?.secret_version ?? "-")}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}