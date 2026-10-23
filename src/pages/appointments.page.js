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
  let duration = 30;
  let appointmentStart = defaultAppointmentTime();

  function render() {
    const ticketItems = tickets.data?.items || [];
    const appointmentItems = appointments.data?.items || [];
    root.innerHTML = `
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
        <h2>Thông tin phiếu</h2>
        ${selected ? `<div class="customer-ticket-grid ticket-details">
          <div class="detail-field"><span>Phiếu bảo hành</span><div class="detail-value">${escapeHtml(selected.ticketCode)}</div></div>
          <div class="detail-field"><span>Kỹ thuật viên</span><div class="detail-value">${escapeHtml(selected.technicianName)} · ${escapeHtml(selected.technicianCode)}</div></div>
          <div class="detail-field"><span>Khách hàng · mã tham chiếu</span><div class="detail-value">${escapeHtml(selected.customerReference || 'Không có dữ liệu L4')}</div></div>
          <div class="detail-field"><span>Trung tâm</span><div class="detail-value">${escapeHtml(selected.centerCode)}</div></div>
          <div class="detail-field"><span>Thiết bị</span><div class="detail-value">${escapeHtml(selected.serialNumber || '—')}</div></div>
          <p class="privacy-note">L4 không lưu số điện thoại hoặc hồ sơ khách hàng; giao diện không hiển thị dữ liệu giả.</p>
        </div>` : '<div class="state-panel">Chọn phiếu đã phân công để hiển thị thông tin phiếu.</div>'}
      </section>
      <section class="panel appointment-panel">
        <h2>Lịch hẹn</h2>
        ${selected ? `<form class="appointment-form-grid" data-form="appointment">
          <div class="appointment-type-field"><span>Loại lịch hẹn</span>
            <span class="appointment-type-switch">
              <label><input type="radio" name="appointment_type" value="GIAO_MAY" checked>Giao máy</label>
              <label><input type="radio" name="appointment_type" value="NHAN_MAY">Nhận máy</label>
            </span>
          </div>
          <label>Trạng thái<div class="detail-value">${Badge('DA_DAT')}</div></label>
          <label>Bắt đầu<input name="scheduled_start" type="datetime-local" value="${escapeHtml(appointmentStart)}" required></label>
          <label>Kết thúc<input data-role="end-time" type="datetime-local" value="${escapeHtml(addMinutes(appointmentStart, duration))}" readonly></label>
          <label class="appointment-note">Ghi chú<input name="note" maxlength="255" placeholder="Thông tin cần lưu ý"></label>
          <label>Thời lượng<select name="duration_minutes"><option value="30">30 phút</option><option value="60">60 phút</option><option value="90">90 phút</option><option value="120">120 phút</option></select></label>
          <div class="appointment-notice state-panel" data-role="conflict"><strong>E3</strong><span>Thời gian được kiểm tra với lịch của kỹ thuật viên trước khi lưu.</span></div>
          <div class="form-actions"><button class="button button-primary">Đặt lịch hẹn</button><button type="button" class="button button-outline" data-action="cancel">Hủy</button></div>
        </form>` : '<div class="state-panel">Chọn phiếu đã phân công để đặt lịch hẹn giao – nhận máy.</div>'}
      </section>
      <section class="panel">
        <div class="section-heading"><div><h2>Lịch hẹn của kỹ thuật viên trong ngày</h2><p>${selected ? escapeHtml(selected.technicianName) : 'Toàn bộ kỹ thuật viên'}</p></div>
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
    if (button.dataset.action === 'cancel') {
      selected = null;
      feedback = '';
      return render();
    }
    if (button.dataset.action === 'clear-filters') {
      selected = null;
      return loadAppointments();
    }
    if (button.dataset.action === 'select-ticket') {
      const raw = tickets.data.items.find((ticket) => ticket.ticket_code === button.dataset.code);
      selected = raw ? toTicketView(raw) : null;
      appointmentStart = defaultAppointmentTime();
      duration = 30;
      loadAppointments();
    }
  });
  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-role="date"]')) {
      date = event.target.value || today();
      loadAppointments();
    }
    if (event.target.matches('[name="duration_minutes"]')) {
      duration = Number(event.target.value);
      updateEndTime(root, duration);
    }
    if (event.target.matches('[name="scheduled_start"]')) {
      appointmentStart = event.target.value;
      updateEndTime(root, duration);
    }
  });
  root.addEventListener('input', (event) => {
    if (event.target.matches('[name="scheduled_start"]')) {
      appointmentStart = event.target.value;
      updateEndTime(root, duration);
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

function updateEndTime(root, durationMinutes) {
  const start = root.querySelector('[name="scheduled_start"]');
  const end = root.querySelector('[data-role="end-time"]');
  if (!start || !end || !start.value) {
    if (end) end.value = '';
    return;
  }
  const date = new Date(start.value);
  if (Number.isNaN(date.getTime())) {
    end.value = '';
    return;
  }
  date.setMinutes(date.getMinutes() + durationMinutes);
  const localValue = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  end.value = localValue.toISOString().slice(0, 16);
}

function defaultAppointmentTime() {
  const date = new Date();
  date.setMinutes(Math.ceil((date.getMinutes() + 15) / 15) * 15, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function addMinutes(value, minutes) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() + minutes);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
