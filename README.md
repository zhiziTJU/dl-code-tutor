# DL-Code-Tutor

> 深度学习代码导师 - AI 驱动的代码分析助手

## 项目简介

DL-Code-Tutor 是一个桌面应用程序，作为"AI老师"帮助深度学习从业者和学生分析和改进他们的代码。它基于 Claude Code 和本地知识库，提供批判性的代码审查和改进建议。

### 核心特性

- 🔍 **智能代码分析**：深入理解深度学习代码结构和逻辑
- 📚 **丰富的知识库**：内置论文和最佳实践，可自动更新
- 🎯 **批判性评估**：不附和用户，指出真实问题
- 📊 **日志分析**：解析训练日志，预测训练效果
- 🔒 **安全隔离**：所有操作在程序沙箱内进行
- 💾 **知识积累**：随使用时间增长，知识库越来越丰富

## 安装

### 从源码运行

```bash
# 克隆仓库
git clone https://github.com/yourusername/dl-code-tutor.git
cd dl-code-tutor

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 打包应用
npm run dist:win   # Windows
npm run dist:mac   # macOS
npm run dist:linux # Linux
```

### 使用安装包

下载对应平台的安装包后，双击安装即可。

## 使用方法

### 1. 首次启动

首次启动时，程序会在安装目录下创建 `data/` 文件夹，包含：
- `workspace/` - Claude 工作空间
- `knowledge/` - 知识库（论文和最佳实践）
- `skills/` - 技能文件
- `config.json` - 程序配置

### 2. 提交代码分析

1. 点击上传区域，选择代码文件（.py 或 .ipynb）
2. 可选：上传训练日志文件
3. 点击"开始分析"按钮
4. 等待分析完成，查看评估报告

### 3. 更新知识库

点击"爬取最新论文"按钮，程序会自动：
- 搜索 arXiv 最新论文
- 总结论文内容
- 添加到知识库
- 更新索引

## 项目结构

```
dl-code-tutor/
├── src/
│   ├── main/           # Electron 主进程
│   │   └── index.ts    # 主进程入口
│   ├── preload/        # Preload 脚本
│   │   └── index.ts
│   └── renderer/       # React 渲染进程
│       ├── src/
│       │   ├── components/  # UI 组件
│       │   ├── App.tsx
│       │   └── main.tsx
│       └── index.html
├── resources/
│   ├── skills/         # Skill 文件
│   └── knowledge/      # 种子知识库
├── package.json
├── vite.config.ts
└── electron-builder.yml
```

## 技术栈

| 技术 | 用途 |
|------|------|
| Electron | 桌面应用框架 |
| React + TypeScript | 用户界面 |
| Vite | 构建工具 |
| Claude Code | AI 分析核心 |
| Markdown | 知识存储 |

## 安全设计

- 📁 **沙箱隔离**：所有 Claude 操作在程序专属目录
- 🔐 **权限控制**：访问用户文件前明确请求授权
- 📖 **只读访问**：用户文件只读，复制副本到工作区
- 🗑️ **自动清理**：分析完成后删除临时文件

## 知识库

程序内置以下论文和最佳实践：

- [ResNet](resources/knowledge/papers/seed/01_resnet.md) - 深度残差学习
- [Attention](resources/knowledge/papers/seed/02_attention.md) - 注意力机制
- [Transformer](resources/knowledge/papers/seed/03_transformer.md) - Transformer 架构
- [最佳实践](resources/knowledge/best_practices.md) - 深度学习最佳实践

更多论文可通过程序自动获取。

## 开发

### 环境要求

- Node.js >= 18
- npm >= 9
- Claude Code CLI

### 开发命令

```bash
npm run dev          # 开发模式
npm run build        # 构建生产版本
npm run lint         # 代码检查
npm run pack         # 打包（不生成安装程序）
npm run dist         # 生成安装程序
```

### 添加新的 Skill

在 `resources/skills/` 目录下创建新的 `.skill` 文件，程序会自动加载。

### 扩展知识库

1. 直接编辑 `resources/knowledge/` 下的 markdown 文件
2. 或使用程序的"爬取论文"功能

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 致谢

- [Claude Code](https://claude.ai/code) - AI 分析引擎
- [Electron](https://www.electronjs.org/) - 桌面应用框架
- [React](https://react.dev/) - UI 框架

---

**Made with ❤️ for Deep Learning Community**
