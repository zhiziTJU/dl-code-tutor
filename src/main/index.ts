/**
 * DL-Code-Tutor - Electron 主进程
 * 深度学习代码导师
 */

import { app, BrowserWindow, ipcMain, shell, protocol } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// ES 模块中 __dirname 的 polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 类型定义 ====================

interface PermissionRecord {
  filePath: string;
  granted: boolean;
  timestamp: number;
  remember: boolean;
}

interface PermissionRequest {
  id: string;
  filePath: string;
  fileType: 'code' | 'log' | 'unknown';
  fileSize: number;
}

interface AnalysisOptions {
  codePath?: string;
  logPath?: string;
  skill: string;
  customPrompt?: string;  // 自定义提示，不使用skill系统
}

// ==================== 全局变量 ====================

let mainWindow: BrowserWindow | null = null;
let permissions: Map<string, PermissionRecord> = new Map();
let currentClaudeProcess: any = null;  // 当前运行的 Claude 进程

// API 配置接口
interface ApiConfig {
  apiKey: string;
  baseUrl?: string;  // 自定义 API 端点
  provider?: 'anthropic' | 'openai' | 'custom' | 'zhipu';  // API 提供商类型
  model?: string;  // 模型名称
}

let apiConfig: ApiConfig = { apiKey: '' };  // API 配置

// 目录路径（在 initDirectories 中初始化）
let PROGRAM_DIR: string = '';
let WORKSPACE_DIR: string = '';
let KNOWLEDGE_DIR: string = '';
let SKILLS_DIR: string = '';
let TEMP_DIR: string = '';
let PERMISSIONS_LOG: string = '';
let API_CONFIG_FILE: string = '';  // API 配置文件路径

// ==================== 目录管理 ====================

/**
 * 获取程序数据目录 - 跟随安装位置
 */
function getProgramDataDir(): string {
  // 方案1：环境变量（打包时设置）
  if (process.env.PROGRAM_DATA_DIR) {
    return process.env.PROGRAM_DATA_DIR;
  }

  // 方案2：从安装记录中读取
  const appPath = app.getAppPath();
  const installationRecord = path.join(appPath, '.installation.json');
  if (fs.existsSync(installationRecord)) {
    try {
      const record = JSON.parse(fs.readFileSync(installationRecord, 'utf-8'));
      if (record.dataDir) {
        return record.dataDir;
      }
    } catch (e) {
      console.warn('无法读取安装记录，使用默认位置');
    }
  }

  // 方案3：打包后使用 userData 目录（app.asar 是文件，不能在其下创建目录）
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'DL-Code-Tutor');
  }

  // 方案4：开发环境使用 userData
  return path.join(app.getPath('userData'), 'DL-Code-Tutor');
}

/**
 * 初始化所有目录
 */
function initDirectories(): void {
  // 第一步：确定程序数据目录
  PROGRAM_DIR = getProgramDataDir();
  WORKSPACE_DIR = path.join(PROGRAM_DIR, 'workspace');
  KNOWLEDGE_DIR = path.join(PROGRAM_DIR, 'knowledge');
  SKILLS_DIR = path.join(PROGRAM_DIR, 'skills');
  TEMP_DIR = path.join(WORKSPACE_DIR, 'temp');
  PERMISSIONS_LOG = path.join(PROGRAM_DIR, 'permissions.json');
  API_CONFIG_FILE = path.join(PROGRAM_DIR, 'api-config.json');

  // 第二步：创建目录结构
  initProgramDirectories();

  // 加载 API 配置
  loadApiConfig();

  // 第三步：记录位置
  const locationRecord = path.join(PROGRAM_DIR, '.location.json');
  if (!fs.existsSync(locationRecord)) {
    fs.writeFileSync(locationRecord, JSON.stringify({
      programDir: PROGRAM_DIR,
      installDate: new Date().toISOString(),
      version: app.getVersion()
    }, null, 2));
  }

  console.log('='.repeat(60));
  console.log('DL-Code-Tutor 启动');
  console.log('程序数据目录:', PROGRAM_DIR);
  console.log('工作空间目录:', WORKSPACE_DIR);
  console.log('知识库目录:', KNOWLEDGE_DIR);
  console.log('='.repeat(60));
}

/**
 * 创建程序所需的子目录
 */
function initProgramDirectories(): void {
  const dirs = [
    WORKSPACE_DIR,
    KNOWLEDGE_DIR,
    path.join(KNOWLEDGE_DIR, 'papers'),
    SKILLS_DIR,
    TEMP_DIR,
    path.join(PROGRAM_DIR, '.claude')
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // 加载权限记录
  loadPermissions();

  // 配置 Claude 限制
  setupClaudeRestrictions();

  // 复制初始资源
  copyInitialResources();
}

/**
 * 配置 Claude 运行时的限制
 */
function setupClaudeRestrictions(): void {
  const claudeSettings = {
    permissions: {
      allow: ['**/*'],  // 允许所有文件访问
      deny: [],
      ask: []
    },
    disableAutoMode: 'disable' as const
  };

  const claudeSettingsPath = path.join(PROGRAM_DIR, '.claude', 'settings.json');
  fs.writeFileSync(claudeSettingsPath, JSON.stringify(claudeSettings, null, 2));
}

/**
 * 加载权限记录
 */
function loadPermissions(): void {
  if (fs.existsSync(PERMISSIONS_LOG)) {
    try {
      const data = fs.readFileSync(PERMISSIONS_LOG, 'utf-8');
      const records: PermissionRecord[] = JSON.parse(data);
      records.forEach(r => permissions.set(r.filePath, r));
    } catch (e) {
      console.warn('加载权限记录失败:', e);
    }
  }
}

/**
 * 保存权限记录
 */
function savePermissions(): void {
  const records = Array.from(permissions.values());
  fs.writeFileSync(PERMISSIONS_LOG, JSON.stringify(records, null, 2));
}

/**
 * 加载 API 配置
 */
function loadApiConfig(): void {
  if (fs.existsSync(API_CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(API_CONFIG_FILE, 'utf-8');
      apiConfig = JSON.parse(data);
    } catch (e) {
      console.warn('加载 API 配置失败:', e);
    }
  }
}

/**
 * 保存 API 配置
 */
function saveApiConfig(): void {
  fs.writeFileSync(API_CONFIG_FILE, JSON.stringify(apiConfig, null, 2));
}

/**
 * 设置完整的 API 配置
 */
function setApiConfig(config: Partial<ApiConfig>): void {
  if (config.apiKey !== undefined) apiConfig.apiKey = config.apiKey;
  if (config.baseUrl !== undefined) apiConfig.baseUrl = config.baseUrl;
  if (config.provider !== undefined) apiConfig.provider = config.provider;
  if (config.model !== undefined) apiConfig.model = config.model;
  saveApiConfig();
}

/**
 * 获取完整的 API 配置
 */
function getApiConfig(): ApiConfig {
  return { ...apiConfig };
}

/**
 * 设置 API Key（保留向后兼容）
 */
function setApiKey(key: string): void {
  apiConfig.apiKey = key;
  saveApiConfig();
}

/**
 * 获取 API Key（保留向后兼容）
 */
function getApiKey(): string {
  return apiConfig.apiKey;
}

/**
 * 复制初始资源文件
 */
function copyInitialResources(): void {
  const resourcesPath = path.join(process.resourcesPath || app.getAppPath(), 'resources');

  // 复制 skills
  const skillsSource = path.join(resourcesPath, 'skills');
  if (fs.existsSync(skillsSource)) {
    const files = fs.readdirSync(skillsSource);
    for (const file of files) {
      const dest = path.join(SKILLS_DIR, file);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(path.join(skillsSource, file), dest);
      }
    }
  }

  // 复制种子知识
  const knowledgeSource = path.join(resourcesPath, 'knowledge');
  if (fs.existsSync(knowledgeSource)) {
    copyDirectory(knowledgeSource, KNOWLEDGE_DIR);
  }
}

/**
 * 递归复制目录
 */
function copyDirectory(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

// ==================== 权限管理 ====================

/**
 * 请求用户授予文件访问权限
 */
async function requestPermission(filePath: string): Promise<boolean> {
  const stats = fs.statSync(filePath);
  const fileType = filePath.endsWith('.py') || filePath.endsWith('.ipynb') ? 'code' :
                   filePath.endsWith('.log') || filePath.endsWith('.txt') ? 'log' : 'unknown';

  // 检查是否有已记住的权限
  const existing = permissions.get(filePath);
  if (existing && existing.remember) {
    return existing.granted;
  }

  // 检查目录级别的权限
  const dirPath = path.dirname(filePath);
  for (const [key, value] of permissions.entries()) {
    if (value.remember && path.dirname(key) === dirPath && value.granted) {
      return true;
    }
  }

  // 请求用户授权
  return new Promise((resolve) => {
    const requestId = crypto.randomBytes(16).toString('hex');

    mainWindow?.webContents.send('permission-request', {
      id: requestId,
      filePath,
      fileType,
      fileSize: stats.size
    });

    const handler = (_event: any, response: { id: string; granted: boolean; remember: boolean }) => {
      if (response.id === requestId) {
        ipcMain.removeListener('permission-response', handler);

        permissions.set(filePath, {
          filePath,
          granted: response.granted,
          timestamp: Date.now(),
          remember: response.remember
        });
        savePermissions();

        resolve(response.granted);
      }
    };

    ipcMain.on('permission-response', handler);
  });
}

/**
 * 准备文件用于分析（复制到工作区）
 */
async function prepareFileForAnalysis(filePath: string): Promise<string> {
  const granted = await requestPermission(filePath);
  if (!granted) {
    throw new Error('用户拒绝了文件访问权限');
  }

  const fileName = path.basename(filePath);
  const tempPath = path.join(TEMP_DIR, `${Date.now()}_${fileName}`);
  fs.copyFileSync(filePath, tempPath);

  return tempPath;
}

// ==================== Claude 进程管理 ====================

/**
 * 获取 Claude CLI 的完整路径
 */
function getClaudePath(): string {
  // 在 Windows 上，npm 安装的 claude 是一个 .cmd 文件
  const npmPath = path.join(process.env.APPDATA || '', 'npm');
  const claudeCmd = path.join(npmPath, 'claude.cmd');

  if (fs.existsSync(claudeCmd)) {
    return claudeCmd;
  }

  // 如果找不到，返回 'claude' 希望它在 PATH 中
  return 'claude';
}

/**
 * 获取系统的 node.exe 路径
 */
function getNodePath(): string {
  // 尝试常见的 node 安装路径
  const possiblePaths: string[] = [
    'G:\\node\\node.exe',  // 用户系统上的路径
    'C:\\Program Files\\nodejs\\node.exe'
  ];

  // 添加 NVM 路径（如果存在）
  if (process.env.NVM_HOME) {
    possiblePaths.push(path.join(process.env.NVM_HOME, 'current', 'node.exe'));
  }
  if (process.env.USERNAME) {
    possiblePaths.push(`C:\\Users\\${process.env.USERNAME}\\AppData\\Roaming\\nvm\\current\\node.exe`);
  }

  for (const nodePath of possiblePaths) {
    if (nodePath && fs.existsSync(nodePath)) {
      return nodePath;
    }
  }

  // 如果找不到，返回 'node' 希望它在 PATH 中
  return 'node';
}

/**
 * 获取 bash.exe 的路径
 * Claude Code CLI 需要 bin/bash.exe（不是 usr/bin/bash.exe）
 */
function getBashPath(): string {
  // Claude Code CLI 需要 bin 目录下的 bash.exe
  // 参考: https://github.com/anthropics/claude-code/issues/10152
  const possiblePaths = [
    'G:\\Git\\bin\\bash.exe',           // 用户系统上的路径（优先）
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    process.env.GIT_INSTALL_ROOT + '\\bin\\bash.exe',
    process.env.GIT_INSTALL_ROOT + '\\usr\\bin\\bash.exe'
  ];

  for (const bashPath of possiblePaths) {
    if (bashPath && fs.existsSync(bashPath)) {
      console.log('[Bash] Found bash at:', bashPath);
      return bashPath;
    }
  }

  // 如果都找不到，返回 'bash' 希望它在 PATH 中
  console.warn('[Bash] bash.exe not found, using "bash" from PATH');
  return 'bash';
}

/**
 * 运行 Claude 分析
 */
async function runClaudeAnalysis(options: AnalysisOptions): Promise<string> {
  const workspaceCodePath = options.codePath ? await prepareFileForAnalysis(options.codePath) : null;
  const workspaceLogPath = options.logPath ? await prepareFileForAnalysis(options.logPath) : null;

  return new Promise((resolve, reject) => {
    const claudePath = getClaudePath();
    const bashPath = getBashPath();
    console.log('[Claude] Claude path:', claudePath);
    console.log('[Claude] Bash path:', bashPath);
    console.log('[Claude] Working directory:', WORKSPACE_DIR);

    // 配置 Claude 运行时的环境变量
    // 注意：CLAUDE_CONFIG_DIR 应该指向包含 settings.json 的目录
    const claudeConfigDir = path.join(PROGRAM_DIR, '.claude');
    const claudeEnv: any = {
      ...process.env,
      CLAUDE_CONFIG_DIR: claudeConfigDir,
      CLAUDE_SKILLS_PATH: SKILLS_DIR,
      CLAUDE_CODE_GIT_BASH_PATH: bashPath,  // Claude CLI 需要知道 bash 的位置
      HOME: WORKSPACE_DIR,
      USERPROFILE: WORKSPACE_DIR,
      HOMEDRIVE: process.env.HOMEDRIVE,
      HOMEPATH: process.env.HOMEPATH
    };

    console.log('[Claude] Config dir:', claudeConfigDir);
    console.log('[Claude] Skills path:', SKILLS_DIR);
    console.log('[Claude] Skills exist:', fs.existsSync(SKILLS_DIR));

    // 如果设置了 API Key，添加到环境变量
    if (apiConfig.apiKey) {
      claudeEnv.ANTHROPIC_API_KEY = apiConfig.apiKey;
    }

    // 根据提供商类型设置默认端点和模型
    let finalBaseUrl = apiConfig.baseUrl;
    let finalModel = apiConfig.model;

    if (apiConfig.provider === 'zhipu') {
      // 智谱AI 默认配置（使用官方 Anthropic 兼容端点）
      if (!finalBaseUrl) {
        finalBaseUrl = 'https://open.bigmodel.cn/api/anthropic';
      }
      if (!finalModel) {
        finalModel = 'glm-4.7';
      }
      console.log('[Claude] Using Zhipu AI with model:', finalModel);
    }

    // 如果设置了自定义 API 端点，添加到环境变量
    // Claude Code CLI 支持 ANTHROPIC_BASE_URL 环境变量
    if (finalBaseUrl) {
      claudeEnv.ANTHROPIC_BASE_URL = finalBaseUrl;
      console.log('[Claude] Using API endpoint:', finalBaseUrl);
    }

    // 如果设置了模型名称，添加到环境变量
    if (finalModel) {
      claudeEnv.ANTHROPIC_MODEL = finalModel;
      console.log('[Claude] Using model:', finalModel);
    }

    // 根据 API 提供商类型设置相应的环境变量
    if (apiConfig.provider === 'openai') {
      // OpenAI 兼容模式
      claudeEnv.OPENAI_API_KEY = apiConfig.apiKey;
      if (apiConfig.baseUrl) {
        claudeEnv.OPENAI_BASE_URL = apiConfig.baseUrl;
      }
      if (apiConfig.model) {
        claudeEnv.OPENAI_MODEL = apiConfig.model;
      }
    }

    // 使用 shell 运行 Claude CLI
    // --dangerously-skip-permissions 参数需要通过 claude 命令传递，不是直接传给 cli.js
    let claudeProcess: any;
    if (process.platform === 'win32') {
      // Windows: 使用 cmd.exe 运行 claude 命令
      console.log('[Claude] Using claude command via cmd.exe');
      claudeProcess = spawn('cmd.exe', ['/c', 'claude', '--dangerously-skip-permissions'], {
        cwd: WORKSPACE_DIR,
        env: claudeEnv,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });
    } else {
      // Unix-like: 使用 bash 运行 claude
      const bashPath = getBashPath();
      claudeProcess = spawn(bashPath, ['-lc', 'claude --dangerously-skip-permissions'], {
        cwd: WORKSPACE_DIR,
        env: claudeEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    }

    // 保存当前进程引用，以便可以停止它
    currentClaudeProcess = claudeProcess;

    // 通知渲染进程：Claude 已开始运行
    mainWindow?.webContents.send('claude-status-changed', { isRunning: true });

    let output = '';
    let errorOutput = '';
    let timeoutHandle: NodeJS.Timeout | null = null;
    let isResolved = false;  // 标记 Promise 是否已经 resolve/reject

    // 检查 claude 进程是否成功启动
    claudeProcess.on('error', (err: Error) => {
      if (isResolved) return;
      isResolved = true;

      // 清除超时定时器
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }

      // 清理临时文件
      if (workspaceCodePath && fs.existsSync(workspaceCodePath)) {
        try { fs.unlinkSync(workspaceCodePath); } catch (e) { /* ignore */ }
      }
      if (workspaceLogPath && fs.existsSync(workspaceLogPath)) {
        try { fs.unlinkSync(workspaceLogPath); } catch (e) { /* ignore */ }
      }
      currentClaudeProcess = null;

      if (err.message.includes('ENOENT')) {
        reject(new Error(
          'Claude Code CLI 未找到。\n\n' +
          '请确保已安装 Claude Code CLI：\n' +
          'npm install -g @anthropic-ai/claude-code'
        ));
      } else {
        reject(new Error(`启动 Claude 失败: ${err.message}`));
      }
    });

    // 构建用户消息
    let userMessage: string;
    if (options.customPrompt) {
      // 使用自定义提示（如fetch-papers）- 使用自然语言
      userMessage = options.customPrompt;
    } else {
      // 使用 skill 系统的命令格式
      // Claude Code CLI 使用 /skill:name 格式来调用 skill
      userMessage = `/skill:${options.skill}`;
      if (workspaceCodePath) {
        userMessage += ` code:"${workspaceCodePath}"`;
      }
      if (workspaceLogPath) {
        userMessage += ` log:"${workspaceLogPath}"`;
      }
      userMessage += ` knowledge:"${KNOWLEDGE_DIR}"`;
    }

    // 使用 JSON 格式的消息
    const message = JSON.stringify([
      { role: 'user', content: userMessage }
    ]);

    console.log('[Claude] Sending message:', userMessage.substring(0, 200) + (userMessage.length > 200 ? '...' : ''));
    claudeProcess.stdin?.write(message + '\n');

    // 延迟关闭 stdin，给 CLI 时间处理权限请求
    // 如果立即关闭，CLI 将无法等待用户批准权限
    setTimeout(() => {
      if (claudeProcess && !claudeProcess.killed) {
        console.log('[Claude] Closing stdin after timeout');
        claudeProcess.stdin?.end();
      }
    }, 5000); // 5秒后关闭 stdin，给足够时间处理权限

    claudeProcess.stdout?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      console.log('[Claude] stdout:', chunk.substring(0, 200));
      output += chunk;
      mainWindow?.webContents.send('analysis-progress', chunk);
    });

    claudeProcess.stderr?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      console.log('[Claude] stderr:', chunk.substring(0, 200));
      errorOutput += chunk;
    });

    claudeProcess.on('close', (code: number | null) => {
      if (isResolved) return;

      // 清除超时定时器
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }

      console.log('[Claude] Process closed with code:', code);
      console.log('[Claude] Output length:', output.length, 'Error length:', errorOutput.length);

      // 清除进程引用
      currentClaudeProcess = null;

      // 通知渲染进程：Claude 已停止
      mainWindow?.webContents.send('claude-status-changed', { isRunning: false });

      // 清理临时文件
      if (workspaceCodePath && fs.existsSync(workspaceCodePath)) {
        try { fs.unlinkSync(workspaceCodePath); } catch (e) { /* ignore */ }
      }
      if (workspaceLogPath && fs.existsSync(workspaceLogPath)) {
        try { fs.unlinkSync(workspaceLogPath); } catch (e) { /* ignore */ }
      }

      // 判断是否成功：如果有输出内容且没有错误，或者退出代码是0，都视为成功
      const hasOutput = output.length > 0;
      const hasError = errorOutput.length > 0;
      const normalExit = code === 0;

      console.log('[Claude] hasOutput:', hasOutput, 'hasError:', hasError, 'normalExit:', normalExit);

      // 标记为已处理
      isResolved = true;

      if ((normalExit || (hasOutput && !hasError)) && output.length > 100) {
        // 有足够的输出内容，视为成功
        console.log('[Claude] Analysis completed successfully');
        resolve(output);
      } else if (hasError) {
        // 有错误输出
        console.log('[Claude] Analysis failed with error');
        reject(new Error(`Claude 执行失败\n${errorOutput}`));
      } else {
        // 其他情况
        console.log('[Claude] Analysis failed - unknown reason');
        reject(new Error(`Claude 异常退出，代码: ${code}\n输出长度: ${output.length}`));
      }
    });

    // 超时保护 - 5分钟后
    timeoutHandle = setTimeout(() => {
      if (isResolved) return;

      console.log('[Claude] Analysis timeout');
      console.log('[Claude] Current output length:', output.length);

      // 如果已经有足够的输出，视为成功
      if (output.length > 100) {
        console.log('[Claude] Timeout but has output, treating as success');
        isResolved = true;
        resolve(output);
        // 杀死进程
        if (currentClaudeProcess) {
          currentClaudeProcess.kill();
          currentClaudeProcess = null;
        }
        mainWindow?.webContents.send('claude-status-changed', { isRunning: false });
      } else {
        // 没有足够的输出，视为失败
        console.log('[Claude] Timeout with no sufficient output');
        isResolved = true;
        if (currentClaudeProcess) {
          currentClaudeProcess.kill();
          currentClaudeProcess = null;
        }
        mainWindow?.webContents.send('claude-status-changed', { isRunning: false });
        reject(new Error('分析超时 (5分钟) - 可能是 API 无响应或任务过于复杂'));
      }
    }, 5 * 60 * 1000);
  });
}

// ==================== 协议处理 ====================

/**
 * 注册自定义协议用于加载本地文件
 * 解决 ES 模块在 file:// 协议下的 CORS 问题
 */
function registerProtocols(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app',
      privileges: {
        secure: true,
        standard: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true
      }
    }
  ]);
}

/**
 * 处理自定义协议请求 - 使用 protocol.handle API（ES模块更可靠）
 */
function setupProtocolHandler(): void {
  protocol.handle('app', async (request) => {
    // 获取 URL 路径，移除 'app://'
    let url = request.url.substring(6);

    // 移除开头的斜杠
    if (url.startsWith('/')) {
      url = url.substring(1);
    }

    // 处理根路径
    if (url === '' || url === '/') {
      url = 'index.html';
    }

    // 处理 index.html/ (带尾部斜杠) 的情况
    if (url === 'index.html/' || url === 'index.html') {
      url = 'index.html';
    } else if (url.startsWith('index.html/')) {
      // 处理相对路径问题：当浏览器将 index.html 视为目录时
      // 例如：app://index.html/assets/xxx.js -> 需要变成 assets/xxx.js
      url = url.substring('index.html/'.length);
    }

    const resolvedPath = path.normalize(path.join(__dirname, '..', 'renderer', url));

    console.log('[Protocol] Request:', request.url, '->', resolvedPath);

    try {
      const data = await fs.promises.readFile(resolvedPath);

      // 设置正确的 MIME 类型
      const ext = path.extname(url).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject'
      };

      const contentType = mimeTypes[ext] || 'application/octet-stream';

      // 返回带有正确头的响应
      return new Response(data, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp'
        }
      });
    } catch (error) {
      console.error('[Protocol] Error loading file:', resolvedPath, error);
      return new Response('File not found: ' + url, { status: 404 });
    }
  });
}

// ==================== 窗口管理 ====================

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false
    },
    backgroundColor: '#1a1a2e',
    titleBarStyle: 'default'
  });

  // 开发模式加载本地文件，生产模式使用自定义协议
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    // 尝试连接开发服务器，如果失败则使用自定义协议加载打包文件
    mainWindow!.loadURL('http://localhost:5173')
      .then(() => {
        mainWindow!.webContents.openDevTools();
      })
      .catch(() => {
        // 开发服务器不可用，使用自定义协议加载
        mainWindow!.loadURL('app://index.html');
      });
  } else {
    // 生产模式使用自定义协议
    mainWindow!.loadURL('app://index.html');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ==================== IPC 处理程序 ====================

/**
 * 分析代码
 */
/**
 * 分析代码 - 使用内联提示词
 */
ipcMain.handle('analyze-code', async (_event, filePath: string) => {
  try {
    // 内联提示词，确保评估功能正确执行
    const prompt = `你是一位深度学习代码评估专家。请对以下代码进行全面评估：

**请使用中文进行所有分析和回复。**

## 评估任务

你必须完成以下评估：

1. **输入合理性评估**
   - 数据输入格式是否正确？
   - 数据增强是否合理？
   - batch size 是否适当？
   - 数据预处理是否遗漏步骤？

2. **Reward 预估**（如果是强化学习代码）
   - 根据 reward 函数设计，预估初始 reward 范围
   - 预估收敛后的 reward 水平
   - 判断 reward 设计是否有明显缺陷

3. **训练时间预估**
   - 基于数据集大小、模型复杂度、硬件配置，预估训练时间
   - 给出乐观、悲观、中性三种预估

4. **代码问题诊断**
   - 找出会导致训练失败的严重错误
   - 找出会影响性能的潜在问题
   - 给出具体的修改建议

5. **与最佳实践对比**
   - 检索知识库中相关论文和最佳实践
   - 对比代码与最新研究的差距

## 关键原则

1. **不要介绍代码**：用户知道代码在做什么，不需要你复述
2. **聚焦评估**：专注于判断、预估、发现
3. **给出预测**：必须有具体的数值预估
4. **指出问题**：必须有具体的问题诊断
5. **提供方案**：必须有可执行的修改建议

## 输出格式

请严格按照以下格式输出评估报告：

# 深度学习代码评估报告

## 一、代码类型识别

[识别代码属于哪类：CNN/Transformer/RNN/GAN/RL/其他]

## 二、输入合理性评估

### 数据输入
- **当前实现**：[描述数据输入方式]
- **评估结果**：✅合理 / ❌不合理 / ⚠️需改进
- **问题**：[指出存在的问题]
- **建议**：[具体改进建议]

### 数据预处理
- **当前实现**：[归一化、增强等]
- **评估结果**：✅合理 / ❌不合理 / ⚠️需改进
- **问题**：[指出存在的问题]
- **建议**：[具体改进建议]

### 超参数设置
- **Batch Size**：[评估是否合理]
- **Learning Rate**：[评估是否合理]
- **Optimizer**：[评估是否合理]

## 三、Reward 预估（强化学习）或训练效果预估（监督学习）

### Reward 函数分析
- **当前 Reward 设计**：[描述 reward 函数]
- **潜在问题**：[指出设计缺陷]

### 预估 Reward/准确率 范围
- **初始阶段**：预估约 [数值]
- **中期阶段**：预估约 [数值]
- **收敛后**：预估约 [数值]

## 四、训练时间预估

### 计算资源分析
- **模型参数量**：约 [数值]
- **训练数据量**：[数值]

### 时间预估
- **乐观估计**：[时间]
- **中性估计**：[时间]
- **悲观估计**：[时间]

### 加速建议
[给出可以加速训练的方法]

## 五、严重问题诊断

### 🔴 必须修复的问题

#### 问题 1：[标题]
- **位置**：[文件:行号或模块]
- **错误代码**：
  \`\`\`python
  [引用代码]
  \`\`\`
- **错误原因**：[解释为什么错误]
- **后果**：[会导致什么问题]
- **修复方案**：[给出具体代码]

[更多严重问题...]

## 六、潜在问题与优化

### 🟡 潜在问题
[列出影响性能或结果的问题]

### 💡 优化建议
[给出可以提升效果的优化]

## 七、参考论文建议

**重要：请使用 Grep 工具在知识库中搜索与代码相关的论文**

### 相关论文推荐

使用 Grep 工具搜索以下关键词，找到相关论文：
- 代码涉及的主要技术（如 Transformer, CNN, GAN, RL 等）
- 代码涉及的具体模块（如 attention, residual connection, batch norm 等）
- 代码涉及的任务类型（如 classification, detection, segmentation 等）

### 论文对比分析

对每篇相关论文，分析：

#### 论文 [论文标题]
- **相关度**：⭐⭐⭐⭐☆（1-5星）
- **论文核心贡献**：[一句话概括]
- **与代码的关系**：[说明这篇论文与用户代码的关系]
- **建议应用的技术**：
  - **技术点 1**：[描述技术点]
  - **如何应用到代码中**：[给出具体的修改建议]
  - **预期改进**：[应用后的预期效果]
- **代码中缺失的部分**：[指出代码中没有实现的内容]

#### 论文 [论文标题]
[同上格式]

### 优先阅读建议

基于代码的当前状态，建议优先阅读以下论文：
1. **[论文标题]** - 理由：[说明为什么优先]
2. **[论文标题]** - 理由：[说明为什么优先]

## 八、总结与建议

- **总体评分**：⭐⭐⭐☆☆
- **可行性**：✅可以训练 / ⚠️需要修改 / ❌不建议训练
- **下一步建议**：[给出具体的行动建议]

---

现在请读取代码文件："${filePath}"

使用 Read 工具读取代码内容，然后按照上述格式生成详细的评估报告。`;

    const result = await runClaudeAnalysis({
      codePath: filePath,
      skill: 'general',  // 使用通用模式
      customPrompt: prompt
    });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

/**
 * 分析代码 + 日志 - 使用内联提示词
 */
ipcMain.handle('analyze-with-log', async (_event, codePath: string, logPath: string) => {
  try {
    // 内联提示词，确保评估功能正确执行
    const prompt = `你是一位深度学习代码评估专家。请对以下代码和训练日志进行全面评估：

**请使用中文进行所有分析和回复。**

## 评估任务

1. **代码评估**：检查代码是否有问题
2. **日志分析**：分析训练过程是否正常
3. **效果预测**：基于当前趋势预测最终效果
4. **问题诊断**：找出训练中的问题
5. **改进建议**：给出具体的优化方案

## 输出格式

# 代码与训练日志评估报告

## 一、代码评估

[输入合理性评估、严重问题诊断]

## 二、训练日志分析

### Loss 曲线分析
- **当前趋势**：[描述 loss 变化]
- **是否正常**：✅正常 / ❌异常 / ⚠️需关注
- **预期最终 Loss**：约 [数值]

### 训练进度
- **已完成**：约 [百分比]
- **预计剩余时间**：[时间]

## 三、问题诊断

### 发现的问题
[列出训练中的问题]

### 解决方案
[给出具体的解决方案]

---

现在请：
1. 使用 Read 工具读取代码文件："${codePath}"
2. 使用 Read 工具读取日志文件："${logPath}"
3. 生成详细的评估报告`;

    const result = await runClaudeAnalysis({
      codePath,
      logPath,
      skill: 'general',  // 使用通用模式
      customPrompt: prompt
    });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

/**
 * 获取现有论文列表
 */
function getExistingPapers(): string[] {
  const papersDir = path.join(KNOWLEDGE_DIR, 'papers');
  if (!fs.existsSync(papersDir)) {
    return [];
  }

  const files = fs.readdirSync(papersDir).filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md');
  // 提取论文标题（去掉日期前缀）
  return files.map(f => {
    // 文件名格式：YYMMDD_论文标题.md
    const parts = f.split('_');
    if (parts.length > 1) {
      return parts.slice(1).join('_').replace('.md', '').toLowerCase();
    }
    return f.replace('.md', '').toLowerCase();
  });
}

/**
 * 爬取论文
 */
ipcMain.handle('fetch-papers', async (_event, count: number = 10, days: number = 7) => {
  try {
    // 获取现有论文列表，防止重复
    const existingPapers = getExistingPapers();
    console.log('[FetchPapers] Existing papers:', existingPapers.length);

    // 优化：只发送论文数量和几个示例，而不是完整列表
    // 让 AI 通过检查文件来判断是否重复
    const samplePapers = existingPapers.slice(0, 5);
    const sampleStr = samplePapers.length > 0
      ? samplePapers.map(p => `- ${p}`).join('\n')
      : '(无)';

    // 直接使用自然语言描述任务，不依赖skill系统
    const prompt = `请帮我完成以下任务：

**重要：请使用中文进行所有输出和文件内容。**

1. 使用 WebSearch 工具搜索 arXiv 上最近 ${days} 天的深度学习论文（关键词：deep learning, neural network, computer vision, NLP）
2. 选择 ${count} 篇最重要的论文

3. **重要：跳过已经存在于知识库中的论文**
   知识库目录：${KNOWLEDGE_DIR}/papers/
   现有论文数量：${existingPapers.length} 篇
   示例论文（前5篇）：
${sampleStr}
   （请通过查看目录中的文件来判断论文是否已存在，不要依赖此列表）

4. 对每篇新论文进行总结，包含：标题、作者、摘要（翻译成中文）、核心贡献
5. 将每篇论文的总结保存为独立的 markdown 文件到：${KNOWLEDGE_DIR}/papers/
6. 文件命名格式：YYMMDD_论文标题.md（如：260403_Transformer_Improvements.md）
7. 更新 ${KNOWLEDGE_DIR}/papers/README.md 文件，在末尾添加新论文的索引

请开始执行任务。只保存新论文，不要重复保存已存在的论文。所有摘要和总结请使用中文。`;

    const result = await runClaudeAnalysis({
      skill: 'general',  // 使用通用模式
      customPrompt: prompt
    });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

/**
 * 获取知识库状态
 */
ipcMain.handle('get-knowledge-status', async () => {
  const papersDir = path.join(KNOWLEDGE_DIR, 'papers');

  function countMarkdownFiles(dir: string): number {
    if (!fs.existsSync(dir)) return 0;
    let count = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += countMarkdownFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // 排除 README.md 文件
        if (entry.name.toLowerCase() !== 'readme.md') {
          count++;
        }
      }
    }
    return count;
  }

  const paperCount = countMarkdownFiles(papersDir);
  return {
    paperCount,
    knowledgePath: KNOWLEDGE_DIR,
    canEdit: true
  };
});

/**
 * 打开知识库文件夹
 */
ipcMain.handle('open-knowledge-folder', async () => {
  shell.openPath(KNOWLEDGE_DIR);
});

/**
 * 获取权限历史
 */
ipcMain.handle('get-permissions-history', async () => {
  return Array.from(permissions.values());
});

/**
 * 清除权限记录
 */
ipcMain.handle('clear-permissions', async () => {
  permissions.clear();
  if (fs.existsSync(PERMISSIONS_LOG)) {
    fs.unlinkSync(PERMISSIONS_LOG);
  }
  return { success: true };
});

/**
 * 停止当前运行的 Claude 进程
 */
ipcMain.handle('stop-claude', async () => {
  if (currentClaudeProcess) {
    try {
      currentClaudeProcess.kill();
      currentClaudeProcess = null;
      return { success: true, message: 'Claude 进程已停止' };
    } catch (error) {
      return { success: false, error: '停止进程失败' };
    }
  }
  return { success: false, error: '没有正在运行的 Claude 进程' };
});

/**
 * 获取当前运行状态
 */
ipcMain.handle('get-claude-status', async () => {
  return {
    isRunning: currentClaudeProcess !== null,
    hasApiKey: apiConfig.apiKey.length > 0,
    hasCustomUrl: !!apiConfig.baseUrl,
    provider: apiConfig.provider || 'anthropic',
    model: apiConfig.model || 'claude-sonnet-4-20250514'
  };
});

/**
 * 设置完整的 API 配置
 */
ipcMain.handle('set-api-config', async (_event, config: { apiKey?: string; baseUrl?: string; provider?: 'anthropic' | 'openai' | 'custom' | 'zhipu'; model?: string }) => {
  setApiConfig(config);
  return { success: true };
});

/**
 * 设置 API Key（保留向后兼容）
 */
ipcMain.handle('set-api-key', async (_event, apiKey: string) => {
  setApiKey(apiKey);
  return { success: true };
});

/**
 * 获取 API 配置（不返回完整的 key，只返回掩码）
 */
ipcMain.handle('get-api-config', async () => {
  const config = getApiConfig();
  let maskedKey = '';
  if (config.apiKey) {
    maskedKey = config.apiKey.length > 8
      ? `${config.apiKey.substring(0, 4)}...${config.apiKey.substring(config.apiKey.length - 4)}`
      : '****';
  }
  return {
    success: true,
    apiKey: maskedKey,
    baseUrl: config.baseUrl || '',
    provider: config.provider || 'anthropic',
    model: config.model || '',
    hasKey: !!config.apiKey
  };
});

/**
 * 获取 API Key（保留向后兼容，返回部分掩码）
 */
ipcMain.handle('get-api-key', async () => {
  const key = getApiKey();
  if (key) {
    // 返回部分掩码的key，只显示前4位和后4位
    const maskedKey = key.length > 8
      ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
      : '****';
    return { success: true, apiKey: maskedKey, hasKey: true };
  }
  return { success: true, apiKey: '', hasKey: false };
});

// ==================== 应用生命周期 ====================

// 必须在 app.whenReady() 之前注册协议方案
registerProtocols();

app.whenReady().then(() => {
  setupProtocolHandler();
  initDirectories();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  // 清理临时文件
  if (fs.existsSync(TEMP_DIR)) {
    try {
      const files = fs.readdirSync(TEMP_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(TEMP_DIR, file));
      }
    } catch (e) {
      console.warn('清理临时文件失败:', e);
    }
  }
});
