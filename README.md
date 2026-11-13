<div align="center">
  <a href="https://QinDanan.github.io/WSU-AI-Open-Platform/">
    <img src="assets/readme-cover.svg" width="100%" alt="WSU AI Open Platform">
  </a>
  <p>
    <a href="https://QinDanan.github.io/WSU-AI-Open-Platform/"><b>访问网站</b></a>
    &nbsp;·&nbsp;
    <a href="#功能"><b>功能</b></a>
    &nbsp;·&nbsp;
    <a href="#技术实现"><b>技术实现</b></a>
    &nbsp;·&nbsp;
    <a href="#开发与运行"><b>本地运行</b></a>
    &nbsp;·&nbsp;
    <a href="https://github.com/QinDanan/WSU-AI-Open-Platform/issues"><b>Issues</b></a>
  </p>
  <img alt="HTML" src="https://img.shields.io/badge/HTML5-1F4C7C?style=flat-square&logo=html5&logoColor=white">
  <img alt="CSS" src="https://img.shields.io/badge/CSS3-1F4C7C?style=flat-square&logo=css&logoColor=white">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-ES2022-1F4C7C?style=flat-square&logo=javascript&logoColor=white">
  <img alt="Pages" src="https://img.shields.io/badge/GitHub-Pages-1F4C7C?style=flat-square&logo=github&logoColor=white">
</div>

<br>

## 项目

**首义 AI** 是围绕武昌首义学院学习场景开发的 Web 工作台，集成校园公开资料检索、Markdown 笔记、任务计划、成绩计算与文本处理。AI 对话提供免登录试用与自定义 API 两种通道。

- **访问地址**　https://QinDanan.github.io/WSU-AI-Open-Platform/
- **部署方式**　静态页面通过 GitHub Actions 发布至 GitHub Pages
- **数据存储**　笔记、任务、会话记录保存在使用者当前浏览器
- **项目依赖**　前端原生 HTML / CSS / JavaScript，无需安装 Node.js
- **免登录问答**　Murakumo 公共推理模型；学生无需账号、手机号或 API Key
- **可选接入**　支持连接个人部署的 OpenAI-compatible API 网关

## 界面

[**打开实时界面**](https://QinDanan.github.io/WSU-AI-Open-Platform/) 查看桌面与手机适配。交互覆盖侧栏导航、全局命令搜索、工具切换与各工作区。

<!-- SCREENSHOTS_START -->
<table>
<tr><td width="72%" align="center"><b>Desktop · 1440 px</b></td><td width="28%" align="center"><b>Mobile · 390 px</b></td></tr>
<tr>
<td valign="top"><img src="assets/screenshots/desktop-dashboard.png" alt="工作台桌面端截图" width="100%"></td>
<td valign="top"><img src="assets/screenshots/mobile-dashboard.png" alt="工作台手机端截图" width="100%"></td>
</tr>
</table>

<details>
<summary><b>查看文档与工具页面</b></summary>

| 文档工作台 | 实用工具 |
|:---:|:---:|
| <img src="assets/screenshots/mobile-docs.png" width="300" alt="手机文档编辑器"> | <img src="assets/screenshots/mobile-tools.png" width="300" alt="手机实用工具"> |

</details>

[完整视觉测试报告](assets/screenshots/visual-report.json) · [更多桌面截图](assets/screenshots/)

<!-- SCREENSHOTS_END -->

## 功能

<table>
  <tr><th width="28%">工作区</th><th>主要操作</th><th width="16%">运行位置</th></tr>
  <tr><td><b>Dashboard</b><br>工作台</td><td>任务概览、最近工作、校园常用入口</td><td>浏览器</td></tr>
  <tr><td><b>Knowledge</b><br>校园资料</td><td>关键词检索、分类筛选、来源跳转与复制</td><td>浏览器</td></tr>
  <tr><td><b>Documents</b><br>文档工作台</td><td>Markdown 编辑、预览、自动保存、导入与导出</td><td>浏览器</td></tr>
  <tr><td><b>Planner</b><br>学习计划</td><td>任务创建、截止日期、状态筛选、完成进度</td><td>浏览器</td></tr>
  <tr><td><b>Utilities</b><br>实用工具</td><td>成绩加权计算、JSON 格式化、文本统计、专注计时</td><td>浏览器</td></tr>
  <tr><td><b>Guest AI</b><br>免登录试用</td><td>直接使用 Murakumo 的 Mishima 模型，不需要注册或 API Key</td><td>浏览器 / Murakumo</td></tr>
  <tr><td><b>Model Gateway</b><br>自定义 API</td><td>独立会话、网关地址、模型名称、访问令牌配置</td><td>独立网关</td></tr>
</table>

### 操作方式

| 操作 | 快捷键 / 入口 |
| --- | --- |
| 打开全局命令菜单 | `Ctrl / ⌘ + K` |
| 搜索页面或功能 | `/` |
| 关闭浮层 | `Esc` |
| 聊天发送 / 换行 | `Enter` / `Shift + Enter` |
| 导入笔记 | 文档工作台 → 导入 `.md` 或 `.txt` |
| 导出笔记 | 文档工作台 → 导出 Markdown |

## AI 对话

| 通道 | 访问方式 | 限制 |
| --- | --- | --- |
| **免登录试用（默认）** | 浏览器直接请求 [Murakumo](https://murakumo.cloud/docs) 的 `mishima` 文本模型；无需账号或密钥 | 免费容量按网络共享，繁忙可能返回 429 |
| **自定义 API** | 在设置中配置个人服务端网关和模型 | 按自有服务的规则 |

匿名接口已用真实 POST 请求验证返回 HTTP 200 与模型回复，并通过 GitHub Pages 来源的 CORS 预检。测试配置见 [provider probe workflow](.github/workflows/probe-free-ai.yml)。

Murakumo 公布的免费限制为每个网络、每个文本模型每日 100 次，并受共享 GPU 容量影响。该试用服务的使用条款要求年满 18 岁。匿名调用不收集平台账号，但网络连接会向第三方透露请求来源，**输入的聊天内容会交给第三方模型处理**。不要提交学籍、成绩、身份信息或未公开科研材料。用于个人试用，不将此通道视作全校正式服务的容量保证。

免登录与自定义 API 两种通道的会话分别保存。自定义 API 的上游密钥保存在用户自己的服务器端。

## 技术实现

```text
GitHub Pages（浏览器工作台）
  ├── 免登录 → Murakumo / Mishima（第三方免费推理）
  └── 自定义 → 独立 API 网关 → 用户指定模型

本地存储：笔记、任务、两种渠道各自的会话记录
```

前端代码位于 [`index.html`](index.html) 和 [`assets/`](assets/)。校园公开资料与图标定义位于 [`assets/data.js`](assets/data.js)，交互逻辑位于 [`assets/app.js`](assets/app.js)。页面样式拆分为基础规则 `styles.css` 和布局修订 `polish.css`。

免登录问答无需用户或开发者密钥，由 Murakumo 的公开接口处理。AI 网关示例位于 [`server/worker.js`](server/worker.js)，使用 Cloudflare Workers 环境变量保存上游密钥。具体部署参数见 [`server/README.md`](server/README.md)。

## 开发与运行

```bash
git clone https://github.com/QinDanan/WSU-AI-Open-Platform.git
cd WSU-AI-Open-Platform
python -m http.server 8000
```

打开 `http://localhost:8000`。前端不需要编译。向 `main` 推送提交后，GitHub Actions 自动构建静态产物并发布。

### 项目目录

```text
WSU-AI-Open-Platform/
├── index.html                  页面结构
├── assets/
│   ├── styles.css              基础设计系统
│   ├── polish.css              组件与响应式修订
│   ├── app.js                  路由与交互逻辑
│   ├── data.js                 校园资料与图标
│   ├── school-emblem.png       武昌首义学院校徽
│   ├── readme-cover.svg        仓库封面
│   └── favicon.svg             网站图标
├── server/
│   ├── worker.js               AI 网关示例
│   └── wrangler.toml.example   部署配置
├── scripts/                    校徽来源处理脚本
└── .github/workflows/          构建、部署与视觉测试
```

## 设计

| 层级 | 配色 | 用途 |
| --- | --- | --- |
| Navy | `#0C2E5C` | 导航文字、主视觉 |
| Blue | `#1762C1` | 按钮、焦点、状态 |
| Cyan | `#52C6ED` | 次级强调 |
| Canvas | `#F4F7FB` | 页面背景 |
| Surface | `#FFFFFF` | 工作区、卡片 |

校徽采用武昌首义学院公开标识，设计参考[学校章程](https://www.wsyu.edu.cn/_upload/article/files/e4/f6/95830c01431aa36195abe1f98229/b5190731-2226-4cc4-a527-30035884e023.pdf#page=2)。校徽及学校名称的相关权利仍归原权利主体所有。

## 参与开发

问题反馈与功能需求通过 [GitHub Issues](https://github.com/QinDanan/WSU-AI-Open-Platform/issues) 跟踪。修改代码可以提交 Pull Request。源码按 [MIT License](LICENSE) 发布。

---

<div align="center"><sub>WSU AI OPEN PLATFORM · 2026</sub></div>