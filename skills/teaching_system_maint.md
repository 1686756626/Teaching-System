---
name: teaching_system_maint
description: 教学系统排查和维护技能。覆盖 Dashboard 问题排查、教学日历更新、学生信息管理、数据一致性检查。包含红线清单和回滚方案。
metadata: { "builtin_skill_version": "2.0", "copaw": { "emoji": "🔧" } }
---

# teaching_system_maint — 系统维护技能

> Dashboard 排查、教学日历更新、学生信息管理、数据一致性检查。

## 触发条件

- 用户提到网站问题、页面打不开、显示异常
- 用户要求更新教学日历数据
- 用户要求查看/更新学生信息
- 用户问"系统有没有问题"、"检查一下"

## 五仓库结构

| 仓库 | 分支 | 主要内容 |
|------|------|---------|
| Teaching-System | main | AGENTS.md（总文档） |
| Teaching-Materials | **master** | 学生材料、schedule.json、students-map.json |
| Teaching-Calendar | main | 校历总览.md、src/（进度文件） |
| Student-Profiles | main | students.json、profiles/*.md |
| Teaching-Dashboard | main | 前端代码（app.js + pages/*.js） |

## 场景 A：Dashboard 问题排查

### 排查步骤

```
1. 浏览器打开页面，console_messages 看错误
2. 确认数据源是否正常：
   - evaluate → app.data 是否加载
   - evaluate → app.calendarData 是否存在
   - evaluate → app.scheduleData 是否存在
3. 定位问题文件（app.js / pages/*.js / config.js / utils.js）
4. 修复 → 语法检查 → 部署 → 验证（走 deploy_dashboard 技能）
```

### 常见问题速查

| 现象 | 原因 | 修复 |
|------|------|------|
| "第 NaN 周" | getCurrentWeek() 返回 NaN | 检查 config.js semester.start 和校历 |
| 周次显示错误 | 校历年份未更新 / md 中有 `**` 标记 | 更新校历 / strip markdown 标记 |
| 学生不显示 | parseMaterialsTree 路径解析失败 | 检查 Materials 目录结构 |
| 首次加载空白 | loadData 后没触发 route | 检查 app.js loadData().then() |
| 文件下载乱码 | 中文路径 curl 直接保存 | 用 Python base64 解码 |
| PDF 导出空白 | html2canvas 截 offscreen 元素 | 用 iframe 隔离渲染 |

## 场景 B：更新教学日历

### 校历年份校准（每学期初必做）

```
1. 跟老师确认实际开学日期
2. 更新 Teaching-Calendar/校历总览.md：
   - 学年标注（如 2025-2026）
   - 每学期开学日期
   - 节假日安排
3. 更新 Dashboard config.js 的 semester.start（fallback 值）
4. 验证 Dashboard 显示的周次是否正确
```

⚠️ **教训**：曾因校历还写着 2024-2025 导致整个系统周次偏移 2 周。

### 更新教学进度

```bash
# 克隆 Calendar 仓库
cd /tmp && git clone https://${GITHUB_TOKEN}@github.com/1686756626/Teaching-Calendar.git
cd Teaching-Calendar

# 编辑 src/{学段}/{年级}/{科目}/{学期}.md
# 格式：## X月 → ### 第N周 → - 内容

git add -A && git commit -m "update: 进度描述" && git push origin main
```

## 场景 C：查看/更新学生信息

```
1. 读 Student-Profiles/students.json（课表概览）
2. 读 Student-Profiles/profiles/{学生名}.md（详细档案）
3. 更新时用 git clone → 编辑 → commit → push
4. ⚠️ 禁止用 Contents API 推送（中文文件名会 0 字节）
```

## 场景 D：运行测试

```
浏览器打开 http://131.143.251.21/test-utils.html
→ 页面自动运行 74 条单元测试
→ 检查是否有 FAILED 项
```

覆盖的核心函数：
- parseMaterialsTree（材料解析）
- parseSchoolCalendarMd（校历解析）
- getCurrentWeek（周次计算）
- extractAuthor（出题人提取）
- formatSize / getSubject / getFileIcon

## 数据一致性检查清单

手动或定期执行：

```
1. 校历年份 vs 当前实际年份是否匹配
2. Dashboard 周次 vs 手算周次是否一致
3. Materials 目录名周次 vs 校历周次
4. config.js semester.start vs 校历开学日期
5. schedule.json 学生名单 vs students.json
6. students-map.json 映射 vs 实际目录结构
```

## 红线（修改前逐条检查）

- 不改 `parseMaterialsTree()` 的路径解析逻辑
- 不改 CONFIG.materials.branch（必须 master）
- 不开 gzip
- 不把 script src 改回 CDN
- 不删 lib/ 目录
- 不改 nginx 的 /gh-api/ 和 /gh-raw/ 代理

## 回滚

```bash
# 查看备份
ls -t /var/www/teaching/*.bak.* | head -5

# 恢复
cp /var/www/teaching/{文件名}.bak.{TAG} /var/www/teaching/{文件名}
```

## 服务器信息

| 项目 | 值 |
|------|-----|
| IP | 131.143.251.21 |
| Web 目录 | `/var/www/teaching/` |
| Nginx 配置 | `/etc/nginx/sites-enabled/teaching` |
| 托管方式 | nginx 静态文件 |
| GitHub Token | `${GITHUB_TOKEN}` |
| GitHub 用户 | `1686756626` |

## 读取文件模板

```bash
# GitHub API 读取（私有仓库）
curl -s -H "Authorization: token TOKEN" \
  "https://api.github.com/repos/1686756626/REPO/contents/PATH?ref=BRANCH"
```

```python
# Python 下载含中文文件（推荐）
import requests, base64
url = f"https://api.github.com/repos/1686756626/{repo}/contents/{path}?ref={branch}"
r = requests.get(url, headers={"Authorization": f"token {TOKEN}"})
content = base64.b64decode(r.json()["content"]).decode("utf-8")
with open(local_path, "w", encoding="utf-8") as f:
    f.write(content)
```
