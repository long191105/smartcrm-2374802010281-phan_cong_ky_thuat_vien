import { authApi } from '../api/auth.api.js';
import { ApiError } from '../api/client.js';
import { escapeHtml } from '../components/html.js';

export function mountLoginPage(root, message = '') {
  root.innerHTML = `<main class="login-page">
    <section class="login-card" aria-labelledby="login-title">
      <a class="login-brand" href="#login">Smart CRM <span>· Luồng L4</span></a>
      <p class="login-eyebrow">CỔNG NỘI BỘ</p>
      <h1 id="login-title">Đăng nhập</h1>
      <p class="login-description">Đăng nhập để quản lý phân công kỹ thuật viên và lịch hẹn bảo hành.</p>
      <form class="login-form">
        <label for="login-username">Tên đăng nhập</label>
        <input id="login-username" name="username" type="text" autocomplete="username" required maxlength="64" autofocus>
        <label for="login-password">Mật khẩu</label>
        <input id="login-password" name="password" type="password" autocomplete="current-password" required maxlength="128">
        <p class="login-message" role="alert" aria-live="polite">${escapeHtml(message)}</p>
        <button class="button button-primary login-submit" type="submit">Đăng nhập</button>
      </form>
      <p class="login-footnote">Tài khoản được cấp bởi quản trị viên. Không có đăng ký công khai.</p>
    </section>
  </main>`;

  const form = root.querySelector('.login-form');
  const messageElement = root.querySelector('.login-message');
  const submitButton = root.querySelector('.login-submit');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    submitButton.disabled = true;
    submitButton.textContent = 'Đang xác thực…';
    messageElement.textContent = '';

    try {
      await authApi.login(formData.get('username'), formData.get('password'));
      window.location.hash = '#assign';
    } catch (error) {
      messageElement.textContent = error instanceof ApiError && error.status === 401
        ? 'Tên đăng nhập hoặc mật khẩu không đúng.'
        : 'Không thể đăng nhập lúc này. Hãy kiểm tra máy chủ rồi thử lại.';
      form.elements.password.value = '';
      submitButton.disabled = false;
      submitButton.textContent = 'Đăng nhập';
    }
  });
}
