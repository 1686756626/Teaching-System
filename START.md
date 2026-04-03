# 🚀 快速上手 — 教学备课系统完整指南

> **你是这个系统的 AI 助手。读完这份文档后，你将了解系统全貌，并能立即上手工作。**
> 阅读时间：约 3 分钟。之后按需深入各仓库的详细文档。

---

## 这个系统是什么

一位南昌的一对一初中教培老师，需要一个 **AI 备课助手 + 可视化网站**。

- AI 负责根据教学进度，自动生成每周的备课材料（学生版学案、教师版操作手册）
- 网站负责把生成的材料展示出来，方便查看和下载

**网站地址：** http://131.143.251.21/

---

## 五个仓库

全部属于 GitHub 用户 `1686756626`，任何事都从这里开始：

### 第 1 步：了解规则 → Teaching-System

| 仓库 | https://github.com/1686756626/Teaching-System |
|------|------|
| 分支 | `main` |
| 可见性 | 公开 |
| 核心文件 | `AGENTS.md` — **系统的总规则书** |
| 里面有什么 | 备课流程 6 步、文件命名规则、学生版/教师版的格式要求、目录结构硬性约束 |
| 什么时候读 | **每次任务的第一件事** |

### 第 2 步：了解学生 → Student-Profiles

| 仓库 | https://github.com/1686756626/Student-Profiles |
|------|------|
| 分支 | `main` |
| 可见性 | **私有**（需要 GitHub Token 才能访问） |
| 核心文件 | `students.json`（学生基本信息）、`profiles/{学生名}.md`（详细档案） |
| 里面有什么 | 每个学生的姓名、年级、科目、上课时段、当前进度、薄弱点、学习风格 |
| 什么时候读 | 备课前，知道"教谁、教到哪了" |
| 读不了怎么办 | 私有仓库，如果 Token 无效，**直接让老师手动提供学生信息** |

### 第 3 步：查教学进度 → Teaching-Calendar

| 仓库 | https://github.com/1686756626/Teaching-Calendar |
|------|------|
| 分支 | `main` |
| 可见性 | 公开 |
| 核心文件 | `src/` 下的 36 个详细 `.md` 文件（**唯一数据源**） |
| 里面有什么 | 南昌市七年级到高三、语文/历史/道法/政治、上下学期的完整教学进度 |
| 详细文档 | 仓库内 `AGENTS.md` |
| 什么时候读 | 备课前，知道"这周学校教到哪了" |
| ⚠️ 注意 | JSON 里的科目名是 `道德与法治`（初中）/ `思想政治`（高中），文件名里简写 `道法`/`政治` |

### 第 4 步：生成并存放材料 → Teaching-Materials

| 仓库 | https://github.com/1686756626/Teaching-Materials |
|------|------|
| 分支 | `master`（注意不是 main） |
| 可见性 | 公开 |
| 核心文件 | `AGENTS.md`（目录规范）、`备课规范.md`（材料格式要求）、`README.md`（课表总览） |
| 里面有什么 | 每个学生每周的备课材料，按 `{学生名}/学生或教师/{周次}/` 组织 |
| 详细文档 | 仓库内 `AGENTS.md` |
| 什么时候写 | **备课完成后，把材料写入这里** |

### 第 5 步：展示和下载 → Teaching-Dashboard

| 仓库 | https://github.com/1686756626/Teaching-Dashboard |
|------|------|
| 分支 | `main` |
| 可见性 | **私有** |
| 核心文件 | `AGENTS.md`（完整交接手册）、`index.html`（页面）、`app.js`（逻辑） |
| 里面有什么 | 前端网站源码，自动从 Teaching-Materials 和 Teaching-Calendar 拉数据展示 |
| 详细文档 | 仓库内 `AGENTS.md`（含部署、代码结构、排查指南） |
| 什么时候读 | 需要修改网站时 |

---

## 一句话总结数据流

```
Student-Profiles (学生信息)
        +
Teaching-Calendar (教学进度)
        ↓
  AI 生成备课材料
        ↓
Teaching-Materials (材料存放) ←→ Teaching-Dashboard (网页展示)
```

---

## 你会被要求做的事

### 场景 A：给某个学生备课（最常见）

```
1. 读 Teaching-System/AGENTS.md（复习规则）
2. 读 Student-Profiles（了解学生）
3. 读 Teaching-Calendar/src/*.md（查进度）
4. 读 Teaching-Materials/备课规范.md（复习格式）
5. 生成材料 → 写入 Teaching-Materials
6. 更新 Teaching-Materials/README.md
7. 输出打印清单
```

### 场景 B：修改/排查网站问题

```
1. 读 Teaching-Dashboard/AGENTS.md（完整技术文档）
2. 修改 index.html 或 app.js
3. 复制到服务器 /var/www/teaching/
4. 刷新浏览器验证
```

### 场景 C：更新教学日历数据

```
1. 修改 Teaching-Calendar/src/ 下的 .md 文件
2. 提交到 GitHub
3. 网站自动拉取（15 分钟缓存或手动刷新）
```

---

## 关键约束（避免出错）

### 目录结构（Materials 仓库，固定 4 层）

```
✅ 黄涵松/学生/08/01-语文-期中备考冲刺（学生版）.md
❌ 学生/黄涵松/08/...          ← 学生名必须在第1层
❌ 黄涵松/学生/第8周/...        ← 周次只写数字 08
❌ 黄涵松/学生/08/学生版/...      ← 不能加第4层文件夹
```

### 文件命名

```
{编号}-{科目}-{内容}（类型）.md

编号：01、02、03...（两位数）
科目：语文、道法、历史（用简称，不写"道德与法治"）
类型：（学生版）/（教师版）
```

### 科目名称对照

| 语境 | 用什么 |
|------|--------|
| Materials 文件名 | `道法` |
| Calendar src/*.md key | `道德与法治`（初中）/ `思想政治`（高中） |
| 学生对话 / 课表 | `道法` |

### 服务器

| 项目 | 值 |
|------|-----|
| IP | `131.143.251.21` |
| 网站目录 | `/var/www/teaching/` |
| Nginx 配置 | `/etc/nginx/sites-available/teaching` |
| ⚠️ 不要开 gzip | 会导致 JS 文件传输截断 |

---

## 各仓库文档速查

| 想了解... | 去哪里读 |
|-----------|----------|
| 备课流程和规则 | Teaching-System → `AGENTS.md` |
| 学生版/教师版怎么写 | Teaching-Materials → `备课规范.md` |
| 材料目录结构规范 | Teaching-Materials → `AGENTS.md` |
| 日历数据结构 | Teaching-Calendar → `AGENTS.md` |
| 网站技术细节和部署 | Teaching-Dashboard → `AGENTS.md` |
| 学生信息 | Student-Profiles → `students.json` + `profiles/` |

### ⚠️ 如果要修改网站代码

**必须先读 Teaching-Dashboard → `CHANGELOG.md`**，里面有踩坑记录和不可改动清单，不看直接改会出 bug。

### 🚨 红线规则（绝对不可违反）

| 禁止事项 | 原因 |
|----------|------|
| 不要改 `parseMaterialsTree()` 中 `parts.length === 4` | 改了学生数据全丢 |
| 不要改 `CONFIG.materials.branch`（必须是 `master`） | 其他仓库都是 main，只有它是 master |
| 不要在 nginx 配置中加 `gzip on` | 会截断 JS 文件，网站白屏 |
| 不要把 `<script src>` 改回 CDN 地址 | 国内用户加载不了 |
| 不要删除或重命名 `lib/` 目录下的任何文件 | 页面样式和功能全部依赖它们 |
| 不要修改 nginx 的 `/gh-api/` 和 `/gh-raw/` 代理配置 | 改了数据拉取就断了 |

### 🔄 出问题了？一键回滚

无论 agent 改出了什么问题，在服务器上执行一条命令即可恢复：

```bash
bash /var/www/teaching/rollback.sh
```

回滚会恢复：静态文件 + Nginx 配置，并自动验证网站是否正常。
回滚源：Git tag `v1.0-stable`（Teaching-Dashboard 仓库）+ 服务器 .bak 备份。

---

> **建议：收藏本文件。无论接到什么任务，先回来这里确认应该读哪个仓库的哪份文档。**
