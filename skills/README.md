# 项目专属技能索引

> 任意智能体接管本系统时，先读本文件了解可用技能，再按需阅读具体 .md。

## 技能清单

| 文件 | 技能名 | 用途 | 触发词 |
|------|--------|------|--------|
| teaching_prep.md | 备课出题 | 生成周中作业、周末讲义、一对一材料 | "备课"、"出题"、"生成材料" |
| deploy_dashboard.md | Dashboard 部署 | 修改代码后一键部署到服务器 | "部署"、"推送"、"上线" |
| dashboard_ui.md | Dashboard UI | 页面改版、样式调整、组件复用 | "美化"、"改 UI" |
| teaching_system_maint.md | 系统维护 | 排查问题、更新日历、管理学生 | "网站有问题"、"更新日历" |
| system_audit.md | 系统诊断 | 全面健康检查、屎山诊断 | "检查系统"、"诊断" |
| batch_materials_ops.md | 批量操作 | 周次重命名、日期修正、材料同步 | "批量改"、"重命名" |
| push_github.md | GitHub 推送 | 推送文件到 5 个仓库 | "推到 GitHub" |

## 快速接管指南

1. 先读 `AGENTS.md`（项目全貌 + 红线清单）
2. 再读本文件（技能索引）
3. 按需读具体技能文件
4. 跑 `http://131.143.251.21/test-utils.html` 确认系统正常

## 关键约束

- Teaching-Materials 分支是 `master`（不是 main）
- 学生档案含中文文件名，禁止用 Contents API 推送
- Dashboard 是纯 nginx 静态托管，不用 git 部署
- 每次部署必须 bump `?v=` 缓存版本号
