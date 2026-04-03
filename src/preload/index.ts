/**
 * DL-Code-Tutor - Preload 脚本
 * 安全地暴露 API 给渲染进程
 */

import { contextBridge, ipcRenderer } from 'electron';

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

  // 事件监听
  onPermissionRequest: (callback: (request: any) => void) => {
    ipcRenderer.on('permission-request', (_event, request) => callback(request));
  },
  respondToPermission: (response: any) => {
    ipcRenderer.send('permission-response', response);
  },
  onAnalysisProgress: (callback: (progress: string) => void) => {
    ipcRenderer.on('analysis-progress', (_event, progress) => callback(progress));
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
