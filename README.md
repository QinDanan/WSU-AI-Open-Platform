<div align="center">

<img src="assets/readme-cover.svg" width="100%" alt="首义 AI 设计封面">

<br>

**武昌首义学院 · AI 开放平台**

[线上网站](https://cha290196-hue.github.io/WSU-AI-Open-Platform/) · [功能目录](#功能) · [本地运行](#本地运行) · [API 网关](#api-网关) · [项目结构](#项目结构)

<br>

![Vanilla JS](https://img.shields.io/badge/JavaScript-ES2022-165BA7?style=flat-square&labelColor=0B325F)
![Static Hosting](https://img.shields.io/badge/Hosting-GitHub_Pages-165BA7?style=flat-square&labelColor=0B325F)
![License](https://img.shields.io/badge/Source-MIT-165BA7?style=flat-square&labelColor=0B325F)

</div>

## 概览

**首义 AI（WSU AI Open Platform）** 是一个以武昌首义学院使用场景为中心的开源 Web 工作台，采用蓝白视觉设计，可直接运行在 GitHub Pages。

前端基于原生 HTML、CSS 与 JavaScript，无构建依赖。笔记、任务、成绩计算、文本处理、校园公开资料检索均可以在浏览器中使用。AI 对话使用独立服务端网关，不将模型供应商密钥写入静态代码。

<table>
  <tr>
    <td width="50%"><b>桌面 / Desktop</b><br><sub>侧栏导航 · 全局搜索 · 自适应卡片布局</sub></td>
    <td width="50%"><b>移动端 / Mobile</b><br><sub>抽屉导航 · 单列工作区 · 触控优化</sub></td>
  </tr>
  <tr>
    <td><b>应用 / Applications</b><br><sub>校园检索 · 笔记 · 计划 · JSON · 文本分析 · 计时器</sub></td>
    <td><b>数据 / Storage</b><br><sub>浏览器本地存储 · 文档导入与导出 · API 网关设置</sub></td>
  </tr>
</table>

## 功能

| 模块 | 功能 | 运行方式 |
| :-- | :-- | :-- |
| **工作台** | 概览、任务进度、最近工作、学校入口 | 浏览器 |
| **校园资料检索** | 关键词匹配、分类筛选、来源链接、复制结果 | 浏览器 |
| **文档工作台** | Markdown 编辑、实时保存、预览、TXT/MD 导入、MD 导出 | 浏览器 |
| **学习计划** | 任务增删、完成状态、截止日期、进度统计 | 浏览器 |
| **成绩加权计算** | 课程学分与分数加权平均 | 浏览器 |
| **JSON 工具** | 格式化、压缩、验证、复制 | 浏览器 |
| **文本统计** | 字数、行数、字符、英文单词数 | 浏览器 |
| **专注计时** | 专注 / 休息模式、暂停、重置 | 浏览器 |
| **应用中心** | 分类筛选、搜索与启动 | 浏览器 |
| **AI 对话** | 对话记录、模型选择、OpenAI 兼容网关请求 | 需要独立网关 |

**快捷键**：`Ctrl/⌘ + K` 打开全局命令面板，`/` 快速搜索，`Esc` 关闭；在对话输入框使用 `Enter` 发送、`Shift + Enter` 换行。

## 本地运行

```bash
# 克隆项目
git clone https://github.com/cha290196-hue/WSU-AI-Open-Platform.git
cd WSU-AI-Open-Platform

# 使用 Python 启动静态服务器
python -m http.server 8000
```

访问 **http://localhost:8000**。

不需要 `npm install`。页面入口为 [`index.html`](index.html)。

## API 网关

前端支持独立 API 地址，可连接 OpenAI-compatible Chat Completions 格式的服务端。仓库包含一个 Cloudflare Workers 实现：[`server/worker.js`](server/worker.js)。

```text
Browser (GitHub Pages)
  │  POST /chat   { model, messages }
  ▼
AI Gateway (Cloudflare Worker)
  ├── Origin & Access Token verification
  ├── Request validation / optional rate limiting
  ├── Server-side API key
  └── Upstream chat completion endpoint
```

部署方式：

1. 安装 Wrangler，在 `server/` 下将 `wrangler.toml.example` 复制为 `wrangler.toml`。
2. 配置 `ALLOWED_ORIGIN`、`UPSTREAM_URL` 与 `MODEL_ALLOWLIST`。
3. 通过 `wrangler secret put AI_API_KEY` 和 `wrangler secret put GATEWAY_ACCESS_TOKEN` 设置服务端密钥。
4. 执行 `wrangler deploy`，在网页右上角设置中填写 `/chat` 地址、模型名以及网关访问令牌。

网关的访问令牌仅保存在当前页面内存；模型供应商密钥留在 Worker Secrets 中。大规模多用户运营应接入独立身份认证与用户级用量控制。

## 项目结构

```text
WSU-AI-Open-Platform/
├── index.html                   # 主应用布局及各工作区
├── assets/
│   ├── styles.css               # 蓝白视觉系统 / 自适应样式
│   ├── data.js                  # 图标、导航、校园资料与功能定义
│   ├── app.js                   # 路由、工具、笔记、任务、会话逻辑
│   ├── favicon.svg              # 网站图标
│   └── readme-cover.svg         # README 设计封面
├── server/
│   ├── worker.js                # AI 请求网关
│   └── wrangler.toml.example    # Cloudflare Workers 配置参考
├── .github/workflows/
│   └── deploy.yml               # GitHub Pages 自动发布
└── LICENSE
```

## 视觉规范

| Token | Value | Usage |
| :-- | :-- | :-- |
| Navy | `#0C2E5C` | 侧重区域与深色面板 |
| Primary | `#1762C1` | 交互按钮、导航状态 |
| Cyan | `#52C6ED` | 辅助高亮 |
| Background | `#F6F9FD` | 页面背景 |
| Surface | `#FFFFFF` | 内容容器 |
| Border | `#E7EDF5` | 组件分隔 |

学校校徽形态参考[武昌首义学院章程](https://www.wsyu.edu.cn/_upload/article/files/e4/f6/95830c01431aa36195abe1f98229/b5190731-2226-4cc4-a527-30035884e023.pdf#page=2)。所用校徽图像来自公开学校标识展示资源，校徽本身不包含在 MIT 源代码授权范围内。

## 贡献

项目代码托管在 GitHub。建议通过 [Issues](https://github.com/cha290196-hue/WSU-AI-Open-Platform/issues) 提交问题与功能提议，修改建议可通过 Pull Request 提交。

<sub>本仓库为独立开源实现，非学校官方统一身份入口。</sub>

---

<div align="center"><sub>© 2026 WSU AI Open Platform Contributors · <a href="LICENSE">MIT License</a></sub></div>
