import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import AgentService from '../src/core/agent-service.js';
import PDFParser from '../src/utils/pdf-parser.js';
import DataManager from '../src/utils/data-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global agent service instance
let agentService = null;

let mainWindow;

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('Preload path:', preloadPath);
  console.log('__dirname:', __dirname);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    },
    title: 'AutoMCM - Mathematical Contest Modeling Workspace'
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

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

// IPC Handlers
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-workspaces', async () => {
  try {
    const workspaceDir = path.join(__dirname, '..', 'workspace');
    const entries = await fs.readdir(workspaceDir, { withFileTypes: true });
    const workspaces = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
    return { success: true, workspaces };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-workspace', async (event, workspaceName) => {
  try {
    const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);
    const automcmPath = path.join(workspacePath, 'AUTOMCM.md');

    const content = await fs.readFile(automcmPath, 'utf-8');

    // Load artifacts
    const artifactsPath = path.join(workspacePath, 'artifacts');
    const artifacts = [];
    try {
      const files = await fs.readdir(artifactsPath);
      for (const file of files) {
        if (file !== 'index.json') {
          artifacts.push(file);
        }
      }
    } catch (err) {
      // No artifacts yet
    }

    return {
      success: true,
      content,
      workspacePath,
      artifacts
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-automcm', async (event, workspaceName, content) => {
  try {
    const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);
    const automcmPath = path.join(workspacePath, 'AUTOMCM.md');
    await fs.writeFile(automcmPath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-workspace', async (event, workspaceName, problemData) => {
  try {
    const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);

    // Check if workspace already exists
    try {
      await fs.access(workspacePath);
      return { success: false, error: 'Workspace already exists' };
    } catch {
      // Workspace doesn't exist, proceed
    }

    // Initialize workspace using AgentService
    const service = new AgentService();
    await service.initializeWorkspace(workspacePath, problemData || {
      title: workspaceName,
      description: ''
    });

    return { success: true, workspacePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Agent execution handlers
ipcMain.handle('init-agent-service', async () => {
  try {
    agentService = new AgentService();

    // Setup event listeners to stream logs to frontend
    agentService.on('log', (logData) => {
      mainWindow?.webContents.send('agent-log', logData);
    });

    agentService.on('phase-change', (phase) => {
      mainWindow?.webContents.send('phase-change', phase);
    });

    agentService.on('error', (error) => {
      mainWindow?.webContents.send('agent-error', error.message);
    });

    agentService.on('artifact-created', (data) => {
      mainWindow?.webContents.send('artifact-created', data);
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('run-planning-phase', async (event, workspaceName, problemStatement) => {
  try {
    if (!agentService) {
      agentService = new AgentService();
    }

    const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);

    // Initialize workspace if not already done
    if (!agentService.masterAgent) {
      await agentService.initializeWorkspace(workspacePath, {
        title: 'MCM Problem',
        description: problemStatement.substring(0, 200)
      });
    }

    // Execute planning phase
    const result = await agentService.executePlanningPhase(problemStatement);

    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('run-modeling-phase', async (event, workspaceName, plan) => {
  try {
    if (!agentService) {
      agentService = new AgentService();

      // Setup event listeners
      agentService.on('log', (logData) => {
        mainWindow?.webContents.send('agent-log', logData);
      });

      agentService.on('phase-change', (phase) => {
        mainWindow?.webContents.send('phase-change', phase);
      });

      agentService.on('error', (error) => {
        mainWindow?.webContents.send('agent-error', error.message);
      });

      agentService.on('artifact-created', (data) => {
        mainWindow?.webContents.send('artifact-created', data);
      });

      agentService.on('equations-extracted', (equations) => {
        mainWindow?.webContents.send('equations-extracted', equations);
      });

      agentService.on('sensitivity-results', (data) => {
        mainWindow?.webContents.send('sensitivity-results', data);
      });

      agentService.on('validation-update', (status) => {
        mainWindow?.webContents.send('validation-update', status);
      });
    }

    // Load workspace if not initialized
    if (!agentService.masterAgent) {
      const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);
      await agentService.initializeWorkspace(workspacePath, {
        title: 'MCM Problem'
      });
    }

    const result = await agentService.executeModelingPhase(plan);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('run-writing-phase', async (event, workspaceName) => {
  try {
    if (!agentService) {
      agentService = new AgentService();

      // Setup event listeners
      agentService.on('log', (logData) => {
        mainWindow?.webContents.send('agent-log', logData);
      });

      agentService.on('phase-change', (phase) => {
        mainWindow?.webContents.send('phase-change', phase);
      });

      agentService.on('error', (error) => {
        mainWindow?.webContents.send('agent-error', error.message);
      });

      agentService.on('artifact-created', (data) => {
        mainWindow?.webContents.send('artifact-created', data);
      });
    }

    // Load workspace if not initialized
    if (!agentService.masterAgent) {
      const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);
      await agentService.initializeWorkspace(workspacePath, {
        title: 'MCM Problem'
      });
    }

    const result = await agentService.executeWritingPhase();
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('run-complete-workflow', async (event, workspaceName, problemStatement) => {
  try {
    if (!agentService) {
      agentService = new AgentService();

      // Setup event listeners
      agentService.on('log', (logData) => {
        mainWindow?.webContents.send('agent-log', logData);
      });

      agentService.on('phase-change', (phase) => {
        mainWindow?.webContents.send('phase-change', phase);
      });

      agentService.on('error', (error) => {
        mainWindow?.webContents.send('agent-error', error.message);
      });

      agentService.on('artifact-created', (data) => {
        mainWindow?.webContents.send('artifact-created', data);
      });
    }

    const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);

    const result = await agentService.runCompleteWorkflow(
      workspacePath,
      { title: 'MCM Problem', description: problemStatement.substring(0, 200) },
      problemStatement
    );

    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-agent-status', async () => {
  if (!agentService) {
    return { success: true, status: { isRunning: false, phase: 'idle', hasWorkspace: false } };
  }
  return { success: true, status: agentService.getStatus() };
});

ipcMain.handle('stop-agent', async () => {
  if (agentService) {
    agentService.stop();
  }
  return { success: true };
});

ipcMain.handle('read-artifact', async (event, workspaceName, artifactName) => {
  try {
    const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);
    // Support reading from workspace root with ../ prefix
    const artifactPath = artifactName.startsWith('../')
      ? path.join(workspacePath, artifactName.substring(3))
      : path.join(workspacePath, 'artifacts', artifactName);
    const content = await fs.readFile(artifactPath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-workflow-state', async (event, workspaceName, state) => {
  try {
    const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);
    const statePath = path.join(workspacePath, '.workflow-state.json');
    await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-workflow-state', async (event, workspaceName) => {
  try {
    const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);
    const statePath = path.join(workspacePath, '.workflow-state.json');
    const content = await fs.readFile(statePath, 'utf-8');
    const state = JSON.parse(content);
    return { success: true, state };
  } catch (error) {
    // File might not exist yet
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-pdf', async (event, workspaceName, filename) => {
  try {
    const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);
    const pdfPath = path.join(workspacePath, filename);
    await shell.openPath(pdfPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// PDF extraction handlers
ipcMain.handle('upload-problem-pdf', async (event, workspaceName) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select MCM Problem PDF',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'No file selected' };
    }

    const pdfPath = result.filePaths[0];
    const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);

    // Parse PDF
    const parser = new PDFParser();
    const problemData = await parser.extractProblemStatement(pdfPath);

    // Save to workspace
    await parser.saveProblemToWorkspace(workspacePath, problemData);

    // Copy original PDF
    const pdfFilename = path.basename(pdfPath);
    const destPdfPath = path.join(workspacePath, 'problem.pdf');
    await fs.copyFile(pdfPath, destPdfPath);

    // Update AUTOMCM.md to reference the problem
    const automcmPath = path.join(workspacePath, 'AUTOMCM.md');
    try {
      let automcmContent = await fs.readFile(automcmPath, 'utf-8');
      // Replace the placeholder problem statement with reference to problem.md
      automcmContent = automcmContent.replace(
        /## Problem Statement\s*\nTo be filled in during planning/,
        `## Problem Statement\n**See problem.md for the full problem statement**\n\nThe actual MCM problem has been extracted from the uploaded PDF and saved to problem.md in this workspace. All agents will receive the problem content from problem.md during execution.`
      );
      await fs.writeFile(automcmPath, automcmContent, 'utf-8');
    } catch (error) {
      console.warn('Could not update AUTOMCM.md:', error.message);
    }

    return {
      success: true,
      problemStatement: problemData.problemStatement,
      metadata: problemData.metadata
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-problem-statement', async (event, workspaceName) => {
  try {
    const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);
    const problemFile = path.join(workspacePath, 'problem.md');
    const content = await fs.readFile(problemFile, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: 'No problem uploaded yet' };
  }
});

// Data upload handlers
ipcMain.handle('upload-data-file', async (event, workspaceName) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Upload Data File',
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'Text Files', extensions: ['txt', 'dat'] }
      ],
      properties: ['openFile', 'multiSelections']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'No file selected' };
    }

    const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);
    const dataManager = new DataManager(workspacePath);

    const uploadedFiles = [];
    for (const filePath of result.filePaths) {
      const uploadResult = await dataManager.uploadFile(filePath);
      uploadedFiles.push(uploadResult);
    }

    return { success: true, files: uploadedFiles };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-data-files', async (event, workspaceName) => {
  try {
    const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);
    const dataManager = new DataManager(workspacePath);
    const files = dataManager.listFiles();
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-data-file', async (event, workspaceName, filename) => {
  try {
    const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);
    const dataManager = new DataManager(workspacePath);
    const deleted = dataManager.deleteFile(filename);
    return { success: deleted };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-data-summary', async (event, workspaceName) => {
  try {
    const workspacePath = path.join(__dirname, '..', 'workspace', workspaceName);
    const dataManager = new DataManager(workspacePath);
    const summary = dataManager.getSummary();
    return { success: true, summary };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
