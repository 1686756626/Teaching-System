---
name: batch_materials_ops
description: 批量操作教学材料文件。覆盖周次重命名、校历日期修正、目录结构校准、学生材料同步。含安全检查（dry-run）和验证步骤。当需要批量改文件名/目录名/日期时触发。
metadata: { "builtin_skill_version": "1.0", "copaw": { "emoji": "📦" } }
---

# batch_materials_ops — 批量材料操作技能

> 对 Teaching-Materials 仓库的文件和目录做批量操作：重命名、日期修正、结构校准。

## 触发条件

- 学期初校准（周次、日期、目录名）
- 发现目录名或文件名有系统性错误需要批量修正
- 需要同步学生材料（一对二共用）
- 用户说"批量改"、"重命名"、"修正周次"

## ⚠️ 红线

- **所有批量操作前必须 dry-run** — 先列出将受影响的文件，给用户确认后再执行
- **改完后必须验证 Dashboard 显示** — 打开浏览器确认数据正确
- **保留 git 历史** — 用 `git mv` 不用 `rm + add`
- **一次只做一种操作** — 不要同时改周次 + 改日期 + 改结构
- **Teaching-Materials 分支是 `master`**（不是 main）

## 场景 A：周次批量重命名

> 适用于：发现目录名 W08 实际应为 W10，需要全部修正。

### Step 1：Dry-run（列出影响范围）

```python
#!/usr/bin/env python3
"""Dry-run: show what would be renamed"""
import json, subprocess

TOKEN = "${GITHUB_TOKEN}"
OWNER = "1686756626"

# 获取完整 tree
url = f"https://api.github.com/repos/{OWNER}/Teaching-Materials/git/trees/master?recursive=1"
r = subprocess.run(["curl", "-s", "-H", f"Authorization: token {TOKEN}", url], 
                   capture_output=True, text=True)
tree = json.loads(r.stdout).get("tree", [])

OLD = "W08"
NEW = "W10"
affected = [item for item in tree if OLD in item["path"]]

dirs = [i for i in affected if i["type"] == "tree"]
files = [i for i in affected if i["type"] == "blob"]

print(f"将重命名 {OLD} → {NEW}")
print(f"  目录: {len(dirs)} 个")
print(f"  文件: {len(files)} 个")
print()
for d in dirs:
    print(f"  📁 {d['path']}")
for f in files[:10]:
    print(f"  📄 {f['path']}")
if len(files) > 10:
    print(f"  ... 还有 {len(files) - 10} 个文件")
```

### Step 2：执行重命名

```bash
# 克隆仓库
cd /tmp && rm -rf Teaching-Materials
git clone https://${GITHUB_TOKEN}@github.com/1686756626/Teaching-Materials.git
cd Teaching-Materials

# 批量 git mv（目录）
find . -type d -name "W08" | while read dir; do
    newdir=$(echo "$dir" | sed 's/W08/W10/g')
    mkdir -p "$(dirname "$newdir")"
    git mv "$dir" "$newdir"
done

# 批量 git mv（文件名含 W08 的）
find . -name "*W08*" -type f | while read file; do
    newfile=$(echo "$file" | sed 's/W08/W10/g')
    mkdir -p "$(dirname "$newfile")"
    git mv "$file" "$newfile"
done

# 确认
git status

# 提交推送
git add -A
git commit -m "fix: batch rename W08→W10"
git push origin master
```

### Step 3：验证

```
1. Dashboard 作业页 → 检查周次显示
2. 学生详情页 → 检查文件列表
3. http://131.143.251.21/test-utils.html → 跑测试
```

## 场景 B：校历日期修正

> 适用于：进度文件里的日期对不上实际校历。

### Step 1：确认正确的日期

```
1. 读 Teaching-Calendar/校历总览.md
2. 确认每周的起止日期
3. 列出需要修正的进度文件
```

### Step 2：批量修正

```python
#!/usr/bin/env python3
"""Fix dates in calendar progress files"""
import re, os

CALENDAR_DIR = "/tmp/Teaching-Calendar/src"

# 日期映射（示例：错误日期 → 正确日期）
DATE_FIXES = {
    "3月3日": "3月3日",  # 不变
    "3月10日": "3月10日",
    # ... 实际映射
}

fixed = 0
for root, dirs, files in os.walk(CALENDAR_DIR):
    for fname in files:
        if not fname.endswith(".md"):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
        
        new_content = content
        for old, new in DATE_FIXES.items():
            if old != new:
                new_content = new_content.replace(old, new)
        
        if new_content != content:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(new_content)
            fixed += 1
            print(f"  Fixed: {fpath}")

print(f"\n总计修正 {fixed} 个文件")
```

### Step 3：提交 + 验证

```bash
cd /tmp/Teaching-Calendar
git add -A
git commit -m "fix: 校正教学进度日期 2025-2026学年"
git push origin main
```

## 场景 C：一对二学生材料同步

> 适用于：刘晟廷+汪驿渃、张翰中+曾梓瑞 等一对二共用材料。

### 规则

- 一对二学生共用一份材料（学生版 + 教师版）
- 材料放在主学生目录（如张翰中/），然后 cp 到从学生目录（如曾梓瑞/）
- **学生版和教师版都要复制**

### 操作

```bash
cd /tmp/Teaching-Materials

# 同步一对二的周次材料
SRC="张翰中"
DST="曾梓瑞"
WEEK="W10"

# 复制学生版
cp -r "$SRC/学生/$WEEK/"* "$DST/学生/$WEEK/"
# 复制教师版
cp -r "$SRC/教师/$WEEK/"* "$DST/教师/$WEEK/"

git add -A
git commit -m "sync: $WEEK 材料 $SRC → $DST"
git push origin master
```

### 当前一对二分组

| 组 | 学生 | 材料放谁目录 |
|----|------|------------|
| 1 | 刘晟廷 + 汪驿渃 | 刘晟廷 |
| 2 | 张翰中 + 曾梓瑞 | 张翰中 |

## 场景 D：目录结构校准

> 适用于：检查并修正 Materials 仓库的目录结构。

### 两种目录结构

```
# 个人目录（旧结构，初中学生）
张翰中/学生/W10/01-语文-xxx.md
张翰中/教师/W10/01-语文-xxx.md

# 年级目录（新结构，高一学生）
高一/作业/W10/周一-语文.md
九年级/周末/W10-讲义.md
```

### students-map.json 映射

```json
{
  "张翰中": { "type": "personal", "path": "张翰中" },
  "黄义朗": { "type": "grade", "path": "高一" }
}
```

### 校准检查

```bash
# 1. 拉取 Materials tree
# 2. 对每个学生检查目录是否存在
# 3. 对每个年级检查作业目录是否完整
```

## 安全检查清单

操作前逐条确认：

- [ ] 已 dry-run，列出了所有受影响文件
- [ ] 用户已确认范围
- [ ] Git 仓库已克隆到 /tmp
- [ ] 不在服务器 /var/www/ 上直接操作材料文件
- [ ] 操作完成后跑 test-utils.html 验证
- [ ] 操作完成后检查 Dashboard 显示

## 常见坑

| 坑 | 解决方案 |
|----|---------|
| `git mv` 目录时目标已存在 | 先 `mkdir -p` 确保父目录存在 |
| 中文文件名 push 后变 0 字节 | 用 `git clone + commit + push`，不用 Contents API |
| `find` 匹配到 `.git` 目录 | 加 `-not -path '*/.git/*'` |
| 批量操作后 Dashboard 缓存旧数据 | 清除浏览器缓存或等 15 分钟 |
| Materials 仓库分支是 master | 不是 main！push 时必须 `git push origin master` |
