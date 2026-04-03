// ========== 配置 ==========
const CONFIG = {
  owner: '1686756626',
  repos: {
    system: 'Teaching-System',
    calendar: 'Teaching-Calendar',
    materials: 'Teaching-Materials',
    profiles: 'Student-Profiles'
  },
  apiBase: 'https://api.github.com'
};

// ========== 全局状态 ==========
let state = {
  sessions: [],
  students: [],
  currentPage: 'schedule',
  selectedStudent: null,
  calendarCache: {}
};

// ========== GitHub API ==========
function getToken() {
  return localStorage.getItem('github_token') || '';
}

async function githubApi(path, useAuth = false) {
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  const token = getToken();
  if (useAuth && token) {
    headers['Authorization'] = `token ${token}`;
  }
  const res = await fetch(`${CONFIG.apiBase}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `API Error ${res.status}`);
  }
  return res.json();
}

async function getFileContent(path, repo, useAuth = false) {
  const data = await githubApi(`/repos/${CONFIG.owner}/${repo}/contents/${path}`, useAuth);
  const content = data.content.replace(/\n/g, '');
  const decoded = atob(content);
  return decoded;
}

function getRawUrl(repo, path) {
  return `https://raw.githubusercontent.com/${CONFIG.owner}/${repo}/main/${path}`;
}

// ========== 数据加载 ==========
async function loadAllData() {
  showLoading(true);
  try {
    const data = await githubApi(`/repos/${CONFIG.owner}/${CONFIG.repos.profiles}/contents/students.json`, true);
    const content = JSON.parse(atob(data.content.replace(/\n/g, '')));
    state.sessions = content.sessions || [];
    state.students = content.students || [];
    setConnectionStatus(true);
    return true;
  } catch (e) {
    console.error('数据加载失败:', e);
    setConnectionStatus(false);
    return false;
  } finally {
    showLoading(false);
  }
}

// ========== 页面导航 ==========
function navigateTo(page) {
  state.currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.style.display = 'block';
  const navEl = document.querySelector(`.nav-menu li[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  // 关闭移动端侧边栏
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').style.display = 'none';
  // 渲染页面
  switch (page) {
    case 'schedule': renderSchedule(); break;
    case 'students': renderStudents(); break;
    case 'materials': renderMaterialsSidebar(); break;
    case 'calendar': initCalendarSelectors(); break;
  }
}

// ========== 课表渲染 ==========
const DAYS = ['周二', '周五', '周六', '周日'];
const TIME_SLOTS = [
  { label: '上午\n9-10点', rows: ['09:00'] },
  { label: '上午\n10-12点', rows: ['10:00'] },
  { label: '下午\n2-4点', rows: ['14:00'] },
  { label: '下午\n4-6点', rows: ['16:00'] },
  { label: '晚上\n7-9点', rows: ['19:00'] },
  { label: '周二下午', rows: ['下午'] },
  { label: '周五晚上', rows: ['晚上'] }
];

function renderSchedule() {
  const grid = document.getElementById('schedule-grid');
  const now = new Date();
  const today = now.getDay(); // 0=Sun
  const weekNum = getCurrentWeek();

  document.getElementById('current-week-label').textContent = `第${weekNum}周`;
  document.getElementById('week-badge').textContent = `第${weekNum}周`;

  let html = '';
  // 表头
  html += '<div class="schedule-header"></div>';
  DAYS.forEach(day => {
    html += `<div class="schedule-header">${day}</div>`;
  });

  // 固定时间段
  const timeSlots = [
    { label: '9:00-10:00', dayMap: { '周六': '09:00-10:00' } },
    { label: '10:00-12:00', dayMap: { '周六': '10:00-12:00', '周日': '10:00-12:00' } },
    { label: '14:00-16:00', dayMap: { '周六': '14:00-16:00', '周日': '14:00-16:00' } },
    { label: '16:00-18:00', dayMap: { '周六': '16:00-18:00', '周日': '16:00-18:00' } },
    { label: '19:00-21:00', dayMap: { '周六': '19:00-21:00' } }
  ];

  timeSlots.forEach(slot => {
    html += `<div class="schedule-time">${slot.label}</div>`;
    DAYS.forEach(day => {
      const match = findSession(day, slot.label);
      html += `<div class="schedule-cell">${match}</div>`;
    });
  });

  // 特殊时段
  html += '<div class="schedule-time">下午</div>';
  html += `<div class="schedule-cell">${findSession('周二', '下午')}</div>`;
  html += '<div class="schedule-cell"></div><div class="schedule-cell"></div><div class="schedule-cell"></div>';

  html += '<div class="schedule-time">晚上</div>';
  html += '<div class="schedule-cell"></div>';
  html += `<div class="schedule-cell">${findSession('周五', '晚上')}</div>`;
  html += '<div class="schedule-cell"></div><div class="schedule-cell"></div>';

  grid.innerHTML = html;
}

function findSession(day, time) {
  const session = state.sessions.find(s => {
    if (s.day !== day) return false;
    // 精确匹配时间段
    if (s.time === time) return true;
    // 模糊匹配：session的时间包含在slot中
    const slotStart = time.split('-')[0].split(':')[0];
    const sessionStart = s.time.split('-')[0].split(':')[0];
    if (slotStart && sessionStart && slotStart === sessionStart) return true;
    return false;
  });

  if (!session) return '';

  const gradeClass = getGradeClass(session.grade);
  const typeLabel = session.type;
  const studentNames = session.students.join('、');
  const subjects = session.subjects.join('/');

  return `
    <div class="${gradeClass}">
      <div class="session-block" onclick="showSessionDetail('${session.id}')">
        <div class="session-type">${typeLabel}</div>
        <div class="session-students">${studentNames}</div>
        <div class="session-subjects">${subjects}</div>
      </div>
    </div>
  `;
}

function showSessionDetail(sessionId) {
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session) return;
  const gradeClass = getGradeClass(session.grade);
  const badgeClass = getBadgeClass(session.grade);
  const gradeLabel = getGradeLabel(session.grade);

  const html = `
    <div class="modal" style="display:flex">
      <div class="modal-content">
        <button class="modal-close" onclick="this.closest('.modal').style.display='none'">&times;</button>
        <h2 style="margin-bottom:16px">${session.id} ${session.day} ${session.time}</h2>
        <table class="info-table" style="margin-bottom:16px">
          <tr><td>班型</td><td>${session.type}</td></tr>
          <tr><td>年级</td><td><span class="student-card-grade ${badgeClass}">${gradeLabel}</span></td></tr>
          <tr><td>科目</td><td>${session.subjects.join(' / ')}</td></tr>
          <tr><td>当前周</td><td>第${session.current_week}周</td></tr>
          <tr><td>学期</td><td>${session.semester}</td></tr>
        </table>
        <h3 style="margin-bottom:8px">学生列表</h3>
        <ul style="padding-left:20px;line-height:2">
          ${session.students.map(name => {
            const s = state.students.find(st => st.name === name);
            return `<li><a href="#" onclick="showStudentProfile('${name}');return false">${name}</a></li>`;
          }).join('')}
        </ul>
        <div style="margin-top:16px">
          <a class="file-download" href="https://github.com/${CONFIG.owner}/${CONFIG.repos.materials}" target="_blank">查看备课资料</a>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

// ========== 学生渲染 ==========
function renderStudents(filter = 'all') {
  const container = document.getElementById('student-cards');
  const filtered = filter === 'all'
    ? state.students
    : state.students.filter(s => s.grade === filter);

  container.innerHTML = filtered.map(student => {
    const gradeClass = getGradeClass(student.grade);
    const badgeClass = getBadgeClass(student.grade);
    const gradeLabel = getGradeLabel(student.grade);
    const sessionInfo = student.sessions.map(sid => {
      const s = state.sessions.find(ss => ss.id === sid);
      return s ? `${s.day} ${s.time}` : sid;
    }).join('、');

    return `
      <div class="student-card ${gradeClass}" onclick="showStudentProfile('${student.name}')">
        <div class="student-card-header">
          <span class="student-card-name">${student.name}</span>
          <span class="student-card-grade ${badgeClass}">${gradeLabel}</span>
        </div>
        <div class="student-card-info">
          ${sessionInfo}
        </div>
        <div class="student-card-sessions">
          ${student.sessions.map(sid => {
            const s = state.sessions.find(ss => ss.id === sid);
            return s ? `<span class="session-tag">${s.subjects.join('/')}</span>` : '';
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

async function showStudentProfile(name) {
  // 关闭其他模态框
  document.querySelectorAll('.modal').forEach(m => m.remove());

  const student = state.students.find(s => s.name === name);
  if (!student) return;

  const detailDiv = document.getElementById('student-detail');
  const contentDiv = document.getElementById('student-detail-content');

  contentDiv.innerHTML = '<p>加载中...</p>';
  detailDiv.style.display = 'flex';

  try {
    const md = await getFileContent(student.profile, CONFIG.repos.profiles, true);
    contentDiv.innerHTML = `
      <h2>${name}</h2>
      <div class="profile-content">${marked.parse(md)}</div>
    `;
  } catch (e) {
    contentDiv.innerHTML = `<p>加载失败: ${e.message}</p><p>请检查 Token 是否已配置（设置页）</p>`;
  }
}

// ========== 备课资料渲染 ==========
function renderMaterialsSidebar() {
  const list = document.getElementById('materials-student-list');
  // 按年级分组
  const groups = {};
  state.students.forEach(s => {
    if (!groups[s.grade]) groups[s.grade] = [];
    groups[s.grade].push(s);
  });

  let html = '';
  for (const [grade, students] of Object.entries(groups)) {
    html += `<li style="font-weight:600;color:var(--text-secondary);font-size:12px;padding:4px 10px;cursor:default">${getGradeLabel(grade)}</li>`;
    students.forEach(s => {
      html += `<li data-name="${s.name}" onclick="browseMaterials('${s.name}')">
        ${s.name}
        <span class="grade-tag" style="background:${getGradeColor(s.grade)}">${getGradeLabel(s.grade)}</span>
      </li>`;
    });
  }
  list.innerHTML = html;
}

async function browseMaterials(name) {
  // 更新侧边栏选中状态
  document.querySelectorAll('#materials-student-list li').forEach(li => li.classList.remove('active'));
  const sel = document.querySelector(`#materials-student-list li[data-name="${name}"]`);
  if (sel) sel.classList.add('active');

  state.selectedStudent = name;
  const container = document.getElementById('materials-content');

  container.innerHTML = '<div class="empty-state"><div class="spinner"></div><p>加载中...</p></div>';

  try {
    const path = encodeURIComponent(name);
    const files = await githubApi(`/repos/${CONFIG.owner}/${CONFIG.repos.materials}/contents/${path}`);
    // files 应该有 学生/ 和 教师/ 文件夹
    container.innerHTML = `
      <div class="file-browser">
        <div class="breadcrumb">
          <a onclick="renderMaterialsSidebar();document.getElementById('materials-content').innerHTML='<div class=empty-state><p>&#128209;</p><p>请从左侧选择学生查看备课资料</p></div>'">全部学生</a>
          <span>/</span>
          <span>${name}</span>
        </div>
        <h3>${name} 的备课资料</h3>
        <ul class="file-list">
          ${files.map(f => `
            <li class="file-item">
              <span class="file-icon">${f.type === 'dir' ? '&#128193;' : '&#128196;'}</span>
              <span class="file-name">
                <a href="#" onclick="browsePath('${name}/${f.name}', '${f.type}');return false">${f.name}</a>
              </span>
              ${f.type === 'dir' ? '<span class="file-size">文件夹</span>' : `<span class="file-size">${formatSize(f.size)}</span>`}
              ${f.type !== 'dir' ? `<a class="file-download" href="${f.download_url}" target="_blank">下载</a>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><p>&#128533;</p><p>加载失败: ${e.message}</p></div>`;
  }
}

async function browsePath(path, type) {
  if (type === 'dir') {
    const container = document.getElementById('materials-content');
    container.innerHTML = '<div class="empty-state"><div class="spinner"></div><p>加载中...</p></div>';

    try {
      const encodedPath = encodeURIComponent(path);
      const files = await githubApi(`/repos/${CONFIG.owner}/${CONFIG.repos.materials}/contents/${encodedPath}`);

      const parts = path.split('/');
      const breadcrumb = parts.map((p, i) => {
        if (i < parts.length - 1) {
          return `<a onclick="browsePath('${parts.slice(0, i + 1).join('/')}', 'dir')">${p}</a>`;
        }
        return `<span>${p}</span>`;
      }).join(' <span>/</span> ');

      container.innerHTML = `
        <div class="file-browser">
          <div class="breadcrumb">
            <a onclick="renderMaterialsSidebar()">全部学生</a>
            <span>/</span>
            ${breadcrumb}
          </div>
          <ul class="file-list">
            ${files.map(f => `
              <li class="file-item">
                <span class="file-icon">${f.type === 'dir' ? '&#128193;' : '&#128196;'}</span>
                <span class="file-name">
                  <a href="#" onclick="browsePath('${path}/${f.name}', '${f.type}');return false">${f.name}</a>
                </span>
                ${f.type === 'dir' ? '<span class="file-size">文件夹</span>' : `<span class="file-size">${formatSize(f.size)}</span>`}
                ${f.type !== 'dir' ? `<a class="file-download" href="${f.download_url}" target="_blank">下载</a>
                  <button class="file-download" style="background:var(--text-secondary)" onclick="previewFile('${path}/${f.name}')">预览</button>` : ''}
              </li>
            `).join('')}
          </ul>
          <div id="file-preview"></div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><p>&#128533;</p><p>加载失败: ${e.message}</p></div>`;
    }
  } else {
    // 文件：直接预览
    previewFile(path);
  }
}

async function previewFile(path) {
  const previewDiv = document.getElementById('file-preview');
  if (!previewDiv) return;
  previewDiv.innerHTML = '<div class="spinner"></div><p>加载预览...</p>';

  try {
    const encodedPath = encodeURIComponent(path);
    const content = await getFileContent(encodedPath, CONFIG.repos.materials);
    previewDiv.innerHTML = `<h4 style="margin-bottom:8px">文件预览</h4><div class="file-preview">${marked.parse(content)}</div>`;
    previewDiv.scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    previewDiv.innerHTML = `<p style="color:var(--text-secondary)">预览失败: ${e.message}</p>`;
  }
}

// ========== 教学进度 ==========
const SUBJECT_MAP = {
  '初中/八年级': ['语文', '历史', '道德与法治'],
  '初中/九年级': ['语文', '历史', '道德与法治'],
  '高中/高一': ['语文', '历史', '思想政治']
};

function initCalendarSelectors() {
  const gradeSelect = document.getElementById('cal-grade');
  const subjectSelect = document.getElementById('cal-subject');

  gradeSelect.onchange = () => {
    const subjects = SUBJECT_MAP[gradeSelect.value] || [];
    subjectSelect.innerHTML = '<option value="">选择科目</option>' +
      subjects.map(s => `<option value="${s}">${s}</option>`).join('');
  };

  subjectSelect.onchange = () => {
    if (gradeSelect.value && subjectSelect.value) {
      loadCalendar(gradeSelect.value, subjectSelect.value);
    }
  };
}

async function loadCalendar(gradePath, subject) {
  const container = document.getElementById('calendar-content');
  container.innerHTML = '<div class="empty-state"><div class="spinner"></div><p>加载中...</p></div>';

  const cacheKey = `${gradePath}/${subject}`;
  if (state.calendarCache[cacheKey]) {
    renderCalendarContent(state.calendarCache[cacheKey]);
    return;
  }

  try {
    const filePath = `src/${gradePath}/${subject}/下学期.md`;
    const content = await getFileContent(filePath, CONFIG.repos.calendar);
    state.calendarCache[cacheKey] = content;
    renderCalendarContent(content);
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><p>&#128533;</p><p>加载失败: ${e.message}</p></div>`;
  }
}

function renderCalendarContent(md) {
  const container = document.getElementById('calendar-content');
  const weekNum = getCurrentWeek();
  // 高亮当前周
  let html = marked.parse(md);
  // 给当前周加标记
  const weekRegex = new RegExp(`(第${weekNum}周)`, 'g');
  html = html.replace(weekRegex, '<mark style="background:#dbeafe;padding:1px 4px;border-radius:3px">$1</mark>');
  container.innerHTML = html;
}

// ========== 工具函数 ==========
function getCurrentWeek() {
  // 简单计算：假设第1周从2026年2月13日开始
  const start = new Date(2026, 1, 13); // 2月13日
  const now = new Date();
  const diff = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, diff + 1);
}

function getGradeClass(grade) {
  if (grade.includes('八')) return 'grade-junior2';
  if (grade.includes('九')) return 'grade-junior3';
  if (grade.includes('高一')) return 'grade-senior1';
  return '';
}

function getBadgeClass(grade) {
  if (grade.includes('八')) return 'grade-badge-junior2';
  if (grade.includes('九')) return 'grade-badge-junior3';
  if (grade.includes('高一')) return 'grade-badge-senior1';
  return '';
}

function getGradeLabel(grade) {
  if (grade.includes('八')) return '初二';
  if (grade.includes('九')) return '初三';
  if (grade.includes('高一')) return '高一';
  return grade;
}

function getGradeColor(grade) {
  if (grade.includes('八')) return 'var(--grade-junior2)';
  if (grade.includes('九')) return 'var(--grade-junior3)';
  if (grade.includes('高一')) return 'var(--grade-senior1)';
  return '#94a3b8';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function setConnectionStatus(online) {
  const dot = document.getElementById('connection-status');
  const text = document.getElementById('connection-text');
  if (online) {
    dot.className = 'status-dot online';
    text.textContent = '已连接';
  } else {
    dot.className = 'status-dot offline';
    text.textContent = '连接失败';
  }
}

function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', async () => {
  // 导航事件
  document.querySelectorAll('.nav-menu li').forEach(li => {
    li.addEventListener('click', () => navigateTo(li.dataset.page));
  });

  // 移动端菜单
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').style.display =
      document.getElementById('sidebar').classList.contains('open') ? 'block' : 'none';
  });

  document.getElementById('overlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').style.display = 'none';
  });

  // 年级筛选
  document.getElementById('grade-filter').addEventListener('change', (e) => {
    renderStudents(e.target.value);
  });

  // 模态框关闭
  document.querySelector('.modal-close').addEventListener('click', () => {
    document.getElementById('student-detail').style.display = 'none';
  });

  // Token 设置
  document.getElementById('save-token').addEventListener('click', saveToken);
  document.getElementById('refresh-data').addEventListener('click', async () => {
    await loadAllData();
    navigateTo(state.currentPage);
  });

  // 已保存的 token 回填
  const savedToken = localStorage.getItem('github_token');
  if (savedToken) {
    document.getElementById('token-input').value = savedToken;
  }

  // 加载数据
  const ok = await loadAllData();
  if (ok) {
    navigateTo('schedule');
  } else {
    navigateTo('settings');
    document.getElementById('token-status').className = 'settings-status error';
    document.getElementById('token-status').textContent = '数据加载失败，请检查 Token 配置';
  }
});

async function saveToken() {
  const token = document.getElementById('token-input').value.trim();
  const statusEl = document.getElementById('token-status');

  if (!token) {
    localStorage.removeItem('github_token');
    statusEl.className = 'settings-status';
    statusEl.textContent = 'Token 已清除';
    return;
  }

  statusEl.className = 'settings-status';
  statusEl.textContent = '验证中...';

  try {
    localStorage.setItem('github_token', token);
    await loadAllData();
    statusEl.className = 'settings-status success';
    statusEl.textContent = 'Token 验证成功，数据已加载';
    setConnectionStatus(true);
  } catch (e) {
    localStorage.removeItem('github_token');
    statusEl.className = 'settings-status error';
    statusEl.textContent = `验证失败: ${e.message}`;
    setConnectionStatus(false);
  }
}
