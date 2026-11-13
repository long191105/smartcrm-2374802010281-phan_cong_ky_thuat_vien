require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');

const baseUrl = (process.env.API_BASE_URL
  || `http://localhost:${process.env.APP_PORT || 3000}`).replace(/\/+$/, '');
const username = process.env.AUTH_BOOTSTRAP_USERNAME;
const password = process.env.AUTH_BOOTSTRAP_PASSWORD;
const outputFile = path.join(__dirname, '..', 'docs', 'api-reference-bt3.md');
const startMarker = '<!-- BEGIN GENERATED LIVE API EXAMPLES -->';
const endMarker = '<!-- END GENERATED LIVE API EXAMPLES -->';
const captures = [];
let sessionCookie;

function redact(value, key = '') {
  if (/password|secret|token|cookie|phone|serial|full.?name|display.?name/i.test(key)) {
    return '[REDACTED]';
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [name, redact(item, name)]),
    );
  }
  return value;
}

function formatBody(value) {
  if (typeof value === 'string') {
    return value.trim() ? value : '(empty)';
  }
  return JSON.stringify(value, null, 2);
}

async function request(method, route, body, { auth = true, expected = [200] } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth && sessionCookie) headers.cookie = sessionCookie;

  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const rawBody = await response.text();
  let responseBody = rawBody;
  try {
    responseBody = rawBody ? JSON.parse(rawBody) : '(empty)';
  } catch {
    responseBody = rawBody;
  }

  captures.push({
    method,
    route,
    requestBody: body === undefined ? undefined : redact(body),
    status: response.status,
    contentType: response.headers.get('content-type') || '(not set)',
    responseBody: redact(responseBody),
  });

  if (!expected.includes(response.status)) {
    throw new Error(`${method} ${route} returned HTTP ${response.status}; expected ${expected.join(' or ')}.`);
  }
  return responseBody;
}

function nextTicketCode() {
  const suffix = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  return `BH-${suffix}/${new Date().getFullYear()}`;
}

function dateInVietnam(daysFromNow) {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function ticketBody(ticketCode) {
  return {
    ticket_code: ticketCode,
    customer_id: 14159,
    product_id: 21,
    serial_no: `SN${String(Date.now()).slice(-12)}`,
    center_code: 'TT04',
    category_name: 'MAN_HINH',
    priority: 'CAO',
    issue_desc: 'Disposable API documentation capture record',
    received_at: new Date().toISOString(),
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    is_warranty: true,
    created_by: 'api-doc-capture',
  };
}

function renderMarkdown() {
  const date = new Date().toISOString();
  const sections = captures.map((capture) => {
    const requestBody = capture.requestBody === undefined
      ? ''
      : `\n\n\`\`\`json\n${formatBody(capture.requestBody)}\n\`\`\``;
    return [
      `### ${capture.method} ${capture.route}`,
      '',
      `**Request**${requestBody}`,
      '',
      `**Response: ${capture.status}** (\`${capture.contentType}\`)`,
      '',
      `\`\`\`${capture.contentType.includes('json') ? 'json' : 'text'}`,
      formatBody(capture.responseBody),
      '\`\`\`',
    ].join('\n');
  });
  return [
    startMarker,
    '## Generated live request/response examples',
    '',
    `Captured at ${date} from \`${baseUrl}\`. Session-cookie headers and credential fields are redacted.`,
    'This script creates two temporary tickets, assigns one, updates its status, and creates/updates/cancels an appointment; run it only against a disposable Compose database.',
    '',
    ...sections,
    endMarker,
  ].join('\n\n');
}

async function main() {
  if (!username || !password) {
    throw new Error('Set AUTH_BOOTSTRAP_USERNAME and AUTH_BOOTSTRAP_PASSWORD in .env before capturing.');
  }

  await request('GET', '/', undefined, { auth: false });
  await request('GET', '/health', undefined, { auth: false });
  await request('GET', '/health/ready', undefined, { auth: false });

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const loginBody = await loginResponse.text();
  let parsedLogin;
  try {
    parsedLogin = JSON.parse(loginBody);
  } catch {
    throw new Error(`POST /api/auth/login returned invalid JSON (HTTP ${loginResponse.status}).`);
  }
  const setCookie = loginResponse.headers.get('set-cookie') || '';
  const cookieMatch = setCookie.match(/(?:^|,\s*)smartcrm_session=([^;]+)/);
  if (loginResponse.status !== 200 || !cookieMatch) {
    throw new Error(`POST /api/auth/login failed (HTTP ${loginResponse.status}); no session was captured.`);
  }
  sessionCookie = `smartcrm_session=${cookieMatch[1]}`;
  captures.push({
    method: 'POST',
    route: '/api/auth/login',
    requestBody: { username, password: '[REDACTED]' },
    status: loginResponse.status,
    contentType: loginResponse.headers.get('content-type') || '(not set)',
    responseBody: redact(parsedLogin),
  });

  await request('GET', '/api/auth/me');
  const technicians = await request(
    'GET',
    '/api/technicians?category_name=MAN_HINH&center_code=TT04&status=ACTIVE&limit=100',
  );
  const technician = technicians.items && technicians.items[0];
  if (!technician) {
    throw new Error('No active technician matching MAN_HINH at TT04 was returned by the disposable seed.');
  }
  const technicianCode = technician.technician_code;

  const ticketCode = nextTicketCode();
  await request('POST', '/api/tickets', ticketBody(ticketCode), { expected: [201] });
  const disposableCode = nextTicketCode();
  await request('POST', '/api/tickets', ticketBody(disposableCode), { expected: [201] });
  await request('DELETE', `/api/tickets/${encodeURIComponent(disposableCode)}`, {
    closed_by: 'api-doc-capture',
    note: 'Disposable API documentation capture.',
  });

  const encodedTicketCode = encodeURIComponent(ticketCode);
  await request('GET', `/api/tickets?ticket_code=${encodedTicketCode}`);
  await request('GET', `/api/tickets/${encodedTicketCode}`);
  await request('PATCH', `/api/tickets/${encodedTicketCode}`, { priority: 'TRUNG_BINH' });
  await request('POST', `/api/tickets/${encodedTicketCode}/assignment`, {
    technician_code: technicianCode,
    assigned_by: 'api-doc-capture',
    confirm_overload: true,
  }, { expected: [201] });
  await request('GET', `/api/tickets/${encodedTicketCode}/history`);
  await request('PATCH', `/api/tickets/${encodedTicketCode}/status`, {
    status: 'DANG_XU_LY',
    changed_by: technicianCode,
    note: 'Disposable API documentation capture.',
  });
  await request(
    'GET',
    `/api/technicians/${encodeURIComponent(technicianCode)}/tickets?status=DANG_XU_LY`,
  );

  const appointmentDate = dateInVietnam(2);
  const appointment = await request('POST', '/api/appointments', {
    ticket_code: ticketCode,
    appointment_type: 'NHAN_MAY',
    scheduled_start: `${appointmentDate}T10:00:00+07:00`,
    duration_minutes: 60,
    note: 'Disposable API documentation capture.',
  }, { expected: [201] });
  const appointmentId = appointment.appointment_id;
  await request(
    'GET',
    `/api/appointments?technician_code=${encodeURIComponent(technicianCode)}&date=${appointmentDate}`,
  );
  await request('GET', `/api/appointments/${appointmentId}`);
  await request('PATCH', `/api/appointments/${appointmentId}`, {
    scheduled_start: `${dateInVietnam(3)}T11:00:00+07:00`,
    duration_minutes: 60,
    note: 'Updated disposable API documentation capture.',
  });
  await request('DELETE', `/api/appointments/${appointmentId}`);
  await request('POST', '/api/auth/logout', undefined, { expected: [204] });

  const content = fs.readFileSync(outputFile, 'utf8');
  const markerPattern = new RegExp(
    `${startMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
  );
  const replacement = renderMarkdown();
  if (markerPattern.test(content)) {
    fs.writeFileSync(outputFile, content.replace(markerPattern, replacement));
  } else {
    fs.appendFileSync(outputFile, `\n\n${replacement}\n`);
  }
  console.log(`Captured ${captures.length} HTTP requests for all 21 distinct routes.`);
  console.log(`Updated ${path.relative(process.cwd(), outputFile)}; cookies and credentials are redacted.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
