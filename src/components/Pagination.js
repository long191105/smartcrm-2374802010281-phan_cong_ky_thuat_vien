export function Pagination({ total, limit, offset, action = 'page' }) {
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  return `<nav class="pagination" aria-label="Phân trang">
    <button class="button button-quiet" data-action="${action}" data-offset="${Math.max(0, offset - limit)}" ${page <= 1 ? 'disabled' : ''}>‹ Trước</button>
    <span>Trang ${page} / ${pages} · ${total} phiếu</span>
    <button class="button button-quiet" data-action="${action}" data-offset="${offset + limit}" ${page >= pages ? 'disabled' : ''}>Sau ›</button>
  </nav>`;
}
