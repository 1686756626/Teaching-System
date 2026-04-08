---
name: system_audit
description: 对教学系统做全面健康检查。覆盖数据一致性、代码质量、同步状态、周次校准。含自动诊断脚本和分级评分卡。当用户问"系统有没有问题"、"检查一下"、"屎山诊断"时触发。
metadata: { "builtin_skill_version": "1.0", "copaw": { "emoji": "🔍" } }
---

# system_audit — 教学系统诊断技能

> 对整个教学系统做健康检查，找出潜在问题并分级报告。

## 触发条件

- 用户说"系统有没有问题"、"检查一下"
- 用户说"屎山诊断"、"代码审计"
- 学期初/学期中定期检查
- 大改代码后做回归确认

## 诊断流程

### Phase 1：数据层检查

```
1. 校历年份
   - 读 Teaching-Calendar/校历总览.md
   - 确认学年标注 = 当前学年（如 2025-2026）
   - 确认开学日期 vs config.js semester.start

2. 周次校准
   - 手算当前周次（从开学到今天的天数 ÷ 7 + 1）
   - compare Dashboard 显示的周次
   - compare config.js semester.start 计算结果
   - 不一致 → 🔴 P0

3. 目录结构一致性
   - 拉取 Teaching-Materials tree（GitHub API）
   - 个人目录（张翰中/学生/W10/）vs 年级目录（九年级/作业/W10/）
   - students-map.json 映射 vs 实际目录
   - 有学生没有对应目录 → 🟡 P1

4. 配置文件同步
   - schedule.json（Materials 仓库）vs Dashboard 加载的
   - students-map.json vs 实际学生列表
   - students.json vs profiles/*.md
```

### Phase 2：代码层检查

```
1. 语法
   - 对所有 JS 文件跑 node --check
   - 有失败 → 🔴 P0

2. 测试
   - 浏览器打开 http://131.143.251.21/test-utils.html
   - 检查 74 条测试是否全过
   - 有 FAILED → 🟡 P1

3. GitHub 同步
   - 对比服务器文件 vs GitHub 最新 commit 的内容
   - 用 evaluate 读取 app.currentPage 等状态
   - 不一致 → 🟡 P1

4. 浏览器控制台
   - console_messages level=error
   - 有 JS 错误 → 🟡 P1
```

### Phase 3：架构层检查

```
1. 文件大小
   - wc -l 所有 JS 文件
   - 任何单文件 > 700 行 → 🟡 P1（需要再拆分）

2. 硬编码
   - grep "张翰中\|曾梓瑞\|杨紫泠" pages/*.js
   - 有学生名硬编码 → 🟢 P2

3. 跨仓依赖
   - schedule.json 在 Materials 仓库但 Dashboard 远程读
   - 改了一处另一处不知道 → 🟡 P1

4. 缓存
   - 版本号是否最新
   - nginx 缓存配置是否合理
```

## 诊断脚本

一键运行所有检查：

```python
#!/usr/bin/env python3
"""Teaching System Health Check"""
import json, subprocess, datetime

TOKEN = "${GITHUB_TOKEN}"
OWNER = "1686756626"

def api(repo, path, branch="main"):
    url = f"https://api.github.com/repos/{OWNER}/{repo}/contents/{path}?ref={branch}"
    r = subprocess.run(["curl", "-s", "-H", f"Authorization: token {TOKEN}", url],
                       capture_output=True, text=True)
    return json.loads(r.stdout)

def check_syntax():
    """Phase 2.1: JS 语法检查"""
    import glob
    files = glob.glob("/var/www/teaching/*.js") + glob.glob("/var/www/teaching/pages/*.js")
    results = {}
    for f in files:
        r = subprocess.run(["node", "--check", f], capture_output=True, text=True)
        results[f] = "OK" if r.returncode == 0 else r.stderr.strip()
    return results

def check_calendar_year():
    """Phase 1.1: 校历年份"""
    data = api("Teaching-Calendar", "校历总览.md")
    content = __import__("base64").b64decode(data["content"]).decode("utf-8")
    current_year = datetime.datetime.now().year
    has_current = str(current_year) in content and str(current_year + 1) in content
    return {"year_in_calendar": has_current, "content_preview": content[:200]}

def check_week():
    """Phase 1.2: 周次校准"""
    # 从 config.js 读学期开始
    with open("/var/www/teaching/config.js") as f:
        config = f.read()
    import re
    m = re.search(r"start:\s*'(\d{4}-\d{2}-\d{2})'", config)
    start_str = m.group(1) if m else "unknown"
    
    start = datetime.datetime.strptime(start_str, "%Y-%m-%d")
    now = datetime.datetime.now()
    week_num = (now - start).days // 7 + 1
    return {"config_start": start_str, "calculated_week": week_num, "today": str(now.date())}

def check_file_sizes():
    """Phase 3.1: 文件大小"""
    import glob
    files = glob.glob("/var/www/teaching/*.js") + glob.glob("/var/www/teaching/pages/*.js")
    return {f.replace("/var/www/teaching/", ""): sum(1 for _ in open(f)) for f in files}

if __name__ == "__main__":
    print("=== Teaching System Health Check ===\n")
    
    print("📅 Calendar Year:")
    cal = check_calendar_year()
    print(f"  Current year referenced: {cal['year_in_calendar']}")
    
    print("\n📊 Week Calculation:")
    week = check_week()
    print(f"  Config start: {week['config_start']}")
    print(f"  Calculated week: W{week['calculated_week']}")
    
    print("\n📝 Syntax Check:")
    syntax = check_syntax()
    for f, status in syntax.items():
        tag = "✅" if status == "OK" else "❌"
        print(f"  {tag} {f}: {status}")
    
    print("\n📏 File Sizes:")
    sizes = check_file_sizes()
    for f, lines in sorted(sizes.items()):
        flag = " ⚠️" if lines > 700 else ""
        print(f"  {f}: {lines} lines{flag}")
```

## 评分卡模板

```
=== 系统健康报告 {日期} ===

🔴 P0（立即修复）：
  - [描述]

🟡 P1（近期处理）：
  - [描述]

🟢 P2（暑假处理）：
  - [描述]

✅ 正常：
  - [通过项]
```

## 已知系统性问题追踪

| 问题 | 状态 | 计划 |
|------|------|------|
| 双目录结构并存（个人/年级） | 🟡 已建 students-map.json，未集成 | 暑假统一 |
| schedule.json 跨仓依赖 | 🟡 Dashboard 远程读 Materials | 移到 Dashboard 或做 fallback |
| HTML 字符串拼接无模板引擎 | 🟢 可运行 | 暑假考虑 Vue/Lit |
| 无构建工具 | 🟢 多 script 标签加载 | 暑假考虑 Vite |
| 配置散落多处 | 🟢 schedule + students-map + config | 暑假集中化 |

## 历史教训（每次诊断必看）

1. **校历年份每学期初必须核查** — 曾因年份错误导致周次偏移 2 周
2. **Markdown 解析要 strip `**` 标记** — 表格 key lookup 会失败
3. **async 数据加载后必须触发重渲染** — loadCalendar 后要 `.then(() => route())`
4. **parseInt('W08') = NaN** — 必须先 strip W 前缀
5. **html2canvas 不能截 offscreen 元素** — 用 iframe 隔离
6. **config fallback 日期可能过期** — 校历加载前用的是旧值
