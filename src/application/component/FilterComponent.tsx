import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { DebounceInput } from 'react-debounce-input';
import Filters from '../../domain/entities/Filters';

const FilterComponent = ({
  sendFiltersToParent,
  onSearchFocus,
}: {
  sendFiltersToParent: (filters: Filters) => void;
  onSearchFocus?: () => void;
}) => {
  const [search, setSearch] = useState('');

  const onChange = (event: any) => {
    setSearch(event.target.value);
    sendFiltersToParent(new Filters(event.target.value));
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
        onFocus={onSearchFocus}
      />
    </div>
  );
};

export default FilterComponent;
