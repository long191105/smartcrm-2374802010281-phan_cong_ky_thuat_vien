const styles = {
  CAO: 'danger',
  TRUNG_BINH: 'warning',
  THAP: 'success',
  MOI: 'neutral',
  DA_PHAN_CONG: 'info',
  DANG_XU_LY: 'warning',
  CHO_LINH_KIEN: 'warning',
  HOAN_TAT: 'success',
  DA_DAT: 'info',
  DA_XAC_NHAN: 'success',
};

export function Badge(value) {
  const text = String(value ?? '—');
  return `<span class="badge badge-${styles[text] || 'neutral'}">${text}</span>`;
}
