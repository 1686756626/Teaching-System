---
name: deploy_dashboard
description: 修改 Dashboard 前端代码后一键完成：备份 → 语法检查 → 部署 → 浏览器验证 → 推送 GitHub。适用于 app.js / pages/*.js / utils.js / index.html / config.js / lib/ 的任何修改。
metadata: { "builtin_skill_version": "2.0", "copaw": { "emoji": "🚀" } }
---

# deploy_dashboard — Dashboard 部署完整闭环技能

> 修改 Dashboard 前端代码后，一键完成：备份 → 语法检查 → 部署 → 验证 → 推送 GitHub。

## 触发条件

- 修改了 `/var/www/teaching/` 下的任何前端文件
- 用户说"部署"、"推送"、"上线"、"发布"
- Dashboard 功能开发/修复完成后

## 当前文件结构

```
/var/www/teaching/
├── index.html          (516行) — 入口 HTML、Tailwind 配置、CSS 样式、脚本引用
├── config.js           (94行)  — CONFIG 对象、学期配置、Cache/API 工具
├── utils.js            (248行) — parseMaterialsTree、extractAuthor 等纯函数
├── app.js              (348行) — App 核心对象：init / loadData / route / darkMode
├── pages/
│   ├── dashboard.js    (600行) — 仪表盘首页
│   ├── student.js      (276行) — 学生详情页
│   ├── calendar.js     (346行) — 教学日历
│   ├── homework.js     (134行) — 作业管理
│   ├── download.js     (88行)  — 下载中心
│   ├── workflow.js     (235行) — 每周工作流
│   ├── preview.js      (216行) — 文件预览 + PDF 导出
│   ├── search.js       (168行) — 全局搜索
│   └── batch.js        (76行)  — 批量下载
├── schedule.json               — 课表/工作流配置（同步自 Teaching-Materials）
├── students-map.json           — 学生→目录映射（同步自 Teaching-Materials）
├── test-utils.html             — 74条单元测试
├── lib/
│   ├── tailwind.js             — Tailwind CSS
│   ├── marked.min.js           — Markdown 解析
│   ├── jszip.min.js            — ZIP 打包
│   ├── html2pdf.min.js         — PDF 生成
│   └── font-awesome/           — 图标
└── nginx_teaching.conf         — Nginx 配置备份
```

**加载顺序**（index.html 底部）：
```
config.js → utils.js → app.js → pages/*.js（9个）
```

**模块扩展方式**：每个 `pages/*.js` 用 `Object.assign(app, { ... })` 扩展 app 对象。

## 完整流程（6 步）

### Step 1：备份

```bash
BACKUP_TAG=$(date +%Y%m%d_%H%M%S)

# 只备份要改的文件
cp /var/www/teaching/app.js /var/www/teaching/app.js.bak.${BACKUP_TAG}
# pages 模块同理：
# cp /var/www/teaching/pages/dashboard.js /var/www/teaching/pages/dashboard.js.bak.${BACKUP_TAG}
```

### Step 2：编辑

直接用 `edit_file` 编辑 `/var/www/teaching/` 下的文件。

**注意**：pages/*.js 里的 `render*` 函数包含大量模板字符串（反引号 + `${}`），如果 `edit_file` 匹配失败，改用 Python 补丁脚本（见 `dashboard_ui/SKILL.md`）。

### Step 3：语法检查

```bash
# 检查所有 JS 文件（不只是改的那个）
for f in /var/www/teaching/app.js /var/www/teaching/config.js /var/www/teaching/utils.js /var/www/teaching/pages/*.js; do
    echo -n "$(basename $f): "
    node --check "$f" 2>&1 && echo "OK"
done
```

**必须全部通过才能继续。**

### Step 4：Bump 缓存版本号

```bash
# 格式：v=YYYYMMDD{字母}，字母递增 a→b→c...→z→aa
# 查看当前版本号：
grep 'v=2026' /var/www/teaching/index.html | head -1

# 替换为新版本号：
sed -i 's/v=旧版本号/v=新版本号/g' /var/www/teaching/index.html
```

**每次部署必须 bump！** 否则用户浏览器加载旧版本。

### Step 5：浏览器验证

```
1. browser_use open → http://131.143.251.21/index.html?v={新版本号}#{目标页面}
2. wait_for 关键文本（确认页面加载）
3. console_messages level=error → 必须零错误
4. evaluate 检查功能是否正常
5. screenshot 发给用户确认
```

**⚠️ 浏览器缓存陷阱**：必须在 URL 带版本号参数强制刷新。

### Step 6：推送到 GitHub

使用 Python 脚本（大文件/批量文件必须用 Python）：

```python
import requests, base64

token = "${GITHUB_TOKEN}"
repo = "1686756626/Teaching-Dashboard"
headers = {"Authorization": "token " + token, "Accept": "application/vnd.github.v3+json"}
api = "https://api.github.com/repos/" + repo + "/contents"

def push(path, local_path, msg, branch="main"):
    url = api + "/" + path
    r = requests.get(url, headers=headers, params={"branch": branch})
    sha = r.json().get("sha") if r.status_code == 200 else None
    with open(local_path, "rb") as f:
        content = base64.b64encode(f.read()).decode()
    data = {"message": msg, "content": content, "branch": branch}
    if sha: data["sha"] = sha
    r = requests.put(url, headers=headers, json=data)
    print("  " + path + ": " + str(r.status_code))

# 示例
push("pages/dashboard.js", "/var/www/teaching/pages/dashboard.js", "fix: 描述")
push("index.html", "/var/www/teaching/index.html", "chore: bump v=xxx")
```

> ⚠️ 不要用 curl 推大文件（>40KB），会 `Argument list too long`。

## 页面路由速查

| hash | 页面模块 | 主渲染函数 |
|------|---------|-----------|
| `#dashboard` | dashboard.js | `renderDashboard` |
| `#student/{name}` | student.js | `renderStudent` |
| `#calendar` | calendar.js | `renderCalendar` |
| `#homework` | homework.js | `renderHomework` |
| `#download` | download.js | `renderDownload` |
| `#workflow` | workflow.js | `renderWorkflow` |

## 红线（部署前检查）

- [ ] `node --check` 全部通过
- [ ] 版本号已 bump
- [ ] 不改 `parseMaterialsTree()` 的路径解析逻辑（`parts.length`）
- [ ] Materials 分支保持 `master`
- [ ] Nginx 不开 gzip
- [ ] `<script src>` 不用 CDN（全走 `lib/` 目录）
- [ ] 不删 `lib/` 目录下任何文件
- [ ] 不改 nginx 的 `/gh-api/` 和 `/gh-raw/` 代理配置

## 回滚

```bash
# 查看最新备份
ls -t /var/www/teaching/app.js.bak.* | head -1

# 恢复
cp /var/www/teaching/app.js.bak.{最新TAG} /var/www/teaching/app.js

# 版本号也要回退！
sed -i 's/v=新/v=旧/g' /var/www/teaching/index.html
```

## 清理备份

```bash
# 保留最近 2 个备份，删除更早的
ls -t /var/www/teaching/*.bak.* | tail -n +5 | xargs rm -f
```

## 服务器信息

| 项目 | 值 |
|------|-----|
| IP | 131.143.251.21 |
| Web 目录 | `/var/www/teaching/` |
| Nginx 配置 | `/etc/nginx/sites-enabled/teaching`（见 `nginx_teaching.conf`） |
| 托管方式 | 纯 nginx 静态文件，无构建步骤 |
| 数据源 | GitHub API（`/gh-api/`）+ GitHub Raw（`/gh-raw/`） |
| 缓存策略 | nginx 静态 7d + JS 内存缓存 15min + URL `?v=` 版本号 |

## 关键数据源

| 数据 | 仓库 | 分支 | 文件 |
|------|------|------|------|
| 材料目录树 | Teaching-Materials | master | `git/trees/master?recursive=1` |
| 校历 | Teaching-Calendar | main | `校历总览.md` |
| 学生档案 | Student-Profiles | main | `students.json` + `profiles/*.md` |
| 课表/工作流 | Teaching-Materials | master | `schedule.json` |
| 学生→目录映射 | Teaching-Materials | master | `students-map.json` |
