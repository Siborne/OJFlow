import { create } from 'zustand';
import type { CodeTemplate } from '../../shared/types';

const TEMPLATE_KEY = 'ojflow_templates';

interface NewTemplate {
  title: string;
  language: string;
  category: string;
  content: string;
}

interface TemplateState {
  items: CodeTemplate[];
  initialized: boolean;
  init: () => Promise<void>;
  addItem: (item: NewTemplate) => CodeTemplate;
  updateItem: (id: string, item: NewTemplate) => CodeTemplate | null;
  removeItem: (id: string) => void;
}

function isTemplate(value: unknown): value is CodeTemplate {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.language === 'string' &&
    typeof item.category === 'string' &&
    typeof item.content === 'string' &&
    typeof item.createdAt === 'number' &&
    typeof item.updatedAt === 'number'
  );
}

function readLocal(): CodeTemplate[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(TEMPLATE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isTemplate) : [];
  } catch {
    return [];
  }
}

function sortItems(items: CodeTemplate[]): CodeTemplate[] {
  return items.slice().sort((a, b) => b.updatedAt - a.updatedAt);
}

function persist(items: CodeTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(items));
  } catch {
    // Keep the in-memory list when local storage is unavailable.
  }
  if (typeof window !== 'undefined') {
    window.store?.set('templates', items).catch(() => {});
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `template-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  items: readLocal(),
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    try {
      const stored = await window.store?.get('templates');
      if (Array.isArray(stored)) {
        const items = sortItems(stored.filter(isTemplate));
        set({ items });
        try {
          localStorage.setItem(TEMPLATE_KEY, JSON.stringify(items));
        } catch {
          // Ignore storage quota errors.
        }
      }
    } catch {
      // Keep the local cache on failure.
    }
    set({ initialized: true });
  },

  addItem: input => {
    const now = Date.now();
    const item: CodeTemplate = {
      id: createId(),
      title: input.title.trim(),
      language: input.language.trim() || 'cpp',
      category: input.category.trim() || 'General',
      content: input.content,
      createdAt: now,
      updatedAt: now,
    };
    const items = sortItems([item, ...get().items]);
    set({ items });
    persist(items);
    return item;
  },

  updateItem: (id, input) => {
    const current = get().items.find(item => item.id === id);
    if (!current) return null;
    const next: CodeTemplate = {
      ...current,
      title: input.title.trim(),
      language: input.language.trim() || current.language,
      category: input.category.trim() || current.category,
      content: input.content,
      updatedAt: Date.now(),
    };
    const items = sortItems(get().items.map(item => (item.id === id ? next : item)));
    set({ items });
    persist(items);
    return next;
  },

  removeItem: id => {
    const items = get().items.filter(item => item.id !== id);
    set({ items });
    persist(items);
  },
}));
