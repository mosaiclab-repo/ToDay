export default function Checkbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`checkbox ${checked ? 'checked' : ''}`}
      onClick={onToggle}
      aria-pressed={checked}
      aria-label={checked ? 'Mark as not done' : 'Mark as done'}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M2.5 7.5L5.5 10.5L11.5 3.5"
          stroke="#0d0e10"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
