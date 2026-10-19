const test = require('node:test');
const assert = require('node:assert/strict');
const { validateReceive, validateStatus } =
  require('../src/validators/ticket.validator');

const hopLe = {
  customerId: 1, serialNo: 'SN-10293', productId: 5, centerId: 2,
  categoryId: 1, priority: 'CAO', soldAt: '2026-06-01',
};

test('TV-01 du lieu hop le thi tra ve doi tuong da chuan hoa', () => {
  const ra = validateReceive({ ...hopLe, serialNo: '  SN-10293  ' });
  assert.equal(ra.serialNo, 'SN-10293');
  assert.equal(ra.customerId, 1);
});

test('TV-02 thieu truong bat buoc thi nem loi NEU RO ten truong', () => {
  try {
    validateReceive({ customerId: 1 });
    assert.fail('phai nem loi');
  } catch (e) {
    assert.equal(e.code, 'DU_LIEU_KHONG_HOP_LE');
    assert.match(e.message, /serialNo/);
    const cacTruong = e.chiTiet.cac_truong.map(x => x.truong);
    assert.ok(cacTruong.includes('serialNo'));
    assert.ok(cacTruong.includes('priority'));
  }
});

test('TV-03 serial co ky tu la thi bi tu choi', () => {
  assert.throws(() => validateReceive({ ...hopLe, serialNo: "SN' OR 1=1 --" }),
    { code: 'DU_LIEU_KHONG_HOP_LE' });
});

test('TV-04 ngay ban sai dinh dang thi bi tu choi', () => {
  assert.throws(() => validateReceive({ ...hopLe, soldAt: '01/06/2026' }),
    { code: 'DU_LIEU_KHONG_HOP_LE' });
});

test('TV-05 trang thai ngoai tap cho phep thi bi tu choi', () => {
  assert.throws(() => validateStatus({ status: 'XONG_ROI' }),
    { code: 'DU_LIEU_KHONG_HOP_LE' });
  assert.deepEqual(validateStatus({ status: 'DANG_SUA' }),
    { status: 'DANG_SUA', note: null });
});
