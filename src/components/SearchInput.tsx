interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

/** Free-text filter over resident name and room. Deliberately uncontrolled
 * beyond the value/onChange pair App.tsx already needs for FilterBar
 * combination, so the two filters compose without extra state plumbing. */
export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <input
      type="search"
      className="search-input"
      placeholder="Search by resident or room"
      aria-label="Search by resident or room"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
