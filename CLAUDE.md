# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DL-Code-Tutor is a desktop application for analyzing deep learning code. It provides critical, evidence-based code review using Claude Code as the AI engine. The app runs as an Electron desktop application with a React frontend.

## Development Commands

```bash
# Install dependencies
npm install

# Development mode (starts Vite dev server on port 5173 + Electron in watch mode)
npm run dev

# Build all components
npm run build

# Build individual components
npm run build:main      # TypeScript main process (tsc -p tsconfig.main.json)
npm run build:renderer  # Vite renderer build
npm run build:preload   # TypeScript preload script (tsc -p tsconfig.preload.json)

# Type checking (checks all TypeScript configs)
npx tsc --noEmit

# Linting
npm run lint

# Package for distribution
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

## Architecture

### Electron Process Structure

- **Main Process** (`src/main/index.ts`): Handles window management, IPC communication, file system operations, and spawns Claude Code CLI processes
- **Preload Script** (`src/preload/index.ts`): Uses `contextBridge` to securely expose APIs to renderer via `window.electron`
- **Renderer Process** (`src/renderer/`): React application with TypeScript

### IPC Communication

The app uses `ipcRenderer.invoke()` for request-response and `ipcRenderer.on()` for events:

**From renderer to main (invoke):**
- `analyze-code(filePath)` - Analyze a code file
- `analyze-with-log(codePath, logPath)` - Analyze code with training log
- `fetch-papers(count, days)` - Fetch new papers from arXiv
- `get-knowledge-status()` - Get knowledge base statistics
- `open-knowledge-folder()` - Open knowledge directory in file explorer
- `get-permissions-history()` - Get file access permissions history
- `clear-permissions()` - Clear stored permissions
- `stop-claude()` - Stop the currently running Claude process
- `get-claude-status()` - Get Claude running status and API config status
- `set-api-config(config)` - Set API configuration (apiKey, baseUrl, provider, model)
- `get-api-config()` - Get API configuration (key is masked for security)
- `set-api-key(key)` - Set API key (legacy, use set-api-config)
- `get-api-key()` - Get API key masked (legacy, use get-api-config)

**Convenience helpers (available via `window.electron`):**
- `setZhipuConfig(apiKey)` - Quick setup for Zhipu AI (sets provider='zhipu', baseUrl='https://open.bigmodel.cn/api/anthropic', model='glm-4.7')

**From main to renderer (events):**
- `permission-request` - Request user permission to access a file
- `analysis-progress` - Stream Claude analysis output as text chunks
- `claude-status-changed` - Notify when Claude process starts/stops (`{ isRunning: boolean }`)

### Data Directory Structure

The app creates a program data directory resolved in this order:
1. `process.env.PROGRAM_DATA_DIR` - Environment variable override
2. `.installation.json` - Installation record path (if exists)
3. `app.getPath('userData')/DL-Code-Tutor` - Default for packaged/development

The directory contains:

```
data/
├── workspace/          # Claude working directory
│   └── temp/          # Temporary file copies (auto-cleaned)
├── knowledge/         # Knowledge base (papers, best practices)
│   └── papers/        # Research papers in markdown
├── skills/            # Claude Code skill definitions
├── .claude/           # Claude settings with permission restrictions
└── permissions.json   # Stored user permissions
```

### Security Model

1. **Sandboxed Claude**: Claude Code runs with restricted file access (only `data/` directory)
2. **Permission Prompts**: User files require explicit permission before access
3. **Copy-on-Read**: User files are copied to workspace, never modified in-place
4. **Auto-cleanup**: Temporary files are deleted after analysis
5. **Remembered Permissions**: Users can choose to remember permissions for files/directories

### API Configuration

The app supports custom API configuration for Claude:

- **Storage**: `data/api-config.json` contains `{ apiKey, baseUrl?, provider?, model? }`
- **Providers**: Supports `anthropic` (default), `openai`, `custom`, or `zhipu`
- **Environment Variables**: When Claude is spawned, the config is passed via:
  - `ANTHROPIC_API_KEY` - API key for Anthropic
  - `ANTHROPIC_BASE_URL` - Custom API endpoint
  - `ANTHROPIC_MODEL` - Custom model name
  - `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` - For OpenAI-compatible endpoints
  - `CLAUDE_CODE_GIT_BASH_PATH` - Path to bash.exe (Windows only)
- **Zhipu AI**: When provider is `zhipu`, defaults to `https://open.bigmodel.cn/api/anthropic` with `glm-4.7` model
- **Security**: API keys are never returned in full; IPC responses return masked versions (e.g., `sk-xx...xxAB`)

## Skills System

Skills are Claude Code skill definitions in `resources/skills/`. Each `.skill` file is a YAML-formatted document defining:

```yaml
name: skill-name              # Skill identifier
description: Short description
version: 1.0.0

parameters:
  - name: param_name
    type: string
    description: Parameter description
    required: true/false

system_prompt: |
  Multi-line system prompt for Claude...

tools:
  - Read
  - Grep
  - Bash

allowed_paths:
  - "{knowledge}/**/*"
  - "{code}"

denied_paths:
  - "**/*"

execution:
  step1: "Description of step 1"
  step2: "Description of step 2"
```

**Available skills:**
- `code-tutor` - Main deep learning code analysis skill
- `analyze-code` - Standalone code analysis
- `analyze-log` - Training log analysis
- `fetch-papers` - Fetch new papers from arXiv

**To add a new skill:**
1. Create a new `.skill` file in `resources/skills/`
2. Add corresponding IPC handler in `src/main/index.ts` (follow pattern of `fetch-papers`)
3. The skill will be automatically loaded into `SKILLS_DIR` on first run

## Knowledge Base

Located in `resources/knowledge/`:

- `papers/seed/` - Initial seed papers (ResNet, Attention, Transformer)
- `papers/` - Runtime papers fetched via `fetch-papers` skill
- `best_practices.md` - DL best practices reference

Knowledge is referenced in skill prompts and accessed by Claude during analysis.

## TypeScript Configuration

The project uses separate TypeScript configs for different parts:
- `tsconfig.json` - Base config for renderer process
- `tsconfig.main.json` - Main process (outputs to `dist/main/`)
- `tsconfig.preload.json` - Preload script (outputs to `dist/preload/`)

All configs extend the base settings and are properly configured.

## Vite Configuration

The project uses **two separate Vite configs**:

1. **`vite.config.ts`** - Renderer process (React app)
   - Root: `src/renderer/`
   - Output: `dist/renderer/`
   - Dev server: `localhost:5173`
   - Plugin: `@vitejs/plugin-react`

2. **`vite.electron.config.ts`** - Electron integration
   - Uses `vite-plugin-electron` for main/preload processes
   - Entry points: `src/main/index.ts`, `src/preload/index.ts`
   - Externalizes `electron` from bundle
   - Provides hot reload in dev mode

## Component Structure

Renderer components in `src/renderer/components/`:

- `Header.tsx` - App title and branding
- `UploadSection.tsx` - File selection and analysis trigger
- `KnowledgeSection.tsx` - Knowledge base status and actions
- `ResultSection.tsx` - Analysis results display
- `PermissionModal.tsx` - File access permission prompt
- `Footer.tsx` - Permissions management

## External Dependencies

- Requires **Claude Code CLI** to be installed and available in PATH (`npm install -g @anthropic-ai/claude-code`)
- Claude is spawned via `spawn()` with custom environment variables and `--dangerously-skip-permissions` flag
- On Windows, the app attempts to find `node.exe` and `bash.exe` in known locations:
  - Node: `G:\node\node.exe`, `C:\Program Files\nodejs\node.exe`, or NVM paths
  - Bash: `G:\Git\bin\bash.exe` (preferred), `C:\Program Files\Git\bin\bash.exe`
- Claude runs with `CLAUDE_CONFIG_DIR` set to `data/.claude` and `CLAUDE_SKILLS_PATH` to `data/skills`

## Packaging Configuration

The app uses `electron-builder` for packaging. Configuration exists in **both**:
- `package.json` - Under the `build` key
- `electron-builder.yml` - Standalone config file (takes precedence)

Key packaging settings:
- **appId**: `com.dlcodetutor.app`
- **NSIS installer** (Windows): Allows custom install directory, creates desktop/start menu shortcuts, includes LICENSE.txt
- **Uninstall behavior**: `deleteAppDataOnUninstall: true` - Cleans user data on uninstall
- **Resources**: Both `dist/` and `resources/` are bundled; `resources/` is also copied to `extraResources`

When modifying packaging settings, update both files to maintain consistency.

## Known Issues / Notes

- The app attempts to connect to Vite dev server on `localhost:5173` in development, falling back to built files if unavailable
- File permissions use `crypto.randomBytes()` for generating request IDs
- When Claude runs, it operates within `WORKSPACE_DIR` with restricted access via custom environment variables (`CLAUDE_CONFIG_DIR`, `CLAUDE_SKILLS_PATH`)
- The app uses a custom `app://` protocol handler in production mode to serve the renderer files
- Claude process stdin is closed after 5 seconds to allow time for permission requests (the `--dangerously-skip-permissions` flag is used to bypass Claude's own permission system since the app handles permissions at the UI level)
- Analysis timeout is hardcoded to 5 minutes (5 * 60 * 1000 ms); the process is killed if it exceeds this limit. Timeout handling: if output > 100 chars, treats as success; otherwise, fails with timeout error
- The app deletes user data on uninstall (`deleteAppDataOnUninstall: true` in electron-builder.yml)

## Windows-Specific Details

The development build scripts use Windows-specific commands:
- `npm run dev` uses `start /b` (background start), `timeout /t 2 >nul` (sleep), and `move` (rename)
- Node.js path detection includes user-specific paths like `G:\node\node.exe`
- Git Bash detection checks paths like `G:\Git\usr\bin\bash.exe`

For cross-platform development, the `vite.electron.config.ts` provides the primary Electron integration, while the direct `npm run build:*` commands use TypeScript compiler (tsc) directly.
