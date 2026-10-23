export function DataState({
  state,
  hasFilters = false,
  retryAction = 'retry',
  clearAction = 'clear-filters',
  startAction = 'start',
  children = '',
}) {
  if (state === 'loading') {
    return '<div class="state-panel" role="status">Đang tải dữ liệu…</div>';
  }
  if (state === 'error') {
    return `<div class="state-panel state-error" role="alert">
      <p>Không thể tải dữ liệu. Hãy kiểm tra kết nối máy chủ rồi thử lại.</p>
      <button class="button button-secondary" data-action="${retryAction}">Thử lại</button>
    </div>`;
  }
  if (state === 'empty') {
    const message = hasFilters
      ? 'Không có phiếu phù hợp với bộ lọc.'
      : 'Chưa có dữ liệu cho nội dung này.';
    const action = hasFilters
      ? `<button class="button button-secondary" data-action="${clearAction}">Xoá bộ lọc</button>`
      : `<button class="button button-secondary" data-action="${startAction}">Xem hướng dẫn bắt đầu</button>`;
    return `<div class="state-panel"><p>${message}</p>${action}</div>`;
  }
  return children;
}
