/**
 * DL-Code-Tutor - Preload 脚本
 * 安全地暴露 API 给渲染进程
 */

const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  // 分析相关
  analyzeCode: (filePath: string) => ipcRenderer.invoke('analyze-code', filePath),
  analyzeWithLog: (codePath: string, logPath: string) =>
    ipcRenderer.invoke('analyze-with-log', codePath, logPath),

  // 知识库相关
  fetchPapers: (count: number, days: number) =>
    ipcRenderer.invoke('fetch-papers', count, days),
  getKnowledgeStatus: () => ipcRenderer.invoke('get-knowledge-status'),
  openKnowledgeFolder: () => ipcRenderer.invoke('open-knowledge-folder'),

  // 权限相关
  getPermissionsHistory: () => ipcRenderer.invoke('get-permissions-history'),
  clearPermissions: () => ipcRenderer.invoke('clear-permissions'),

  // 进程控制
  stopClaude: () => ipcRenderer.invoke('stop-claude'),
  getClaudeStatus: () => ipcRenderer.invoke('get-claude-status'),

  // API 配置管理
  setApiConfig: (config: { apiKey?: string; baseUrl?: string; provider?: string; model?: string }) =>
    ipcRenderer.invoke('set-api-config', config),
  getApiConfig: () => ipcRenderer.invoke('get-api-config'),
  setApiKey: (apiKey: string) => ipcRenderer.invoke('set-api-key', apiKey),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),

  // 智谱AI 快捷配置
  setZhipuConfig: (apiKey: string) =>
    ipcRenderer.invoke('set-api-config', {
      apiKey,
      provider: 'zhipu',
      baseUrl: 'https://open.bigmodel.cn/api/anthropic',
      model: 'glm-4.7'
    }),

  // 事件监听
  onPermissionRequest: (callback: (request: any) => void) => {
    ipcRenderer.on('permission-request', (_event: any, request: any) => callback(request));
  },
  respondToPermission: (response: any) => {
    ipcRenderer.send('permission-response', response);
  },
  onAnalysisProgress: (callback: (progress: string) => void) => {
    ipcRenderer.on('analysis-progress', (_event: any, progress: any) => callback(progress));
  },
  onClaudeStatusChanged: (callback: (status: { isRunning: boolean }) => void) => {
    ipcRenderer.on('claude-status-changed', (_event: any, status: any) => callback(status));
  }
};

// 暴露给渲染进程
contextBridge.exposeInMainWorld('electron', electronAPI);

// TypeScript 类型声明
declare global {
  interface Window {
    electron: typeof electronAPI;
  }
}

export type {};
