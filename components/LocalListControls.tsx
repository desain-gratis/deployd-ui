import React from "react";
import type { LocalListSort } from "../lib/localList";

type Props = {
  searchText: string;
  onSearchTextChange: React.Dispatch<React.SetStateAction<string>>;
  sort: LocalListSort;
  onSortChange: React.Dispatch<React.SetStateAction<LocalListSort>>;
  count: number;
  total: number;
  placeholder: string;
};

export default function LocalListControls({
  searchText, onSearchTextChange, sort, onSortChange, count, total, placeholder,
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

      <select
        aria-label="Sort"
        value={sort}
        onChange={(event) => onSortChange(event.target.value as LocalListSort)}
        className="cursor-pointer rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        <option value="alphabetical">A–Z</option>
        <option value="recent">Newest</option>
        <option value="oldest">Oldest</option>
      </select>

      <span className="ml-auto whitespace-nowrap text-[11px] tabular-nums text-gray-400" title={`${count} of ${total}`}>
        {count}/{total}
      </span>
    </div>
  );
}
