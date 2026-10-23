import './styles.css';
import { authApi } from './api/auth.api.js';
import { ApiError } from './api/client.js';
import { escapeHtml } from './components/html.js';
import { mountAssignmentPage } from './pages/assignment.page.js';
import { mountAppointmentsPage } from './pages/appointments.page.js';
import { mountLoginPage } from './pages/login.page.js';
import { mountMyWorkPage } from './pages/my-work.page.js';

const app = document.querySelector('#app');
const pages = {
  '#assign': { title: 'M1 · Phân công kỹ thuật viên', menuTitle: 'Phân công', mount: mountAssignmentPage },
  '#appointments': { title: 'M2 · Đặt lịch hẹn giao – nhận máy', menuTitle: 'Lịch hẹn', mount: mountAppointmentsPage },
  '#my-work': { title: 'M3 · Công việc của tôi', menuTitle: 'Công việc của tôi', mount: mountMyWorkPage },
};

let renderSequence = 0;

async function renderApp() {
  const sequence = ++renderSequence;
  const [currentHash = '#assign', query = ''] = (window.location.hash || '#assign').split('?');
  const routeParams = Object.fromEntries(new URLSearchParams(query));
  if (currentHash === '#login') {
    mountLoginPage(app);
    return;
  }

  if (currentHash === '#logout') {
    app.innerHTML = '<main class="auth-check" role="status">Đang đăng xuất…</main>';
    try {
      await authApi.logout();
      if (sequence === renderSequence) window.location.hash = '#login';
    } catch {
      if (sequence === renderSequence) {
        app.innerHTML = `<main class="auth-check" role="alert">
          <h1>Không thể đăng xuất</h1>
          <p>Máy chủ chưa phản hồi. Hãy thử lại để kết thúc phiên an toàn.</p>
          <button class="button button-primary" data-action="retry-logout">Thử lại</button>
        </main>`;
        app.querySelector('[data-action="retry-logout"]').addEventListener('click', renderApp);
      }
    }
    return;
  }

  app.innerHTML = '<main class="auth-check" role="status">Đang kiểm tra phiên đăng nhập…</main>';
  let user;
  try {
    ({ user } = await authApi.me());
  } catch (error) {
    if (sequence !== renderSequence) return;
    if (error instanceof ApiError && error.status === 401) {
      mountLoginPage(app, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    }
    app.innerHTML = `<main class="auth-check" role="alert">
      <h1>Không thể kết nối máy chủ</h1>
      <p>Chưa xác minh được phiên đăng nhập. Hãy kiểm tra backend rồi thử lại.</p>
      <button class="button button-primary" data-action="retry-session">Thử lại</button>
    </main>`;
    app.querySelector('[data-action="retry-session"]').addEventListener('click', renderApp);
    return;
  }
  if (sequence !== renderSequence) return;

  const page = pages[currentHash] || pages['#assign'];
  app.innerHTML = `<div class="app-shell">
    <nav class="screen-nav" aria-label="Điều hướng màn hình">
      <a class="screen-nav-brand" href="#assign">Smart CRM <span>· Luồng L4</span></a>
      <div class="screen-nav-links">${Object.entries(pages).map(([hash, item]) => `<a href="${hash}" class="screen-nav-link ${currentHash === hash ? 'active' : ''}" ${currentHash === hash ? 'aria-current="page"' : ''}>${item.menuTitle}</a>`).join('')}</div>
      <div class="screen-nav-account"><span>${escapeHtml(user.displayName || user.username)}</span><a class="button button-outline" href="#logout">Đăng xuất</a></div>
    </nav>
    <main class="screen-frame">
      <header class="screen-title"><h1>${page.title}</h1></header>
      <div id="page-root" class="screen-body" aria-label="${page.title}"></div>
    </main>
  </div>`;
  const pageRoot = app.querySelector('#page-root');
  page.mount(pageRoot, routeParams);
}

window.addEventListener('hashchange', renderApp);
void renderApp();
