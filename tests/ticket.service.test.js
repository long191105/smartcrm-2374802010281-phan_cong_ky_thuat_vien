const test = require('node:test');
const assert = require('node:assert/strict');
const { TicketService, MAX_OPEN_PER_TECH } =
  require('../src/services/ticket.service');

/* ---------- Cac repository GIA: chi tra ve du lieu ta muon ---------- */
const khachCoThat = { findById: async id => (id === 1 ? { customer_id: 1 } : null) };
const ktvCoThat = {
  findById: async id => (id === 99 ? null
    : { technician_id: id, center_id: 2, is_active: id !== 7 }),
};
function taoTicketRepo({ theoSerial = [], dangMo = [], phieu = null } = {}) {
  return {
    findById:             async () => phieu,
    findBySerial:         async () => theoSerial,
    findOpenByTechnician: async () => dangMo,
    nextTicketCode:       async () => 'PB-TT-CT01-000009',
    insert:               async d => ({ ticket_id: 9, ...d }),
    updateTechnician:     async (id, tech) => ({ ticket_id: id, technician_id: tech }),
    updateStatus:         async (id, _f, to) => ({ ticket_id: id, status: to }),
  };
}
const dauVaoHopLe = {
  customerId: 1, serialNo: 'SN-10293', productId: 5, centerId: 2,
  categoryId: 1, priority: 'CAO', soldAt: '2026-06-01', warrantyMonths: 12,
};
const moc = iso => () => new Date(iso);

/* ================= LOAI 1: LUONG DUNG ================= */

test('TC-01 tiep nhan thiet bi con han bao hanh thi tao duoc phieu', async () => {
  const svc = new TicketService(taoTicketRepo(), khachCoThat, ktvCoThat,
                                moc('2026-09-01T08:00:00Z'));
  const t = await svc.receiveDevice(dauVaoHopLe);
  assert.equal(t.isWarranty, true);
  assert.equal(t.ticketCode, 'PB-TT-CT01-000009');
  assert.ok(t.dueDate.getTime() > Date.parse('2026-09-01T08:00:00Z'));
});

test('TC-02 SLA muc CAO la 24 gio, TRUNG_BINH 72 gio, THAP 120 gio', () => {
  const svc = new TicketService(taoTicketRepo(), khachCoThat, ktvCoThat,
                                moc('2026-09-01T00:00:00Z'));
  const gio = p => (svc.tinhHanXuLy(p).getTime() - Date.parse('2026-09-01T00:00:00Z'))
                   / 3600000;
  assert.equal(gio('CAO'), 24);
  assert.equal(gio('TRUNG_BINH'), 72);
  assert.equal(gio('THAP'), 120);
});

test('TC-03 phan cong ky thuat vien cung trung tam thi thanh cong', async () => {
  const svc = new TicketService(
    taoTicketRepo({ phieu: { ticket_id: 5, ticket_code: 'PB-5',
                             status: 'MOI_TIEP_NHAN', center_id: 2 }, dangMo: [] }),
    khachCoThat, ktvCoThat);
  const ra = await svc.assignTechnician(5, 3);
  assert.deepEqual(ra, { ticket_id: 5, technician_id: 3 });
});

test('TC-04 quan tri chuyen duoc trang thai phieu cua trung tam khac', async () => {
  const svc = new TicketService(
    taoTicketRepo({ phieu: { ticket_id: 5, ticket_code: 'PB-5', status: 'DANG_SUA',
                             center_id: 2, technician_id: 3 } }),
    khachCoThat, ktvCoThat);
  const ra = await svc.changeStatus(5, 'HOAN_TAT',
    { user_id: 3, vai_tro: 'QUAN_TRI', center_id: null });
  assert.equal(ra.status, 'HOAN_TAT');
});

/* ================= LOAI 2: GIA TRI BIEN ================= */

test('TC-05 bien bao hanh: dung ngay het han thi VAN con bao hanh', () => {
  const svc = new TicketService(taoTicketRepo(), khachCoThat, ktvCoThat);
  // Ban 01/03/2026, bao hanh 12 thang -> het han het ngay 01/03/2027.
  assert.equal(svc.isUnderWarranty('2026-03-01', 12, new Date('2027-03-01T23:00:00Z')),
               true);
});

test('TC-05b bien bao hanh: DUNG mili giay cuoi cung cua ngay het han thi VAN con bao hanh', () => {
  const svc = new TicketService(taoTicketRepo(), khachCoThat, ktvCoThat);
  // Quy tac QT-05 noi "con han tinh HET ngay het han", nen diem bien la mili
  // giay cuoi cung cua ngay do. Test nay xac dinh chinh xac diem bien de phan
  // biet <= voi <: neu doi <= thanh < trong isUnderWarranty thi test nay do,
  // trong khi TC-05 (23:00) va TC-06 (sau hai ngay) van xanh.
  const bien = new Date('2026-03-01');
  bien.setMonth(bien.getMonth() + 12);
  bien.setHours(23, 59, 59, 999);

  assert.equal(svc.isUnderWarranty('2026-03-01', 12, new Date(bien.getTime() - 1)),
               true, 'truoc bien mot mili giay: con bao hanh');
  assert.equal(svc.isUnderWarranty('2026-03-01', 12, new Date(bien.getTime())),
               true, 'DUNG bien: con bao hanh (bien la bao gom)');
});

test('TC-06b bien bao hanh: sau bien DUNG mot mili giay thi HET bao hanh', () => {
  const svc = new TicketService(taoTicketRepo(), khachCoThat, ktvCoThat);
  const bien = new Date('2026-03-01');
  bien.setMonth(bien.getMonth() + 12);
  bien.setHours(23, 59, 59, 999);

  assert.equal(svc.isUnderWarranty('2026-03-01', 12, new Date(bien.getTime() + 1)),
               false, 'sau bien mot mili giay: het bao hanh');
});

test('TC-06 bien bao hanh: sau ngay het han mot ngay thi HET bao hanh', () => {
  const svc = new TicketService(taoTicketRepo(), khachCoThat, ktvCoThat);
  assert.equal(svc.isUnderWarranty('2026-03-01', 12, new Date('2027-03-03T00:00:00Z')),
               false);
});

test('TC-07 bien tai KTV: dung MAX-1 phieu dang mo thi VAN phan cong duoc', async () => {
  const dangMo = Array.from({ length: MAX_OPEN_PER_TECH - 1 }, (_, i) => ({ ticket_id: i }));
  const svc = new TicketService(
    taoTicketRepo({ phieu: { ticket_id: 5, ticket_code: 'PB-5',
                             status: 'MOI_TIEP_NHAN', center_id: 2 }, dangMo }),
    khachCoThat, ktvCoThat);
  const ra = await svc.assignTechnician(5, 3);
  assert.equal(ra.technician_id, 3);
});

test('TC-08 bien tai KTV: dung MAX phieu dang mo thi BI TU CHOI', async () => {
  const dangMo = Array.from({ length: MAX_OPEN_PER_TECH }, (_, i) => ({ ticket_id: i }));
  const svc = new TicketService(
    taoTicketRepo({ phieu: { ticket_id: 5, ticket_code: 'PB-5',
                             status: 'MOI_TIEP_NHAN', center_id: 2 }, dangMo }),
    khachCoThat, ktvCoThat);
  await assert.rejects(() => svc.assignTechnician(5, 3), { code: 'KTV_QUA_TAI' });
});

/* ================= LOAI 3: DU LIEU SAI VA QUY TAC NGHIEP VU ================= */

test('TC-09 QT-09 serial da co phieu dang mo thi bi tu choi voi ma PHIEU_DANG_MO',
  async () => {
    const svc = new TicketService(
      taoTicketRepo({ theoSerial: [{ ticket_code: 'PB-0007', status: 'DANG_SUA' }] }),
      khachCoThat, ktvCoThat);
    await assert.rejects(() => svc.receiveDevice(dauVaoHopLe),
      { code: 'PHIEU_DANG_MO' });
  });

test('TC-10 serial co phieu DA HOAN TAT thi VAN tiep nhan duoc phieu moi', async () => {
  const svc = new TicketService(
    taoTicketRepo({ theoSerial: [{ ticket_code: 'PB-0007', status: 'HOAN_TAT' }] }),
    khachCoThat, ktvCoThat, moc('2026-09-01T08:00:00Z'));
  const t = await svc.receiveDevice(dauVaoHopLe);
  assert.equal(t.ticket_id, 9);
});

test('TC-11 khach hang khong ton tai thi bi tu choi', async () => {
  const svc = new TicketService(taoTicketRepo(), khachCoThat, ktvCoThat);
  await assert.rejects(() => svc.receiveDevice({ ...dauVaoHopLe, customerId: 404 }),
    { code: 'KHACH_KHONG_TON_TAI' });
});

test('TC-12 muc uu tien khong hop le thi bi tu choi', async () => {
  const svc = new TicketService(taoTicketRepo(), khachCoThat, ktvCoThat);
  await assert.rejects(() => svc.receiveDevice({ ...dauVaoHopLe, priority: 'KHAN' }),
    { code: 'UU_TIEN_KHONG_HOP_LE' });
});

test('TC-13 KIEM SOAT TRUY CAP: nguoi dung trung tam khac bi tu choi 403', async () => {
  const svc = new TicketService(
    taoTicketRepo({ phieu: { ticket_id: 5, ticket_code: 'PB-5', status: 'DANG_SUA',
                             center_id: 2, technician_id: 3 } }),
    khachCoThat, ktvCoThat);
  await assert.rejects(
    () => svc.changeStatus(5, 'HOAN_TAT',
            { user_id: 1, vai_tro: 'NHAN_VIEN_TIEP_NHAN', center_id: 1 }),
    { code: 'KHONG_CO_QUYEN' });
});

test('TC-14 khong hoan tat duoc phieu chua phan cong ky thuat vien', async () => {
  const svc = new TicketService(
    taoTicketRepo({ phieu: { ticket_id: 5, ticket_code: 'PB-5',
                             status: 'MOI_TIEP_NHAN', center_id: 1,
                             technician_id: null } }),
    khachCoThat, ktvCoThat);
  await assert.rejects(
    () => svc.changeStatus(5, 'HOAN_TAT',
            { user_id: 1, vai_tro: 'NHAN_VIEN_TIEP_NHAN', center_id: 1 }),
    { code: 'CHUA_PHAN_CONG' });
});
