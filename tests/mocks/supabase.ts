import { vi } from 'vitest';

// Chainable Supabase query builder mock
function makeQueryBuilder(result: { data?: unknown; error?: unknown } = { data: null }) {
  const builder: Record<string, unknown> = {};

  const chain = () => builder;

  builder.select = vi.fn(chain);
  builder.insert = vi.fn(chain);
  builder.update = vi.fn(chain);
  builder.upsert = vi.fn(chain);
  builder.delete = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.neq = vi.fn(chain);
  builder.in = vi.fn(chain);
  builder.is = vi.fn(chain);
  builder.or = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.limit = vi.fn(chain);
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = vi.fn((resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve));

  // Make the builder itself thenable so `await supabase.from('x').select('*')` works
  Object.defineProperty(builder, Symbol.toStringTag, { value: 'MockBuilder' });

  return builder;
}

export function createMockSupabase(overrides: {
  users?: { data?: unknown; error?: unknown };
  applications?: { data?: unknown; error?: unknown };
  interview_sessions?: { data?: unknown; error?: unknown };
  user_profiles?: { data?: unknown; error?: unknown };
  resumes?: { data?: unknown; error?: unknown };
} = {}) {
  const mockFrom = vi.fn((table: string) => {
    const result = overrides[table as keyof typeof overrides] ?? { data: null };
    return makeQueryBuilder(result);
  });

  return { from: mockFrom };
}

// Shared mock instance — tests can call mockSupabase.from.mockReturnValueOnce(...)
export const mockSupabase = createMockSupabase();

vi.mock('@/lib/supabase', () => ({
  supabaseServer: () => mockSupabase,
  supabaseBrowser: () => mockSupabase,
}));
