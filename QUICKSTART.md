# DL-Code-Tutor 快速启动指南

## 开发环境设置

### 1. 安装依赖

```bash
cd dl-code-tutor
npm install
```

### 2. 开发模式运行

```bash
npm run dev
```

这会：
- 启动 Vite 开发服务器（端口 5173）
- 启动 Electron 窗口
- 支持热重载

### 3. 构建生产版本

```bash
npm run build
```

### 4. 打包应用

```bash
# Windows
npm run dist:win

# macOS
npm run dist:mac

# Linux
npm run dist:linux
```

## 项目文件说明

### 核心文件

| 文件 | 说明 |
|-----|------|
| `src/main/index.ts` | Electron 主进程，处理窗口和系统调用 |
| `src/preload/index.ts` | Preload 脚本，安全地暴露 API |
| `src/renderer/src/App.tsx` | React 主应用组件 |
| `src/renderer/src/components/` | UI 组件 |

### 配置文件

| 文件 | 说明 |
|-----|------|
| `package.json` | 项目配置和依赖 |
| `vite.config.ts` | Vite 构建配置 |
| `electron-builder.yml` | 打包配置 |
| `tsconfig.json` | TypeScript 配置 |

### 资源文件

| 目录 | 说明 |
|-----|------|
| `resources/skills/` | Claude Code skills |
| `resources/knowledge/` | 知识库（论文和最佳实践） |

## 添加新功能

### 添加新的 Skill

1. 在 `resources/skills/` 创建 `.skill` 文件
2. 程序会自动加载
3. 在 `src/main/index.ts` 中添加对应的 IPC 处理

### 添加新的 UI 组件

1. 在 `src/renderer/src/components/` 创建组件文件
2. 在 `App.tsx` 中导入使用
3. 在 `App.css` 中添加样式

### 扩展知识库

1. 直接编辑 `resources/knowledge/` 下的 markdown 文件
2. 创建新的 `.md` 文件
3. 更新 `README.md` 索引

## 常见问题

### Q: 开发模式下窗口打不开？

确保 Vite 服务器已启动：
```bash
npm run dev
```

### Q: TypeScript 类型错误？

运行类型检查：
```bash
npx tsc --noEmit
```

### Q: 打包后程序无法运行？

检查 `electron-builder.yml` 配置，确保资源文件路径正确。

## 下一步

- 阅读 [README.md](README.md) 了解项目详情
- 查看 [src/main/index.ts](src/main/index.ts) 了解主进程逻辑
- 查看 [resources/skills/](resources/skills/) 了解 skill 定义

---

**Happy Coding!** 🚀
