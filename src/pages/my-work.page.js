import { techniciansApi } from '../api/technicians.api.js';
import { ticketsApi } from '../api/tickets.api.js';
import { Badge } from '../components/Badge.js';
import { DataState } from '../components/DataState.js';
import { escapeHtml, formatDate } from '../components/html.js';
import { toTicketView } from '../api/ticket-view.mjs';
import { fetchResource } from '../hooks/useTickets.js';

const OPEN_STATUSES = new Set(['DA_PHAN_CONG', 'DANG_XU_LY', 'CHO_LINH_KIEN']);
const NEXT_STATUS = {
  DA_PHAN_CONG: [{ value: 'DANG_XU_LY', label: 'Đang xử lý' }],
  DANG_XU_LY: [
    { value: 'CHO_LINH_KIEN', label: 'Chờ linh kiện' },
    { value: 'HOAN_TAT', label: 'Hoàn tất' },
  ],
  CHO_LINH_KIEN: [
    { value: 'DANG_XU_LY', label: 'Tiếp tục xử lý' },
    { value: 'HOAN_TAT', label: 'Hoàn tất' },
  ],
};

export async function mountMyWorkPage(root, routeParams = {}) {
  let technicians = { state: 'loading' };
  let tickets = { state: 'empty', data: { items: [] } };
  let history = { state: 'empty', data: { items: [] } };
  let technicianCode = routeParams.technician_code || '';
  let selectedTicket = null;
  let onlyOpen = true;
  let feedback = '';
  let completedTicket = null;

  function render() {
    const allTickets = tickets.data?.items || [];
    const shown = allTickets.filter((ticket) => !onlyOpen || OPEN_STATUSES.has(ticket.status));
    const techItems = technicians.data?.items || [];
    root.innerHTML = `
      ${feedback ? `<div class="notice" role="status">${escapeHtml(feedback)}${completedTicket ? `
        <a class="button button-primary workflow-next" href="#assign">Quy trình hoàn tất · Tiếp tục phiếu khác</a>` : ''}</div>` : ''}
      <section class="panel">
        <div class="section-heading"><div><h2>Kỹ thuật viên</h2><p>Chọn danh tính kỹ thuật viên trong dữ liệu đã nạp.</p></div>
          <label>Người phụ trách<select data-role="technician" ${technicians.state !== 'ready' ? 'disabled' : ''}>
            <option value="">Chọn kỹ thuật viên</option>
            ${techItems.map((tech) => `<option value="${escapeHtml(tech.technician_code)}" ${technicianCode === tech.technician_code ? 'selected' : ''}>${escapeHtml(tech.full_name)} · ${escapeHtml(tech.technician_code)} · ${tech.open_tickets} phiếu</option>`).join('')}
          </select></label></div>
        ${technicians.state === 'error' ? DataState({ state: 'error', retryAction: 'retry-technicians' }) : ''}
      </section>
      <section class="panel">
        <div class="section-heading"><div><h2>Phiếu được giao</h2><p>Được sắp theo hạn cam kết tăng dần.</p></div>
          <label class="checkbox-label"><input type="checkbox" data-role="open-only" ${onlyOpen ? 'checked' : ''}> Chưa hoàn tất</label></div>
        ${!technicianCode ? '<div class="state-panel">Chọn kỹ thuật viên để tải danh sách phiếu được giao.</div>' : DataState({
          state: shown.length ? 'ready' : tickets.state === 'ready' ? 'empty' : tickets.state,
          hasFilters: onlyOpen && allTickets.length > 0,
          clearAction: 'show-all',
          startAction: 'start-work',
          children: `<div class="table-wrap"><table><thead><tr><th>Mã phiếu</th><th>Nhóm sự cố</th><th>Ưu tiên</th><th>Trạng thái</th><th>Hạn cam kết</th><th>Lịch hẹn</th><th></th></tr></thead><tbody>
            ${shown.map((raw) => {
              const ticket = toTicketView(raw);
              return `<tr class="${selectedTicket?.ticketCode === ticket.ticketCode ? 'selected-row' : ''}">
                <td data-label="Mã phiếu">${escapeHtml(ticket.ticketCode)}</td><td data-label="Nhóm sự cố">${escapeHtml(ticket.category)}</td>
                <td data-label="Ưu tiên">${Badge(ticket.priority)}</td><td data-label="Trạng thái">${Badge(ticket.status)}</td>
                <td data-label="Hạn cam kết">${escapeHtml(formatDate(ticket.dueAt))}</td><td data-label="Lịch hẹn">${escapeHtml(formatDate(ticket.appointmentAt))}</td>
                <td><button class="button button-quiet" data-action="select-ticket" data-code="${escapeHtml(ticket.ticketCode)}">Cập nhật</button></td>
              </tr>`;
            }).join('')}
          </tbody></table></div>`,
        })}
      </section>
      ${selectedTicket ? `<section class="panel">
        <h2>Cập nhật trạng thái · ${escapeHtml(selectedTicket.ticketCode)}</h2>
        <div class="desktop-status-row"><span>Trạng thái hiện tại</span><div class="detail-value">${Badge(selectedTicket.status)}</div></div>
        ${NEXT_STATUS[selectedTicket.status]?.length ? `<form class="status-form-grid" data-form="status">
          <label>Chuyển sang</label><select name="status">${NEXT_STATUS[selectedTicket.status].map((item) => `<option value="${item.value}">${item.label}</option>`).join('')}</select>
          <label>Ghi chú</label><input class="full-row" name="note" maxlength="255" placeholder="Ghi nhận kết quả xử lý">
          <div class="state-panel state-error appointment-notice full-row"><strong>E4</strong><span>Không thể quay lại trạng thái trước hoặc bỏ qua bước xử lý.</span></div>
          <div class="form-actions"><button class="button button-primary">Lưu</button></div>
        </form>` : '<p class="helper-text">Phiếu đã hoàn tất; không thể quay lại trạng thái trước.</p>'}
        ${history.state === 'error' ? DataState({ state: 'error', retryAction: 'retry-history' }) : ''}
        ${history.state === 'ready' ? `<h3>Lịch sử trạng thái</h3><ul class="history-list">${(history.data.items || []).map((item) => `<li>
          <time>${escapeHtml(formatDate(item.occurred_at))}</time><strong>${escapeHtml(item.from_status || '—')} → ${escapeHtml(item.to_status || '')}</strong>
          <span>${escapeHtml(item.actor || '')}</span><span>${escapeHtml(item.note || '—')}</span></li>`).join('')}</ul>` : ''}
      </section>` : ''}`;
  }

  async function loadTechnicians() {
    technicians = { state: 'loading' };
    render();
    try {
      const data = await techniciansApi.list();
      technicians = { state: data.items.length ? 'ready' : 'empty', data };
    } catch (error) {
      technicians = { state: 'error', error };
    }
    render();
  }

  async function loadTickets() {
    tickets = { state: 'loading' };
    render();
    tickets = await fetchResource(() => techniciansApi.assignedTickets(technicianCode));
    render();
  }

  async function selectTicket(code) {
    const raw = tickets.data.items.find((ticket) => ticket.ticket_code === code);
    selectedTicket = raw ? toTicketView(raw) : null;
    history = { state: 'loading', data: { items: [] } };
    render();
    try {
      const data = await ticketsApi.history(code);
      history = { state: data.items.length ? 'ready' : 'empty', data };
    } catch (error) {
      history = { state: 'error', error };
    }
    render();
  }

  root.addEventListener('change', async (event) => {
    if (event.target.matches('[data-role="technician"]')) {
      technicianCode = event.target.value;
      selectedTicket = null;
      completedTicket = null;
      feedback = '';
      if (technicianCode) await loadTickets();
      else render();
    }
    if (event.target.matches('[data-role="open-only"]')) {
      onlyOpen = event.target.checked;
      render();
    }
  });
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'retry-technicians') return loadTechnicians();
    if (button.dataset.action === 'retry') return loadTickets();
    if (button.dataset.action === 'retry-history' && selectedTicket) return selectTicket(selectedTicket.ticketCode);
    if (button.dataset.action === 'show-all') {
      onlyOpen = false;
      return render();
    }
    if (button.dataset.action === 'start-work') {
      feedback = 'Chưa có phiếu nào được phân công cho kỹ thuật viên này.';
      return render();
    }
    if (button.dataset.action === 'select-ticket') {
      completedTicket = null;
      feedback = '';
      return selectTicket(button.dataset.code);
    }
  });
  root.addEventListener('submit', async (event) => {
    if (event.target.dataset.form !== 'status') return;
    event.preventDefault();
    const values = new FormData(event.target);
    try {
      const completedCode = selectedTicket.ticketCode;
      const nextStatus = String(values.get('status'));
      await ticketsApi.updateStatus(selectedTicket.ticketCode, {
        status: nextStatus,
        changed_by: technicianCode,
        note: String(values.get('note') || '').trim(),
      });
      feedback = `Đã cập nhật phiếu ${completedCode} sang ${nextStatus}.`;
      completedTicket = { ticketCode: completedCode, status: nextStatus };
      selectedTicket = null;
      await loadTickets();
    } catch (error) {
      feedback = error.message;
      render();
    }
  });

  await loadTechnicians();
  if (technicianCode) {
    await loadTickets();
    if (routeParams.ticket_code && tickets.data?.items.some((ticket) => ticket.ticket_code === routeParams.ticket_code)) {
      await selectTicket(routeParams.ticket_code);
    } else if (routeParams.ticket_code) {
      feedback = 'Không tìm thấy phiếu trong danh sách công việc của kỹ thuật viên đã chọn.';
      render();
    }
  }
}
