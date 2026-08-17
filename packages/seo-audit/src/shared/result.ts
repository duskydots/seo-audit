export type DomainResult<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): DomainResult<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): DomainResult<never, E> {
  return { ok: false, error };
}
