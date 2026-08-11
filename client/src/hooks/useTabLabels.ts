import { useCallback, useState } from 'react';
import type { Category } from '../types';
import { TABS } from '../types';

const STORAGE_KEY = 'today_tab_labels';

const DEFAULT_LABELS: Record<Category, string> = Object.fromEntries(
  TABS.map((t) => [t.key, t.label])
) as Record<Category, string>;

function loadLabels(): Partial<Record<Category, string>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Tab display labels are user-renameable and persisted per-browser; the
// category key underneath (client/business_ops/personal) never changes, so
// existing tasks stay assigned to the right tab regardless of its label.
export function useTabLabels() {
  const [overrides, setOverrides] = useState<Partial<Record<Category, string>>>(() => loadLabels());

  const getLabel = useCallback((key: Category) => overrides[key] ?? DEFAULT_LABELS[key], [overrides]);

  const setLabel = useCallback((key: Category, label: string) => {
    const trimmed = label.trim();
    setOverrides((prev) => {
      const next = { ...prev, [key]: trimmed || DEFAULT_LABELS[key] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { getLabel, setLabel };
}
