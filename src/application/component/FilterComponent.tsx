import React, { useEffect, useRef, useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import Filters from '../../domain/entities/Filters';
import MasterVolumeControl from './MasterVolumeControl';

const FilterComponent = ({
  sendFiltersToParent,
}: {
  sendFiltersToParent: (filters: Filters) => void;
}) => {
  const [search, setSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateSearch = (value: string, debounce = true) => {
    setSearch(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (debounce) {
      debounceTimer.current = setTimeout(() => {
        sendFiltersToParent(new Filters(value));
      }, 400);
      return;
    }

    sendFiltersToParent(new Filters(value));
  };

  useEffect(
    () => () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    },
    []
  );

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateSearch(event.target.value);
  };

  return (
    <div className="filters-component">
      <FaSearch className="search-icon" />
      <input
        className="input-search"
        placeholder="Search..."
        value={search}
        onChange={onChange}
      />
      {search && (
        <button
          type="button"
          className="clear-search-button"
          onClick={() => updateSearch('', false)}
          title="Clear search"
          aria-label="Clear search"
        >
          <FaTimes />
        </button>
      )}
      <MasterVolumeControl />
    </div>
  );
};

export default FilterComponent;
