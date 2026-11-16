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
};

export default function LocalListControls({
  searchText, onSearchTextChange, sort, onSortChange, count, total, placeholder,
}: Props) {
  return (
    <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Search and filter</label>
          <input
            type="search"
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Organize by</label>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as LocalListSort)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          >
            <option value="alphabetical">Alphabetical (A–Z)</option>
            <option value="recent">Newest (relative-time sections)</option>
            <option value="oldest">Oldest (relative-time sections)</option>
          </select>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Showing {count} of {total}</div>
    </div>
  );
}
