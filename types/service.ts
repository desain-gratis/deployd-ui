"use client";

export type Repository = {
    url?: string;
    namespace?: string;
    id?: string;
};

export type BoundAddress = {
    host?: string;
    port?: number;
};

export type Service = {
    namespace: string;
    id: string;
    name?: string;
    description?: string;
    repository?: Repository;
    executable_path?: string;
    bound_addresses?: BoundAddress[];
    published_at?: string;
    url?: string;
};

export type JobStatus = {
    status?: string;
    error_message?: string;
};

export type ServiceJob = {
    namespace?: string;
    id?: string;
    status?: string;
    restart_service_job?: { status?: Record<string, JobStatus> };
    configure_host_job?: { status?: Record<string, JobStatus> };
    request?: {
        service?: Service;
        build_version?: number;
        env_version?: number;
        secret_version?: number;
    };
    target?: Array<{ host?: string }>;
    published_at?: string;
};

export type Secret = {
    namespace?: string;
    service?: string;
    id?: number | string;
    version?: string;
    value?: Record<string, any>;
    published_at?: string;
    url?: string;
};

export type Build = {
    namespace?: string;
    id?: string;
    name?: string;
    commit_id?: string;
    branch?: string;
    actor?: string;
    tag?: string;
    source?: string;
    data?: any;
    published_at?: string;
    repository_id?: string;
    url?: string;
    os_arch?: string[];
    archive?: Array<{ id?: string; url?: string }>;
};