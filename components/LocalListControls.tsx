import React from "react";
import type { LocalListSort } from "../lib/localList";

type Props = {
  searchText: string;
  onSearchTextChange: (value: string) => void;
  sort: LocalListSort;
  onSortChange: (value: LocalListSort) => void;
  count: number;
  total: number;
  placeholder: string;
  filterLabel?: string;
  filterValue?: string;
  filterOptions?: { label: string; value: string }[];
  onFilterChange?: (value: string) => void;
};

export default function LocalListControls({
  searchText, onSearchTextChange, sort, onSortChange, count, total, placeholder,
  filterLabel, filterValue, filterOptions, onFilterChange,
}: Props) {
  const controlClass = "h-8 rounded-md border border-gray-200 bg-transparent text-xs text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-blue-500 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600";

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className={`relative min-w-[180px] flex-1 sm:max-w-xs ${controlClass}`}>
        <span aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
        <input
          type="search"
          aria-label="Search"
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
          placeholder={placeholder}
          className="h-full w-full bg-transparent py-1 pl-7 pr-2 text-xs text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
        />
      </div>

      <label className="relative">
        <span aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">↕</span>
        <select
          aria-label="Sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as LocalListSort)}
          className={`${controlClass} appearance-none cursor-pointer py-1 pl-7 pr-7`}
        >
          <option value="alphabetical">A–Z</option>
          <option value="recent">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">⌄</span>
      </label>

      {filterLabel && onFilterChange && (
        <label className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">▽</span>
          <select
            aria-label={filterLabel}
            value={filterValue || ""}
            onChange={(event) => onFilterChange(event.target.value)}
            className={`${controlClass} max-w-[180px] appearance-none cursor-pointer py-1 pl-7 pr-7`}
          >
            <option value="">All {filterLabel}</option>
            {(filterOptions || []).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <span aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">⌄</span>
        </label>
      )}

      <span className="ml-auto whitespace-nowrap text-[11px] tabular-nums text-gray-400" title={`${count} of ${total}`}>
        {count}/{total}
      </span>
    </div>
  );
}
