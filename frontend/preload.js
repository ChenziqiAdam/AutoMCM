const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  listWorkspaces: () => ipcRenderer.invoke('list-workspaces'),
  loadWorkspace: (workspaceName) => ipcRenderer.invoke('load-workspace', workspaceName),
  saveAutomcm: (workspaceName, content) => ipcRenderer.invoke('save-automcm', workspaceName, content),
  createWorkspace: (workspaceName, problemData) => ipcRenderer.invoke('create-workspace', workspaceName, problemData),
  readArtifact: (workspaceName, artifactName) => ipcRenderer.invoke('read-artifact', workspaceName, artifactName),
  saveWorkflowState: (workspaceName, state) => ipcRenderer.invoke('save-workflow-state', workspaceName, state),
  loadWorkflowState: (workspaceName) => ipcRenderer.invoke('load-workflow-state', workspaceName),
  openPDF: (workspaceName, filename) => ipcRenderer.invoke('open-pdf', workspaceName, filename),

  // PDF and data upload operations
  uploadProblemPDF: (workspaceName) => ipcRenderer.invoke('upload-problem-pdf', workspaceName),
  getProblemStatement: (workspaceName) => ipcRenderer.invoke('get-problem-statement', workspaceName),
  uploadDataFile: (workspaceName) => ipcRenderer.invoke('upload-data-file', workspaceName),
  listDataFiles: (workspaceName) => ipcRenderer.invoke('list-data-files', workspaceName),
  deleteDataFile: (workspaceName, filename) => ipcRenderer.invoke('delete-data-file', workspaceName, filename),
  getDataSummary: (workspaceName) => ipcRenderer.invoke('get-data-summary', workspaceName),

  // Agent operations
  initAgentService: () => ipcRenderer.invoke('init-agent-service'),
  runPlanningPhase: (workspaceName, problemStatement) => ipcRenderer.invoke('run-planning-phase', workspaceName, problemStatement),
  runModelingPhase: (workspaceName, plan) => ipcRenderer.invoke('run-modeling-phase', workspaceName, plan),
  runWritingPhase: (workspaceName) => ipcRenderer.invoke('run-writing-phase', workspaceName),
  runCompleteWorkflow: (workspaceName, problemStatement) => ipcRenderer.invoke('run-complete-workflow', workspaceName, problemStatement),
  getAgentStatus: () => ipcRenderer.invoke('get-agent-status'),
  stopAgent: () => ipcRenderer.invoke('stop-agent'),

  // Event listeners for agent updates
  onAgentLog: (callback) => ipcRenderer.on('agent-log', (event, data) => callback(data)),
  onPhaseChange: (callback) => ipcRenderer.on('phase-change', (event, phase) => callback(phase)),
  onAgentError: (callback) => ipcRenderer.on('agent-error', (event, error) => callback(error)),
  onArtifactCreated: (callback) => ipcRenderer.on('artifact-created', (event, data) => callback(data)),
  onProgressUpdate: (callback) => ipcRenderer.on('progress-update', (event, data) => callback(data)),
  onEquationsExtracted: (callback) => ipcRenderer.on('equations-extracted', (event, equations) => callback(equations)),
  onSensitivityResults: (callback) => ipcRenderer.on('sensitivity-results', (event, data) => callback(data)),
  onValidationUpdate: (callback) => ipcRenderer.on('validation-update', (event, status) => callback(status)),
});
