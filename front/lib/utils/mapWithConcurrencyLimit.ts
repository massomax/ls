export async function mapWithConcurrencyLimit<TIn, TOut>(
  items: readonly TIn[],
  limit: number,
  mapper: (item: TIn, index: number) => Promise<TOut>,
): Promise<TOut[]> {
  if (limit <= 0) {
    throw new Error("Concurrency limit must be greater than 0.");
  }

  if (items.length === 0) {
    return [];
  }

  const results: TOut[] = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(limit, items.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}
