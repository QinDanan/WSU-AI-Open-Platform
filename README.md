<div align="center">

# ✳ 首义 AI

### WSU AI Open Platform

**面向武昌首义学院师生的开放式 AI 学习与创作空间**

[![Website](https://img.shields.io/badge/Website-GitHub%20Pages-7662DB?style=flat-square)](https://cha290196-hue.github.io/WSU-AI-Open-Platform/)
[![Status](https://img.shields.io/badge/Status-Public%20Preview-E8DFFF?style=flat-square)](#当前状态)
[![License](https://img.shields.io/badge/License-MIT-6977A1?style=flat-square)](LICENSE)

[打开网站](https://cha290196-hue.github.io/WSU-AI-Open-Platform/) · [提交建议](https://github.com/cha290196-hue/WSU-AI-Open-Platform/issues/new) · [学校官网](https://www.wsyu.edu.cn/)

</div>

---

## 项目介绍

**首义 AI** 是一个面向武昌首义学院学习、教学、研究和校园生活场景的独立开源项目。我们希望构建一个清爽、可靠、易于扩展的校园 AI 入口。

网站以暖白与浅紫为主要视觉语言，兼顾电脑和手机浏览。

## 当前状态

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| 响应式网站首页 | ✅ 已完成 | 桌面与移动端适配 |
| 应用广场 | ✅ 已完成 | 分类筛选、搜索与功能介绍 |
| 校园公开资源 | ✅ 已完成 | 学校官网、教务处及项目仓库入口 |
| AI 对话界面 | 🟣 交互预览 | 可输入与查看演示回复，**未接入真实模型** |
| 校园专属知识库 | ⏳ 规划中 | 官方文档核验、来源追溯 |
| 教师课程助教 | ⏳ 规划中 | 课程资料与权限管理 |
| 安全后端与多模型 | ⏳ 规划中 | 不在浏览器中保存 API 密钥 |
| 统一校园认证 | ⏳ 需校方授权 | 不会模拟或绕过学校身份系统 |

> **说明：** 这是独立社区预览项目，不是武昌首义学院官方服务。学校名称仅说明目标使用场景。

## 预览网站

**https://cha290196-hue.github.io/WSU-AI-Open-Platform/**

如果页面尚未开放，仓库管理员需完成一次 GitHub Pages 初始化设置：

1. 打开 **Settings → Pages**。
2. 在 **Build and deployment → Source** 中选择 **GitHub Actions**。
3. 转到 **Actions → Deploy WSU AI website**，点击 **Run workflow**，或向 `main` 再次推送提交。
4. 待工作流显示绿色成功，再访问上面的预览地址。

后续每次向 `main` 推送代码都会自动重新部署。

## 本地运行

无需构建工具，克隆仓库后直接打开 `index.html`，或者在仓库根目录启动静态服务器：

```bash
python -m http.server 8000
```

访问 `http://localhost:8000` 即可。

## 技术选型

目前为 **HTML + CSS + JavaScript** 的零构建、无后端版本。

- 无需安装 Node.js 或依赖
- 无第三方前端追踪脚本
- 当前聊天消息不上传到服务器，也不持久化
- 静态资源可直接由 GitHub Pages 托管
- 后期接入模型须增加服务端 API 网关、访问控制和成本限制

## 参与项目

欢迎通过 [GitHub Issues](https://github.com/cha290196-hue/WSU-AI-Open-Platform/issues) 提交功能建议、反馈问题，或参与校园 AI 应用的开源建设。

## 许可

项目源代码按 [MIT License](LICENSE) 开源。学校名称及其他第三方标识不因本许可获得商标或官方授权。
