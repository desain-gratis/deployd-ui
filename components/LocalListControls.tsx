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
  return (
    <div className="mb-3 flex flex-wrap items-end gap-2">
      <div className="min-w-[180px] flex-1 sm:max-w-xs">
        <label className="mb-1 block text-sm font-medium">Search</label>
        <input
          type="text"
          aria-label="Search"
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
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

      <span className="ml-auto self-center whitespace-nowrap text-[11px] tabular-nums text-gray-400" title={`${count} of ${total}`}>
        {count}/{total}
      </span>
    </div>
  );
}
