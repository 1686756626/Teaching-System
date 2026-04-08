---
name: push_github
description: 将文件推送到 GitHub 仓库。支持 Contents API（大文件用 Python 脚本）和 git clone 方式（含中文文件名）。覆盖5个教学仓库的推送场景，含分支和方式速查表。
metadata: { "builtin_skill_version": "1.0", "copaw": { "emoji": "📤" } }
---

# push_github — GitHub 文件推送技能

> 当需要把修改后的文件推送到 GitHub 仓库时使用。**尤其适用于大文件（curl 参数会爆）和含中文路径的文件。**

## 触发条件

- 修改了 Dashboard / System / Calendar / Profiles 仓库的文件，需要推送
- `curl -X PUT` 报 `Argument list too long`（文件 > ~40KB）
- 需要批量推送多个文件到同一个仓库

## ⚠️ 红线

- **Teaching-Materials 仓库用 `master` 分支**（不是 main）
- **Student-Profiles 含中文文件名 → 禁止用 Contents API 推送**，必须 `git clone + commit + push`
- **推送前先 GET 当前 sha**（Contents API 要求带上文件 sha 才能 PUT）
- **推送大文件用 Python 脚本**，不要用 curl 内联 base64

## 单文件推送（Contents API）

适用于：Dashboard（app.js/utils.js/index.html/config.js）、Calendar（schedule.json）、System（AGENTS.md）

```python
#!/usr/bin/env python3
import json, base64, urllib.request

TOKEN = "${GITHUB_TOKEN}"

def push_file(repo, filepath, local_path, message, branch="main"):
    """推送单个文件到 GitHub"""
    url = f"https://api.github.com/repos/{repo}/contents/{filepath}"
    headers = {"Authorization": f"token {TOKEN}"}

    # 1. GET 当前 sha
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        sha = json.loads(resp.read())["sha"]

    # 2. 读取并编码
    with open(local_path, "rb") as f:
        content = base64.b64encode(f.read()).decode()

    # 3. PUT 推送
    data = json.dumps({
        "message": message,
        "content": content,
        "sha": sha,
        "branch": branch
    }).encode()

    req = urllib.request.Request(url, data=data, method="PUT", headers={
        **headers, "Content-Type": "application/json"
    })
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
        print(f"✅ {filepath}: {result['content']['size']} bytes, commit {result['commit']['sha'][:7]}")

# 用法示例
# push_file("1686756626/Teaching-Dashboard", "app.js", "/var/www/teaching/app.js", "fix: xxx")
# push_file("1686756626/Teaching-Materials", "备课规范.md", "/tmp/备课规范.md", "update: xxx", branch="master")
```

## 批量推送（多个文件 → 同一仓库）

直接调用上面的 `push_file()` 多次：

```python
files = [
    ("app.js", "/var/www/teaching/app.js", "fix: 修复描述"),
    ("index.html", "/var/www/teaching/index.html", "chore: 缓存版本号"),
]
for repo_path, local, msg in files:
    push_file("1686756626/Teaching-Dashboard", repo_path, local, msg)
```

## Git 方式推送（含中文文件名）

适用于：Student-Profiles（档案 .md）、Teaching-Materials（备课 .md）、Teaching-Calendar（教学进度 .md）

```bash
# 克隆（如已克隆则 git pull）
cd /tmp && git clone https://${GITHUB_TOKEN}@github.com/1686756626/REPO.git
cd REPO && git pull origin BRANCH

# 编辑文件...

# 提交推送
git add -A
git commit -m "描述改动"
git push origin BRANCH    # Materials 用 master，其他用 main
```

## 仓库速查

| 仓库 | 分支 | 推送方式 |
|------|------|----------|
| Teaching-System | main | Contents API 或 git |
| Student-Profiles | main | **必须 git**（中文文件名） |
| Teaching-Calendar | main | Contents API 或 git |
| Teaching-Materials | **master** | **必须 git**（中文文件名） |
| Teaching-Dashboard | main | Contents API（app.js 等大文件用 Python） |

## 常见坑

1. **`Argument list too long`** → 文件太大，shell 参数放不下 → 用 Python 脚本
2. **推送后文件变 0 bytes** → 用了 Contents API 推中文文件 → 改用 git 方式
3. **`409 Conflict` / sha 不匹配** → 文件被别人改了 → 先 GET 最新 sha 再 PUT
4. **`git push` 报 rejected** → 远程有新提交 → 先 `git pull --rebase` 再 push
