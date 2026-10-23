import './styles.css';
import { mountAssignmentPage } from './pages/assignment.page.js';
import { mountAppointmentsPage } from './pages/appointments.page.js';
import { mountMyWorkPage } from './pages/my-work.page.js';

const app = document.querySelector('#app');
const pages = {
  '#assign': { title: 'Phân công', mount: mountAssignmentPage },
  '#appointments': { title: 'Lịch hẹn', mount: mountAppointmentsPage },
  '#my-work': { title: 'Công việc của tôi', mount: mountMyWorkPage },
};

function renderApp() {
  const currentHash = window.location.hash || '#assign';
  if (currentHash === '#login') {
    app.innerHTML = `<main class="login-state"><h1>Phiên đăng nhập đã hết hạn</h1>
      <p>Token lưu trong trình duyệt đã được xoá. Bản prototype L4 chưa tích hợp API đăng nhập.</p>
      <a class="button button-primary" href="#assign">Quay lại ứng dụng</a></main>`;
    return;
  }
  const page = pages[currentHash] || pages['#assign'];
  app.innerHTML = `<div class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="#assign"><span class="brand-mark">S</span><span>Smart CRM<small>Track SE · L4</small></span></a>
      <nav aria-label="Điều hướng chính">${Object.entries(pages).map(([hash, item]) => `<a href="${hash}" class="${currentHash === hash ? 'active' : ''}">${item.title}</a>`).join('')}</nav>
      <div class="sidebar-note"><span>Trung tâm bảo hành</span><strong>Phân công &amp; lịch hẹn</strong><small>Dữ liệu trực tiếp từ API L4</small></div>
    </aside>
    <main class="main-content"><div id="page-root" class="page-root" aria-label="${page.title}"></div>
      <footer>Smart CRM · L4 — Ưu tiên xử lý phiếu gần hạn cam kết</footer></main>
  </div>`;
  const pageRoot = app.querySelector('#page-root');
  page.mount(pageRoot);
}

window.addEventListener('hashchange', renderApp);
renderApp();
