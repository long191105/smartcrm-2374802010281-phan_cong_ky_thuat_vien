import { appointmentsApi } from '../api/appointments.api.js';
import { ticketsApi } from '../api/tickets.api.js';
import { Badge } from '../components/Badge.js';
import { DataState } from '../components/DataState.js';
import { escapeHtml, formatDate } from '../components/html.js';
import { toTicketView } from '../api/ticket-view.mjs';

function today() {
  return vietnamDate(new Date());
}

function vietnamDate(value) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const fields = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

export async function mountAppointmentsPage(root) {
  let date = today();
  let tickets = { state: 'loading' };
  let appointments = { state: 'loading' };
  let selected = null;
  let feedback = '';

  function render() {
    const ticketItems = tickets.data?.items || [];
    const appointmentItems = appointments.data?.items || [];
    root.innerHTML = `
      <header class="page-heading">
        <div><p class="eyebrow">M2 · UC3 / UC4</p><h1>Đặt lịch hẹn giao – nhận máy</h1>
          <p>Lịch hẹn được kiểm tra trùng theo kỹ thuật viên và khung giờ.</p></div>
        <div class="metric-card"><span>Lịch trong ngày</span><strong>${appointments.data?.total ?? '—'}</strong><small>So sánh: lịch trống và lịch đã đặt trong ngày chọn</small></div>
      </header>
      ${feedback ? `<p class="notice" role="status">${escapeHtml(feedback)}</p>` : ''}
      <section class="panel">
        <div class="section-heading"><div><h2>Phiếu đã phân công</h2><p>Chọn phiếu để lấy kỹ thuật viên phụ trách từ hệ thống.</p></div></div>
        ${DataState({
          state: tickets.state,
          retryAction: 'retry-tickets',
          startAction: 'start-appointments',
          children: `<div class="table-wrap"><table><thead><tr><th>Mã phiếu</th><th>Nhóm sự cố</th><th>Kỹ thuật viên</th><th>Khách hàng (mã tham chiếu)</th><th>Thiết bị</th><th></th></tr></thead><tbody>
            ${ticketItems.map((raw) => {
              const ticket = toTicketView(raw);
              return `<tr class="${selected?.ticketCode === ticket.ticketCode ? 'selected-row' : ''}">
                <td data-label="Mã phiếu">${escapeHtml(ticket.ticketCode)}</td><td data-label="Nhóm sự cố">${escapeHtml(ticket.category)}</td>
                <td data-label="Kỹ thuật viên">${escapeHtml(ticket.technicianName)} <small>${escapeHtml(ticket.technicianCode)}</small></td>
                <td data-label="Khách hàng">${escapeHtml(ticket.customerReference || 'Không có trong dữ liệu L4')}</td>
                <td data-label="Thiết bị">${escapeHtml(ticket.serialNumber || '—')}</td>
                <td><button class="button button-quiet" data-action="select-ticket" data-code="${escapeHtml(ticket.ticketCode)}">Đặt lịch</button></td>
              </tr>`;
            }).join('')}
          </tbody></table></div>`,
        })}
      </section>
      <section class="panel">
        <div class="section-heading"><div><h2>Thông tin lịch hẹn</h2>
          <p>${selected ? `${escapeHtml(selected.ticketCode)} · ${escapeHtml(selected.technicianName)} (${escapeHtml(selected.technicianCode)}) · ${escapeHtml(selected.centerCode)}` : 'Chọn phiếu đã phân công để bắt đầu.'}</p></div></div>
        ${selected ? `<form class="form-grid" data-form="appointment">
          <label>Loại lịch hẹn<select name="appointment_type" required><option value="GIAO_MAY">Giao máy</option><option value="NHAN_MAY">Nhận máy</option><option value="KIEM_TRA_TAI_CHO">Kiểm tra tại chỗ</option></select></label>
          <label>Bắt đầu<input name="scheduled_start" type="datetime-local" required></label>
          <label>Thời lượng<select name="duration_minutes"><option value="30">30 phút</option><option value="60">60 phút</option><option value="90">90 phút</option><option value="120">120 phút</option></select></label>
          <label>Ghi chú<input name="note" maxlength="255" placeholder="Thông tin cần lưu ý"></label>
          <div class="form-actions"><button class="button button-primary">Đặt lịch hẹn</button></div>
        </form>` : '<div class="state-panel">Dữ liệu khách hàng và số điện thoại không thuộc schema L4 nên không hiển thị thông tin suy đoán.</div>'}
      </section>
      <section class="panel">
        <div class="section-heading"><div><h2>Lịch hẹn trong ngày</h2><p>Danh sách thật từ API. Chọn kỹ thuật viên hoặc xem toàn bộ lịch.</p></div>
          <label>Ngày <input data-role="date" type="date" value="${escapeHtml(date)}"></label></div>
        ${DataState({
          state: appointments.state,
          hasFilters: Boolean(selected),
          retryAction: 'retry-appointments',
          startAction: 'start-schedule',
          children: `<div class="table-wrap"><table><thead><tr><th>Bắt đầu</th><th>Kết thúc</th><th>Phiếu</th><th>Kỹ thuật viên</th><th>Loại</th><th>Trạng thái</th></tr></thead><tbody>
            ${appointmentItems.map((appointment) => `<tr>
              <td data-label="Bắt đầu">${escapeHtml(formatDate(appointment.start_at))}</td><td data-label="Kết thúc">${escapeHtml(formatDate(appointment.end_at))}</td>
              <td data-label="Phiếu">${escapeHtml(appointment.ticket_code)}</td><td data-label="Kỹ thuật viên">${escapeHtml(appointment.full_name)} <small>${escapeHtml(appointment.technician_code)}</small></td>
              <td data-label="Loại">${escapeHtml(appointment.appointment_type)}</td><td data-label="Trạng thái">${Badge(appointment.status)}</td>
            </tr>`).join('')}
          </tbody></table></div>`,
        })}
      </section>`;
  }

  async function loadTickets() {
    tickets = { state: 'loading' };
    render();
    try {
      const data = await ticketsApi.list({ status: 'DA_PHAN_CONG', limit: 100 });
      tickets = { state: data.items.length ? 'ready' : 'empty', data };
    } catch (error) {
      tickets = { state: 'error', error };
    }
    render();
  }

  async function loadAppointments() {
    appointments = { state: 'loading' };
    render();
    try {
      const data = await appointmentsApi.list({
        technician_code: selected?.technicianCode,
        date,
      });
      appointments = { state: data.items.length ? 'ready' : 'empty', data };
    } catch (error) {
      appointments = { state: 'error', error };
    }
    render();
  }

  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'retry-tickets') return loadTickets();
    if (button.dataset.action === 'retry-appointments') return loadAppointments();
    if (button.dataset.action === 'start-appointments') {
      window.location.hash = '#assign';
      return;
    }
    if (button.dataset.action === 'start-schedule') {
      feedback = 'Chọn phiếu đã phân công để đặt lịch hẹn.';
      return render();
    }
    if (button.dataset.action === 'clear-filters') {
      selected = null;
      return loadAppointments();
    }
    if (button.dataset.action === 'select-ticket') {
      const raw = tickets.data.items.find((ticket) => ticket.ticket_code === button.dataset.code);
      selected = raw ? toTicketView(raw) : null;
      loadAppointments();
    }
  });
  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-role="date"]')) {
      date = event.target.value || today();
      loadAppointments();
    }
  });
  root.addEventListener('submit', async (event) => {
    if (event.target.dataset.form !== 'appointment') return;
    event.preventDefault();
    const values = new FormData(event.target);
    const localDate = new Date(String(values.get('scheduled_start')));
    if (Number.isNaN(localDate.getTime())) {
      feedback = 'Vui lòng nhập thời gian bắt đầu hợp lệ.';
      render();
      return;
    }
    try {
      const created = await appointmentsApi.create({
        ticket_code: selected.ticketCode,
        appointment_type: String(values.get('appointment_type')),
        scheduled_start: localDate.toISOString(),
        duration_minutes: Number(values.get('duration_minutes')),
        note: String(values.get('note') || '').trim(),
      });
      feedback = `Đã đặt lịch từ ${formatDate(created.start_at)} đến ${formatDate(created.end_at)}.`;
      date = vietnamDate(new Date(created.start_at));
      await loadAppointments();
    } catch (error) {
      feedback = error.code === 'APPOINTMENT_CONFLICT'
        ? `Lịch bị trùng. ${error.fields.ticket_code ? `Phiếu xung đột: ${error.fields.ticket_code}.` : 'Vui lòng chọn khung giờ khác.'}`
        : error.message;
      render();
    }
  });

  await Promise.all([loadTickets(), loadAppointments()]);
}
