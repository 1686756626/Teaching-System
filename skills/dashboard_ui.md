---
name: dashboard_ui
description: Dashboard 页面 UI 改造技能。含 Python 补丁脚本模板（安全替换 JS 模板字符串）、可复用组件模式库、teal 配色体系、改造标准流程。适用于 pages/*.js 渲染函数和 index.html CSS 样式的任何 UI 改动。
metadata: { "builtin_skill_version": "2.0", "copaw": { "emoji": "🎨" } }
---

# dashboard_ui — Dashboard UI 改造技能

> 改 Dashboard 任何页面的 UI 时用。核心解决两个问题：**怎么安全替换含模板字符串的 JS**（Python 补丁）和**用什么组件/配色**（模式库）。

## 触发条件

- 改 pages/*.js 渲染函数的 UI
- 改 index.html 的 CSS 样式
- 新增页面或重做页面布局
- 用户说"美化"、"优化 UI"、"重做 XX 页面"

## ⚠️ 前置：先读 deploy_dashboard

UI 改动是 deploy_dashboard 流程的子集。部署流程（备份→语法检查→部署→验证→推送）全看 `deploy_dashboard/SKILL.md`。本技能只讲 **设计和编码** 环节。

## 架构：pages/*.js 模块化

代码已拆分为 9 个页面模块，每个文件用 `Object.assign(app, {...})` 扩展 app 对象：

```
app.js (347行) — 核心：init / loadData / route / darkMode
├── pages/dashboard.js  — renderDashboard, _renderStudentCard, _renderHomeworkBoard, ...
├── pages/student.js    — renderStudent, _loadAndRenderProfile, _renderWeekSection, _renderFileRow
├── pages/calendar.js   — renderCalendar, _renderWeekOverview, _subjectBtnClass, ...
├── pages/homework.js   — renderHomework
├── pages/download.js   — renderDownload, _renderDownloadItem
├── pages/workflow.js   — renderWorkflow, _loadMaterialStatus
├── pages/preview.js    — showPreview, exportPDF, exportFileAsPDF, previewFile
├── pages/search.js     — filterBySubject, openSearch, closeSearch, handleSearch
└── pages/batch.js      — batchDownload, batchDownloadAll, batchDownloadWeekHomework
```

**定位函数**：`grep -n "renderWorkflow" /var/www/teaching/pages/workflow.js`

---

## 一、核心问题：怎么替换 JS 模板字符串

### 问题

`edit_file` 无法替换含反引号（`` ` ``）和 `${}` 的 JS 模板字符串。每次改渲染函数都会遇到。

### 解决方案：Python 补丁脚本

**标准模板（直接复制改）：**

```python
#!/usr/bin/env python3
"""Patch a render function in pages/*.js."""
import re

TARGET_FILE = '/var/www/teaching/pages/workflow.js'

with open(TARGET_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 正则定位函数开头
start_match = re.search(r'(    renderWorkflow\(el\) \{)', content)
if not start_match:
    print("ERROR: Cannot find function start"); exit(1)
start_pos = start_match.start()

# 2. 花括号计数找函数结尾
brace_count = 0
in_function = False
end_pos = None
for i in range(start_pos, len(content)):
    ch = content[i]
    if ch == '{':
        brace_count += 1; in_function = True
    elif ch == '}':
        brace_count -= 1
        if in_function and brace_count == 0:
            rest = content[i+1:]
            m = re.match(r',\s*\n', rest)
            end_pos = i + 1 + (m.end() if m else 0)
            break
if end_pos is None:
    print("ERROR: Cannot find function end"); exit(1)

old_code = content[start_pos:end_pos]
print(f"Found function: chars {start_pos}-{end_pos}, length={len(old_code)}")

# 3. 用 chr() 避免和 Python f-string 冲突
BT = chr(96)   # 反引号
DS = chr(36)   # 美元符号

new_code = f'''    renderWorkflow(el) {{{{
        const x = {DS}{{someVar}};
        el.innerHTML = {BT}
            <div>{DS}{{days.map(...)}}</div>
        {BT};
    }},                                      # 函数结尾的 },
'''

# 4. 替换
new_content = content[:start_pos] + new_code + content[end_pos:]

# 5. 验证括号平衡
final_open = new_content.count('{')
final_close = new_content.count('}')
print(f"Final file braces: open={final_open}, close={final_close}, diff={final_open - final_close}")

with open(TARGET_FILE, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"SUCCESS: Patched ({len(old_code)} -> {len(new_code)} chars)")
```

### 什么时候不用 Python

如果改的是 **不含模板字符串** 的代码（比如纯逻辑、CSS class 名替换、数据定义），直接 `edit_file` 就行，更快。

### 关键技巧速查

| 场景 | 技巧 |
|------|------|
| JS 反引号 | `chr(96)` 或 `BT` 变量 |
| JS `${var}` | `chr(36)` + `{{var}}`，如 `{DS}{{someVar}}` |
| Python f-string 中的 `{` | 双花括号 `{{` |
| JS 对象字面量 `{ key: val }` | `{{{{ key: val }}}}` （4个花括号） |
| JS 数组 `.map(() => {})` | `.map(() => {{{{ ... }}}})` |
| 函数结尾 `},` | `}},` |
| 正则定位 | `r'(    renderWorkflow\(el\) \{)'` |
| 只改函数内部某段 | 不用整个函数替换，用 `content[start:end]` 切更小的块 |
| shell heredoc + Python | **禁止**，用 `write_file` 写 .py → `python3 script.py` |

---

## 二、可复用组件模式库

### 2.1 图标方块标题

```html
<!-- 页面标题（大号 w-9） -->
<h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
    <span class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white text-sm">
        <i class="fa-solid fa-calendar-days"></i>
    </span>
    页面标题
</h1>
```

### 2.2 Hero 色块卡片

```html
<div class="hero-metric hero-metric-teal">
    <div class="hero-metric-val text-2xl font-bold">15</div>
    <div class="hero-metric-lbl text-xs text-gray-500 mt-1">学生</div>
</div>
```

可选颜色：`.hero-metric-teal` / `.hero-metric-violet` / `.hero-metric-amber`

### 2.3 科目色块标签

```html
<span class="tag tag-语文">语文</span>
<span class="tag tag-道法">道法</span>
<span class="tag tag-历史">历史</span>
```

### 2.4 左侧色条行

```html
<div style="border-left:2px solid #d97706;padding:6px 10px">
    内容
</div>
```

### 2.5 "今天"高亮卡片

```html
<div class="rounded-xl border p-4 ring-2 ring-teal-300 ring-offset-1"
     style="background:linear-gradient(135deg,#f0fdfa,#ccfbf1);border-left:3px solid #0d9488">
</div>
```

### 2.6 文件行操作按钮

```html
<!-- PDF 导出 + 预览 + 下载 三按钮 -->
<div class="flex items-center gap-1 shrink-0">
    <button onclick="app.exportFileAsPDF('path', 'name.md')" class="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition" title="导出 PDF">
        <i class="fa-solid fa-file-pdf text-sm"></i>
    </button>
    <button onclick="app.showPreview('path')" class="p-2 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition" title="预览">
        <i class="fa-regular fa-eye text-sm"></i>
    </button>
    <a href="url" download="name" class="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition" title="下载">
        <i class="fa-solid fa-download text-sm"></i>
    </a>
</div>
```

---

## 三、配色体系

### 3.1 主色：Teal

| 用途 | 色值 | 说明 |
|------|------|------|
| CSS `--primary` | `#0d9488` | teal-600 |
| CSS `--primary-light` | `#14b8a6` | teal-500 |
| CSS `--primary-dark` | `#0f766e` | teal-700 |
| CSS `--primary-50` | `#f0fdfa` | teal-50 |

### 3.2 任务类型色（工作流页面）

| 类型 | 色条 | 背景 | 图标 |
|------|------|------|------|
| 通话 call | `#059669` | `#f0fdf4` | `fa-phone` |
| 线下课 teach | `#dc2626` | `#fef2f2` | `fa-chalkboard-user` |
| 备课 prep | `#d97706` | `#fffbeb` | `fa-pen-to-square` |
| 自由 free | `#ec4899` | `#fdf2f8` | `fa-heart` |
| 睡眠 sleep | `#6366f1` | `#eef2ff` | `fa-moon` |

### 3.3 时段色

| 时段 | 背景 | 文字 | 边框 |
|------|------|------|------|
| 早上 7-8:30 | `#f0fdfa` | `#0f766e` | `#99f6e4` |
| 下午 12-17 | `#fffbeb` | `#92400e` | `#fde68a` |
| 晚上 19-21 | `#eef2ff` | `#4338ca` | `#c7d2fe` |
| 睡前 | `#f5f3ff` | `#6d28d9` | `#ddd6fe` |

---

## 四、改造标准流程

### Step 1：截图现状

```
1. browser_use open → 目标页面
2. screenshot 保存 before 截图
3. snapshot 读取结构
```

### Step 2：定位代码

```
1. 确定目标函数在哪个 pages/*.js 里（见上方架构图）
2. grep -n "函数名" /var/www/teaching/pages/xxx.js
3. 读代码，列改动点（3-5 个一次搞定）
```

**判断编辑方式**：
- CSS / class 名 → `edit_file`
- `el.innerHTML = \`...\`` 模板 → **Python 补丁**
- 纯 JS 逻辑（if/for/变量） → `edit_file`

### Step 3：备份 + 编码

```bash
cp /var/www/teaching/pages/xxx.js /var/www/teaching/pages/xxx.js.bak.$(date +%Y%m%d_%H%M%S)
```

- CSS → 加在 index.html `<style>` 块中
- JS 渲染模板 → Python 补丁脚本
- 工具函数 → `edit_file`

### Step 4：语法检查 + 验证

```bash
node --check /var/www/teaching/pages/xxx.js
```

然后按 `deploy_dashboard` 的 Step 4-6 继续。

---

## 五、CSS 样式分区速查（index.html）

| 区域 | 内容 |
|------|------|
| CSS 变量 | `--primary` / `--shadow-*` |
| 导航栏 | `.nav-link` |
| Hero 区 | `.dashboard-hero` / `.hero-metric*` |
| 科目标签 | `.tag` / `.tag-语文/道法/历史` |
| PDF 导出样式 | `.pdf-export-container` |
| 打印模式 | `@media print` |
| 移动端 | `@media (max-width: 640px)` |

---

## 六、常见坑

| 坑 | 解决方案 |
|----|---------|
| edit_file 替换含 `${}` 的文本失败 | 用 Python 补丁 + `chr(36)` |
| 替换后 JS 语法错误 | `node --check` 必过，检查括号平衡 |
| 浏览器加载旧版本 | URL 加 `?v=新版本号` |
| sed 处理中文出错 | 用 Python 脚本代替 sed |
| shell heredoc 里写 Python | **禁止**，用 `write_file` 写 .py 再执行 |
| edit_file 对含中文的 JS 失败 | 中文显示为 `M-xxx`，匹配会错位 → 用 Python |
| html2canvas 截空白 | 不要用 `left:-9999px` offscreen，用 iframe 隔离渲染 |
