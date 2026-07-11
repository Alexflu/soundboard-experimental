import React, { useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { DebounceInput } from 'react-debounce-input';
import Filters from '../../domain/entities/Filters';

const FilterComponent = ({
  sendFiltersToParent,
}: {
  sendFiltersToParent: (filters: Filters) => void;
}) => {
  const [search, setSearch] = useState('');

  const updateSearch = (value: string) => {
    setSearch(value);
    sendFiltersToParent(new Filters(value));
  };

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateSearch(event.target.value);
  };

  return (
    <div className="filters-component">
      <FaSearch className="search-icon" />
      <DebounceInput
        className="input-search"
        placeholder="Search..."
        debounceTimeout={400}
        value={search}
        onChange={onChange}
      />
      {search && (
        <button
          type="button"
          className="clear-search-button"
          onClick={() => updateSearch('')}
          title="Clear search"
          aria-label="Clear search"
        >
          <FaTimes />
        </button>
      )}
    </div>
  );
};

export default FilterComponent;
