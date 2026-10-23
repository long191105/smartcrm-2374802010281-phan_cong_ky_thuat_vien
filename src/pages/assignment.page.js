import { ticketsApi } from '../api/tickets.api.js';
import { techniciansApi } from '../api/technicians.api.js';
import { Badge } from '../components/Badge.js';
import { DataState } from '../components/DataState.js';
import { escapeHtml, formatDate } from '../components/html.js';
import { Pagination } from '../components/Pagination.js';
import { toTicketView } from '../api/ticket-view.mjs';
import { fetchResource } from '../hooks/useTickets.js';

const PAGE_SIZE = 10;

export async function mountAssignmentPage(root) {
  let category = '';
  let center = '';
  let offset = 0;
  let queue = { state: 'loading' };
  let technicians = { state: 'empty', data: { items: [] } };
  let selectedTicket = null;
  let selectedTechnician = null;
  let history = { state: 'empty', data: { items: [] } };
  let feedback = '';

  function render() {
    const tickets = queue.data?.items || [];
    const techs = technicians.data?.items || [];
    root.innerHTML = `
      ${feedback ? `<p class="notice" role="status">${escapeHtml(feedback)}</p>` : ''}
      <section class="panel">
        <div class="section-heading"><div><h2>Phiếu chờ phân công</h2><p>Danh sách lấy trực tiếp từ API, sắp theo hạn cam kết.</p></div>
          <form class="filter-form" data-form="filters">
            <label>Trung tâm <input name="center" value="${escapeHtml(center)}" placeholder="TT01" maxlength="4"></label>
            <label>Nhóm sự cố <select name="category"><option value="">Tất cả</option>
              ${['MAN_HINH','PIN','SAC','PHAN_MEM','NUOC_VAO','KHAC'].map((value) => `<option ${category === value ? 'selected' : ''}>${value}</option>`).join('')}
            </select></label>
            <button class="button button-secondary">Lọc</button>
          </form></div>
        ${DataState({
          state: queue.state,
          hasFilters: Boolean(category || center),
          children: `<div class="table-wrap"><table><thead><tr><th>Mã phiếu</th><th>Nhóm sự cố</th><th>Ưu tiên</th><th>Hạn cam kết</th><th>Cảnh báo</th><th></th></tr></thead><tbody>
            ${tickets.map((raw) => {
              const ticket = toTicketView(raw);
              const overdue = ticket.dueAt && new Date(ticket.dueAt) < new Date(Date.now() + 24 * 60 * 60 * 1000);
              return `<tr class="${selectedTicket?.ticketCode === ticket.ticketCode ? 'selected-row' : ''}">
                <td data-label="Mã phiếu">${escapeHtml(ticket.ticketCode)}</td><td data-label="Nhóm">${escapeHtml(ticket.category)}</td>
                <td data-label="Ưu tiên">${Badge(ticket.priority)}</td><td data-label="Hạn cam kết">${escapeHtml(formatDate(ticket.dueAt))}</td>
                <td data-label="Cảnh báo">${overdue ? Badge(new Date(ticket.dueAt) < new Date() ? 'QUÁ HẠN' : 'SẮP QUÁ HẠN') : '—'}</td>
                <td><button class="button button-quiet" data-action="select-ticket" data-code="${escapeHtml(ticket.ticketCode)}">Chọn</button></td>
              </tr>`;
            }).join('')}
          </tbody></table></div>${Pagination({ total: queue.data?.total || 0, limit: PAGE_SIZE, offset })}`,
        })}
      </section>
      <section class="panel">
        <div class="section-heading"><div><h2>Gợi ý kỹ thuật viên</h2><p>${selectedTicket ? `Phiếu ${escapeHtml(selectedTicket.ticketCode)} · ${escapeHtml(selectedTicket.centerCode)} · ${escapeHtml(selectedTicket.category)}` : 'Chọn một phiếu để xem người phù hợp.'}</p></div></div>
        ${!selectedTicket ? '<div class="state-panel">Chọn phiếu trong danh sách để xem gợi ý từ dữ liệu kỹ thuật viên.</div>' : technicians.state === 'empty' ? '<div class="state-panel state-error"><strong>E2 · Không có kỹ thuật viên phù hợp</strong><span>Không có người đang hoạt động, cùng trung tâm và đủ tay nghề cho nhóm sự cố này.</span></div>' : DataState({
          state: technicians.state,
          retryAction: 'retry-tech',
          children: `<div class="table-wrap"><table><thead><tr><th>Kỹ thuật viên</th><th>Bậc</th><th>Tay nghề</th><th>Đang giữ</th><th>Chọn</th></tr></thead><tbody>
            ${techs.map((tech) => {
              const skill = tech.skills.find((item) => item.category_name === selectedTicket.category);
              const qualified = skill?.proficiency >= 3;
              return `<tr class="${qualified ? '' : 'muted-row'}">
                <td data-label="Kỹ thuật viên">${escapeHtml(tech.full_name)} <small>${escapeHtml(tech.technician_code)}</small></td>
                <td data-label="Bậc">${escapeHtml(tech.level)}</td>
                <td data-label="Tay nghề">${skill?.proficiency ?? '—'} / 5</td>
                <td data-label="Đang giữ">${tech.open_tickets} / ${tech.max_open_tickets} ${tech.at_limit ? Badge('QUÁ NGƯỠNG') : ''}</td>
                <td><button class="button button-secondary" data-action="choose-tech" data-code="${escapeHtml(tech.technician_code)}" ${qualified ? '' : 'disabled'}>${selectedTechnician?.technician_code === tech.technician_code ? 'Đã chọn' : qualified ? 'Chọn' : 'Chưa đủ tay nghề'}</button></td>
              </tr>`;
            }).join('')}
          </tbody></table></div>
          ${techs.some((tech) => tech.skills.some(
            (skill) => skill.category_name === selectedTicket.category && skill.proficiency >= 3,
          )) ? '' : '<div class="state-panel state-error"><strong>E1 · Chưa đủ tay nghề</strong><span>Tay nghề của kỹ thuật viên thấp hơn mức yêu cầu 3/5.</span></div>'}
          <p class="helper-text">Chỉ chọn kỹ thuật viên cùng trung tâm, đang hoạt động và đủ tay nghề. Người đủ điều kiện được xếp theo số phiếu đang mở tăng dần.</p>`,
        })}
      </section>
      <section class="panel">
        <h2>Xác nhận phân công</h2>
        <form class="form-grid" data-form="assignment">
          <label>Mã kỹ thuật viên đã chọn<input readonly value="${escapeHtml(selectedTechnician ? `${selectedTechnician.full_name} (${selectedTechnician.technician_code})` : '')}" placeholder="Chưa chọn"></label>
          <label>Mã người phân công<input name="assigned_by" required maxlength="100" placeholder="Nhập mã nhân viên quản lý"></label>
          <div class="form-actions"><button class="button button-primary" ${!selectedTicket || !selectedTechnician ? 'disabled' : ''}>Xác nhận phân công</button></div>
        </form>
        ${history.state === 'error' ? DataState({ state: 'error', retryAction: 'retry-history' }) : ''}
        ${history.state === 'ready' ? `<h3>Lịch sử phiếu ${escapeHtml(selectedTicket?.ticketCode || '')}</h3>
          <ul class="history-list">${(history.data?.items || []).map((item) => `<li><time>${escapeHtml(formatDate(item.occurred_at))}</time><strong>${escapeHtml(item.event_type === 'ASSIGNMENT' ? 'Phân công' : `${item.from_status || '—'} → ${item.to_status}`)}</strong><span>${escapeHtml(item.technician_code || item.actor || '')}</span><span>${escapeHtml(item.note || '—')}</span></li>`).join('')}</ul>` : ''}
      </section>`;
  }

  async function loadQueue() {
    queue = { state: 'loading' };
    render();
    queue = await fetchResource(() => ticketsApi.list({
        status: 'MOI',
        category_name: category,
        center_code: center,
        limit: PAGE_SIZE,
        offset,
      }));
    render();
  }

  async function selectTicket(code) {
    const raw = queue.data.items.find((ticket) => ticket.ticket_code === code);
    selectedTicket = raw ? toTicketView(raw) : null;
    selectedTechnician = null;
    technicians = { state: 'loading', data: { items: [] } };
    history = { state: 'loading', data: { items: [] } };
    render();
    const [techResult, historyResult] = await Promise.allSettled([
      techniciansApi.list({
        category_name: selectedTicket.category,
        center_code: selectedTicket.centerCode,
      }),
      ticketsApi.history(code),
    ]);
    technicians = techResult.status === 'fulfilled'
      ? { state: techResult.value.items.length ? 'ready' : 'empty', data: techResult.value }
      : { state: 'error', error: techResult.reason };
    history = historyResult.status === 'fulfilled'
      ? { state: historyResult.value.items.length ? 'ready' : 'empty', data: historyResult.value }
      : { state: 'error', error: historyResult.reason };
    render();
  }

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'retry') return loadQueue();
    if (button.dataset.action === 'retry-tech') {
      if (selectedTicket) return selectTicket(selectedTicket.ticketCode);
      return loadQueue();
    }
    if (button.dataset.action === 'retry-history' && selectedTicket) return selectTicket(selectedTicket.ticketCode);
    if (button.dataset.action === 'start') {
      feedback = 'Phiếu mới cần được tiếp nhận từ luồng L2 trước khi phân công.';
      return render();
    }
    if (button.dataset.action === 'clear-filters') {
      category = '';
      center = '';
      offset = 0;
      return loadQueue();
    }
    if (button.dataset.action === 'page') {
      offset = Number(button.dataset.offset);
      return loadQueue();
    }
    if (button.dataset.action === 'select-ticket') return selectTicket(button.dataset.code);
    if (button.dataset.action === 'choose-tech') {
      selectedTechnician = technicians.data.items.find(
        (tech) => tech.technician_code === button.dataset.code,
      );
      render();
    }
  });
  root.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (event.target.dataset.form === 'filters') {
      const values = new FormData(event.target);
      center = String(values.get('center') || '').trim().toUpperCase();
      category = String(values.get('category') || '');
      offset = 0;
      selectedTicket = null;
      return loadQueue();
    }
    if (event.target.dataset.form === 'assignment' && selectedTicket && selectedTechnician) {
      const values = new FormData(event.target);
      const confirmOverload = selectedTechnician.open_tickets >= selectedTechnician.max_open_tickets;
      if (confirmOverload && !window.confirm('Kỹ thuật viên đã đạt ngưỡng 15 phiếu đang mở. Xác nhận phân công vượt ngưỡng?')) return;
      try {
        await ticketsApi.assign(selectedTicket.ticketCode, {
          technician_code: selectedTechnician.technician_code,
          assigned_by: String(values.get('assigned_by') || '').trim(),
          confirm_overload: confirmOverload,
        });
        feedback = 'Đã phân công phiếu thành công.';
        selectedTicket = null;
        selectedTechnician = null;
        await loadQueue();
      } catch (error) {
        feedback = error.message;
        render();
      }
    }
  });

  await loadQueue();
}
