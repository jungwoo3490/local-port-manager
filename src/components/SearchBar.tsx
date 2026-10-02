import type { RefObject } from "react";

interface SearchBarProps {
  query: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function SearchBar({ query, inputRef, onChange, onClear }: SearchBarProps) {
  return (
    <div className="search-bar">
      <input
        ref={inputRef}
        className="search-bar__input"
        type="text"
        value={query}
        placeholder="포트 번호 또는 프로세스명"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {query.length > 0 && (
        <button className="search-bar__clear" type="button" aria-label="검색어 지우기" onClick={onClear}>
          ×
        </button>
      )}
    </div>
  );
}
