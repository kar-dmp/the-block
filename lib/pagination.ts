export function clampPage(requestedPage: number, totalItems: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (!Number.isInteger(requestedPage) || requestedPage < 1) return 1;
  return Math.min(requestedPage, totalPages);
}
