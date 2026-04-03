/**
 * DL-Code-Tutor - Electron 主进程
 * 深度学习代码导师
 */

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

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
}

// ==================== 全局变量 ====================

let mainWindow: BrowserWindow | null = null;
let permissions: Map<string, PermissionRecord> = new Map();

// 目录路径（在 initDirectories 中初始化）
let PROGRAM_DIR: string = '';
let WORKSPACE_DIR: string = '';
let KNOWLEDGE_DIR: string = '';
let SKILLS_DIR: string = '';
let TEMP_DIR: string = '';
let PERMISSIONS_LOG: string = '';

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

  // 方案3：在程序目录下创建 data 文件夹
  if (app.isPackaged) {
    return path.join(appPath, 'data');
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

  // 第二步：创建目录结构
  initProgramDirectories();

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
      allow: [`${PROGRAM_DIR}/**/*`],
      deny: ['**/*'],
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
 * 运行 Claude 分析
 */
async function runClaudeAnalysis(options: AnalysisOptions): Promise<string> {
  const workspaceCodePath = options.codePath ? await prepareFileForAnalysis(options.codePath) : null;
  const workspaceLogPath = options.logPath ? await prepareFileForAnalysis(options.logPath) : null;

  return new Promise((resolve, reject) => {
    const claudeEnv = {
      ...process.env,
      CLAUDE_CONFIG_DIR: path.join(WORKSPACE_DIR, '.claude'),
      CLAUDE_SKILLS_PATH: SKILLS_DIR,
      HOME: WORKSPACE_DIR,
      USERPROFILE: WORKSPACE_DIR
    };

    const claude = spawn('claude', [], {
      cwd: WORKSPACE_DIR,
      env: claudeEnv,
      shell: true
    });

    let output = '';
    let errorOutput = '';

    let command = `/skill:${options.skill}`;
    if (workspaceCodePath) {
      command += ` code:"${workspaceCodePath}"`;
    }
    if (workspaceLogPath) {
      command += ` log:"${workspaceLogPath}"`;
    }
    command += ` knowledge:"${KNOWLEDGE_DIR}"`;

    claude.stdin?.write(command + '\n');

    claude.stdout?.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      mainWindow?.webContents.send('analysis-progress', chunk);
    });

    claude.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    claude.on('close', (code) => {
      // 清理临时文件
      if (workspaceCodePath && fs.existsSync(workspaceCodePath)) {
        try { fs.unlinkSync(workspaceCodePath); } catch (e) { /* ignore */ }
      }
      if (workspaceLogPath && fs.existsSync(workspaceLogPath)) {
        try { fs.unlinkSync(workspaceLogPath); } catch (e) { /* ignore */ }
      }

      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Claude 退出，代码: ${code}\n${errorOutput}`));
      }
    });

    // 超时保护
    setTimeout(() => {
      claude.kill();
      reject(new Error('分析超时 (5分钟)'));
    }, 5 * 60 * 1000);
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
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    backgroundColor: '#1a1a2e',
    titleBarStyle: 'default'
  });

  // 开发模式加载本地文件，生产模式加载打包后的文件
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ==================== IPC 处理程序 ====================

/**
 * 分析代码
 */
ipcMain.handle('analyze-code', async (_event, filePath: string) => {
  try {
    const result = await runClaudeAnalysis({
      codePath: filePath,
      skill: 'code-tutor'
    });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

/**
 * 分析代码 + 日志
 */
ipcMain.handle('analyze-with-log', async (_event, codePath: string, logPath: string) => {
  try {
    const result = await runClaudeAnalysis({
      codePath,
      logPath,
      skill: 'code-tutor'
    });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

/**
 * 爬取论文
 */
ipcMain.handle('fetch-papers', async (_event, count: number = 10, days: number = 7) => {
  try {
    const result = await runClaudeAnalysis({
      skill: 'fetch-papers'
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
  if (fs.existsSync(papersDir)) {
    const files = fs.readdirSync(papersDir).filter(f => f.endsWith('.md'));
    return {
      paperCount: files.length,
      knowledgePath: KNOWLEDGE_DIR,
      canEdit: true
    };
  }
  return { paperCount: 0, knowledgePath: KNOWLEDGE_DIR, canEdit: true };
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
 * 响应权限请求
 */
ipcMain.on('permission-response', (_event, response: any) => {
  ipcMain.emit('permission-response', response);
});

// ==================== 应用生命周期 ====================

app.whenReady().then(() => {
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
