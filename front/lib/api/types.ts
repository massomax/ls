export type Cursor = string | null;

export type CursorPage<T> = {
  items: T[];
  nextCursor: Cursor;
};
