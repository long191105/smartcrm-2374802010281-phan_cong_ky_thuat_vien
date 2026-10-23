import './styles.css';
import { mountAssignmentPage } from './pages/assignment.page.js';
import { mountAppointmentsPage } from './pages/appointments.page.js';
import { mountMyWorkPage } from './pages/my-work.page.js';

const app = document.querySelector('#app');
const pages = {
  '#assign': { title: 'M1 · Phân công kỹ thuật viên', useCases: ['UC1', 'UC2', 'UC5', 'UC8', 'UC9'], mount: mountAssignmentPage },
  '#appointments': { title: 'M2 · Đặt lịch hẹn giao – nhận máy', useCases: ['UC3', 'UC4', 'UC7'], mount: mountAppointmentsPage },
  '#my-work': { title: 'M3 · Công việc của tôi', useCases: ['UC6', 'UC9', 'UC10'], mount: mountMyWorkPage },
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
    <header class="wireframe-meta">
      <div class="wireframe-caption"><strong>Wireframe · L4 Phân công kỹ thuật viên và lịch hẹn</strong>
        <span>Nhãn cam = use case · khung đỏ nét đứt = thông báo ngoại lệ · chip màu = giá trị danh mục</span></div>
      <nav class="use-case-nav" aria-label="Điều hướng màn hình">${Object.entries(pages).map(([hash, item]) => item.useCases.map((useCase) => `<a href="${hash}" class="use-case-chip ${currentHash === hash ? 'active' : ''}" aria-current="${currentHash === hash ? 'page' : 'false'}">${useCase}</a>`).join('')).join('')}</nav>
    </header>
    <main class="screen-frame">
      <header class="screen-title"><h1>${page.title}</h1></header>
      <div id="page-root" class="screen-body" aria-label="${page.title}"></div>
    </main>
  </div>`;
  const pageRoot = app.querySelector('#page-root');
  page.mount(pageRoot);
}

window.addEventListener('hashchange', renderApp);
renderApp();
