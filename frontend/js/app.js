// State
let currentWorkspace = null;
let editorContent = '';
let agentRunning = false;
let planResult = null;
let workflowState = {
  planningComplete: false,
  modelingComplete: false,
  writingComplete: false,
  analysisData: {
    equations: [],
    validation: {
      dimensional: null,
      sensitivity: null,
      variable: null
    },
    sensitivityResults: null
  }
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  initEditor();
  initConsole();
  initPreview();
  initResizers();
  await loadWorkspaceList();
  setupEventListeners();
  setupAgentListeners();
  logToConsole('info', 'AutoMCM Frontend initialized');
});

// Editor Management
function initEditor() {
  const editorDiv = document.getElementById('editor');

  // Create a simple textarea for now
  const textarea = document.createElement('textarea');
  textarea.id = 'editor-textarea';
  textarea.style.cssText = `
    width: 100%;
    height: 100%;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    border: none;
    resize: none;
    padding: 16px;
    font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
  `;
  textarea.placeholder = 'Load a workspace to edit AUTOMCM.md...';

  editorDiv.appendChild(textarea);

  textarea.addEventListener('input', (e) => {
    editorContent = e.target.value;
    updatePreview(editorContent);
  });
}

// Console Management
function initConsole() {
  const consoleOutput = document.getElementById('console-output');
  consoleOutput.innerHTML = '';
}

// Resizer Management
function initResizers() {
  const resizers = document.querySelectorAll('.resizer');
  const panels = document.querySelectorAll('.panel');

  resizers.forEach((resizer, index) => {
    let isResizing = false;
    let startX = 0;
    let startWidthLeft = 0;
    let startWidthRight = 0;
    let leftPanel, rightPanel;

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;

      leftPanel = resizer.previousElementSibling;
      rightPanel = resizer.nextElementSibling;

      // Skip non-panel elements
      while (leftPanel && !leftPanel.classList.contains('panel')) {
        leftPanel = leftPanel.previousElementSibling;
      }
      while (rightPanel && !rightPanel.classList.contains('panel')) {
        rightPanel = rightPanel.nextElementSibling;
      }

      if (leftPanel && rightPanel) {
        startWidthLeft = leftPanel.offsetWidth;
        startWidthRight = rightPanel.offsetWidth;
        resizer.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing || !leftPanel || !rightPanel) return;

      const dx = e.clientX - startX;
      const newWidthLeft = startWidthLeft + dx;
      const newWidthRight = startWidthRight - dx;

      // Enforce minimum widths
      if (newWidthLeft >= 200 && newWidthRight >= 200) {
        leftPanel.style.flex = `0 0 ${newWidthLeft}px`;
        rightPanel.style.flex = `0 0 ${newWidthRight}px`;
      }
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizer.classList.remove('resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  });
}

function logToConsole(type, message) {
  const consoleOutput = document.getElementById('console-output');
  const entry = document.createElement('div');
  entry.className = 'console-entry';

  const timestamp = new Date().toLocaleTimeString();

  entry.innerHTML = `
    <span class="console-timestamp">[${timestamp}]</span>
    <span class="console-type ${type}">${type.toUpperCase()}</span>
    <span class="console-message">${message}</span>
  `;

  consoleOutput.appendChild(entry);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function clearConsole() {
  const consoleOutput = document.getElementById('console-output');
  consoleOutput.innerHTML = '';
  logToConsole('info', 'Console cleared');
}

// Preview Management
function initPreview() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `preview-${tabName}`);
  });

  // Load paper when switching to paper tab
  if (tabName === 'paper' && currentWorkspace) {
    loadPaperPreview();
  }

  // Load analysis when switching to analysis tab
  if (tabName === 'analysis' && currentWorkspace) {
    restoreAnalysisData();
  }
}

function updatePreview(markdownContent) {
  const preview = document.getElementById('preview-rendered');

  // Configure marked for GFM (GitHub Flavored Markdown) with tables
  marked.setOptions({
    gfm: true,
    breaks: true,
    tables: true
  });

  // Pre-process: protect LaTeX from markdown parser
  const latexBlocks = [];

  // First, protect display math $$...$$ (must be done before inline)
  let protected = markdownContent.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
    const id = latexBlocks.length;
    latexBlocks.push({ type: 'display', tex: tex.trim() });
    return `___LATEX_BLOCK_${id}___`;
  });

  // Then protect inline math $...$ (but not escaped \$)
  protected = protected.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (match, tex) => {
    const id = latexBlocks.length;
    latexBlocks.push({ type: 'inline', tex: tex.trim() });
    return `___LATEX_INLINE_${id}___`;
  });

  // Convert markdown to HTML
  let html = marked.parse(protected);

  // Restore and render LaTeX
  html = html.replace(/___LATEX_BLOCK_(\d+)___/g, (match, id) => {
    const block = latexBlocks[parseInt(id)];
    try {
      return katex.renderToString(block.tex, {
        throwOnError: false,
        displayMode: block.type === 'display',
        strict: false
      });
    } catch (e) {
      return `<span style="color: red;">LaTeX Error: ${e.message}</span>`;
    }
  });

  html = html.replace(/___LATEX_INLINE_(\d+)___/g, (match, id) => {
    const block = latexBlocks[parseInt(id)];
    try {
      return katex.renderToString(block.tex, {
        throwOnError: false,
        displayMode: false,
        strict: false
      });
    } catch (e) {
      return `<span style="color: red;">LaTeX Error: ${e.message}</span>`;
    }
  });

  preview.innerHTML = html;
}

// Removed - LaTeX rendering now handled in updatePreview()

// Workspace Management
async function loadWorkspaceList() {
  try {
    const result = await window.electronAPI.listWorkspaces();

    if (result.success) {
      const select = document.getElementById('workspace-select');
      select.innerHTML = '<option value="">Select Workspace...</option>';

      result.workspaces.forEach(workspace => {
        const option = document.createElement('option');
        option.value = workspace;
        option.textContent = workspace;
        select.appendChild(option);
      });

      logToConsole('success', `Loaded ${result.workspaces.length} workspaces`);
    } else {
      logToConsole('error', `Failed to load workspaces: ${result.error}`);
    }
  } catch (error) {
    logToConsole('error', `Error loading workspaces: ${error.message}`);
  }
}

function createNewWorkspace() {
  // Show modal
  const modal = document.getElementById('new-workspace-modal');
  const input = document.getElementById('workspace-name-input');
  input.value = '';
  modal.style.display = 'flex';
  input.focus();
}

async function handleCreateWorkspace() {
  const modal = document.getElementById('new-workspace-modal');
  const input = document.getElementById('workspace-name-input');
  const workspaceName = input.value.trim();

  if (!workspaceName) {
    logToConsole('error', 'Please enter a workspace name');
    return;
  }

  // Validate workspace name
  if (!/^[a-zA-Z0-9_-]+$/.test(workspaceName)) {
    logToConsole('error', 'Invalid workspace name. Use only letters, numbers, dashes, and underscores.');
    return;
  }

  // Hide modal
  modal.style.display = 'none';

  try {
    logToConsole('info', `Creating workspace: ${workspaceName}`);

    const result = await window.electronAPI.createWorkspace(workspaceName, {
      title: workspaceName,
      description: ''
    });

    if (result.success) {
      logToConsole('success', `Workspace created: ${workspaceName}`);
      await loadWorkspaceList();

      // Auto-select the new workspace
      const select = document.getElementById('workspace-select');
      select.value = workspaceName;
      await loadWorkspace(workspaceName);
    } else {
      logToConsole('error', `Failed to create workspace: ${result.error}`);
    }
  } catch (error) {
    logToConsole('error', `Error creating workspace: ${error.message}`);
  }
}

function closeModal() {
  const modal = document.getElementById('new-workspace-modal');
  modal.style.display = 'none';
}

async function loadWorkspace(workspaceName) {
  try {
    logToConsole('info', `Loading workspace: ${workspaceName}`);

    // Clear previous workspace data immediately
    currentWorkspace = null;

    // Reset workflow state to defaults
    workflowState = {
      planningComplete: false,
      modelingComplete: false,
      writingComplete: false,
      analysisData: {
        equations: [],
        validation: {
          dimensional: null,
          sensitivity: null,
          variable: null
        },
        sensitivityResults: null
      }
    };
    planResult = null;

    // Clear UI components
    displayDataFiles([]);
    updateArtifactsList([]);
    document.getElementById('problem-info').innerHTML = '';
    clearConsole();
    clearAnalysisTab();

    const result = await window.electronAPI.loadWorkspace(workspaceName);

    if (result.success) {
      currentWorkspace = workspaceName;
      editorContent = result.content;

      // Update editor
      const textarea = document.getElementById('editor-textarea');
      textarea.value = result.content;

      // Update preview
      updatePreview(result.content);

      // Update artifacts
      updateArtifactsList(result.artifacts);

      // Load workflow state
      await loadWorkflowState(workspaceName);

      // Load data files for the new workspace
      await refreshDataFiles();

      // Restore analysis data if on Analysis tab
      const activeTab = document.querySelector('.tab-btn.active');
      if (activeTab && activeTab.getAttribute('data-tab') === 'analysis') {
        await restoreAnalysisData();
      }

      // Check for problem statement
      try {
        const problemResult = await window.electronAPI.getProblemStatement(workspaceName);
        if (problemResult.success) {
          // Try to load metadata
          let metadata = { pages: 'N/A', extractedAt: new Date().toISOString() };
          try {
            const metaFile = `../problem-metadata.json`;
            const metaResult = await window.electronAPI.readArtifact(workspaceName, metaFile);
            if (metaResult.success) {
              metadata = JSON.parse(metaResult.content);
            }
          } catch (e) {
            // Use defaults
          }

          displayProblemInfo({
            content: problemResult.content,
            metadata: metadata
          });
          logToConsole('info', '✓ Problem statement loaded from problem.md');
        }
      } catch (error) {
        // Problem not uploaded yet - clear the display
        document.getElementById('problem-info').innerHTML = '';
      }

      // Update status bar
      document.getElementById('status-workspace').textContent = `Workspace: ${workspaceName}`;

      logToConsole('success', `Loaded workspace: ${workspaceName}`);
    } else {
      logToConsole('error', `Failed to load workspace: ${result.error}`);
    }
  } catch (error) {
    logToConsole('error', `Error loading workspace: ${error.message}`);
  }
}

async function saveAutomcm() {
  if (!currentWorkspace) {
    logToConsole('warning', 'No workspace loaded');
    return;
  }

  try {
    logToConsole('info', 'Saving AUTOMCM.md...');

    const result = await window.electronAPI.saveAutomcm(currentWorkspace, editorContent);

    if (result.success) {
      logToConsole('success', 'AUTOMCM.md saved successfully');
    } else {
      logToConsole('error', `Failed to save: ${result.error}`);
    }
  } catch (error) {
    logToConsole('error', `Error saving: ${error.message}`);
  }
}

function updateArtifactsList(artifacts) {
  const artifactsList = document.getElementById('artifacts-list');
  artifactsList.innerHTML = '';

  if (artifacts.length === 0) {
    artifactsList.innerHTML = '<p style="color: var(--text-secondary)">No artifacts yet</p>';
    return;
  }

  artifacts.forEach(artifact => {
    const item = document.createElement('div');
    item.className = 'artifact-item';
    item.style.cursor = 'pointer';

    const ext = artifact.split('.').pop();
    const type = getArtifactType(ext);

    item.innerHTML = `
      <div class="artifact-name">${artifact}</div>
      <div class="artifact-type">${type}</div>
    `;

    // Add click handler to open artifact
    item.addEventListener('click', () => {
      openArtifact(artifact);
    });

    artifactsList.appendChild(item);
  });
}

function getArtifactType(extension) {
  const types = {
    'py': 'Python Script',
    'tex': 'LaTeX Document',
    'pdf': 'PDF Document',
    'png': 'Image',
    'jpg': 'Image',
    'jpeg': 'Image',
    'csv': 'Data File',
    'json': 'JSON Data',
    'md': 'Markdown'
  };
  return types[extension] || 'File';
}

async function openArtifact(artifactName) {
  if (!currentWorkspace) {
    logToConsole('error', 'No workspace loaded');
    return;
  }

  try {
    logToConsole('info', `Opening artifact: ${artifactName}`);

    const result = await window.electronAPI.readArtifact(currentWorkspace, artifactName);

    if (result.success) {
      // Update editor with artifact content
      const textarea = document.getElementById('editor-textarea');
      textarea.value = result.content;
      editorContent = result.content;

      // Update preview
      updatePreview(result.content);

      // Update status bar
      document.getElementById('status-workspace').textContent = `Workspace: ${currentWorkspace} (viewing: ${artifactName})`;

      logToConsole('success', `Opened artifact: ${artifactName}`);
    } else {
      logToConsole('error', `Failed to open artifact: ${result.error}`);
    }
  } catch (error) {
    logToConsole('error', `Error opening artifact: ${error.message}`);
  }
}

async function loadPaperPreview() {
  if (!currentWorkspace) return;

  const paperViewer = document.getElementById('paper-viewer');

  try {
    // Try to read paper.tex from workspace root
    const result = await window.electronAPI.readArtifact(currentWorkspace, '../paper.tex');

    if (result.success) {
      const latex = result.content;

      // Extract title, sections from LaTeX
      const titleMatch = latex.match(/\\title\{([^}]+)\}/);
      const title = titleMatch ? titleMatch[1] : 'Mathematical Modeling Paper';

      // Extract sections
      let html = `<div class="paper-content">`;
      html += `<h1>${title}</h1>`;

      // Extract and render each section
      const sectionPattern = /\\section\{([^}]+)\}([\s\S]*?)(?=\\section\{|\\end\{document\})/g;
      let sectionMatch;

      while ((sectionMatch = sectionPattern.exec(latex)) !== null) {
        const sectionTitle = sectionMatch[1];
        const sectionContent = sectionMatch[2].trim();

        html += `<h2>${sectionTitle}</h2>`;

        // Convert basic LaTeX to HTML
        let processedContent = sectionContent
          .replace(/\\subsection\{([^}]+)\}/g, '<h3>$1</h3>')
          .replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>')
          .replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>')
          .replace(/\\begin\{itemize\}/g, '<ul>')
          .replace(/\\end\{itemize\}/g, '</ul>')
          .replace(/\\begin\{enumerate\}/g, '<ol>')
          .replace(/\\end\{enumerate\}/g, '</ol>')
          .replace(/\\item\s*/g, '<li>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/^\s*([^<])/gm, '<p>$1')
          .replace(/([^>])\s*$/gm, '$1</p>');

        // Render LaTeX math with improved handling
        processedContent = processedContent.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
          try {
            return katex.renderToString(tex.trim(), {
              throwOnError: false,
              displayMode: true,
              strict: false
            });
          } catch (e) {
            return `<span style="color: red;">LaTeX Error</span>`;
          }
        });
        processedContent = processedContent.replace(/\$([^\$\n]+?)\$/g, (match, tex) => {
          try {
            return katex.renderToString(tex.trim(), {
              throwOnError: false,
              displayMode: false,
              strict: false
            });
          } catch (e) {
            return match;
          }
        });

        html += processedContent;
      }

      html += `</div>`;

      // Check if PDF exists
      const pdfResult = await window.electronAPI.readArtifact(currentWorkspace, '../paper.pdf').catch(() => null);
      if (pdfResult && pdfResult.success) {
        html = `<div class="paper-toolbar">
          <button onclick="openPaperPDF()">📄 Open PDF</button>
        </div>` + html;
      }

      paperViewer.innerHTML = html;
    } else {
      paperViewer.innerHTML = '<p class="placeholder-text">Paper not yet generated. Complete the writing phase first.</p>';
    }
  } catch (error) {
    paperViewer.innerHTML = '<p class="placeholder-text">Paper not yet generated. Complete the writing phase first.</p>';
  }
}

async function openPaperPDF() {
  if (!currentWorkspace) return;

  try {
    await window.electronAPI.openPDF(currentWorkspace, 'paper.pdf');
  } catch (error) {
    logToConsole('error', `Failed to open PDF: ${error.message}`);
  }
}

// Event Listeners
function setupEventListeners() {
  // Workspace selection
  document.getElementById('workspace-select').addEventListener('change', (e) => {
    if (e.target.value) {
      loadWorkspace(e.target.value);
    }
  });

  // New workspace
  document.getElementById('new-workspace').addEventListener('click', () => {
    createNewWorkspace();
  });

  // Refresh workspaces
  document.getElementById('refresh-workspaces').addEventListener('click', () => {
    loadWorkspaceList();
  });

  // Save AUTOMCM.md
  document.getElementById('save-automcm').addEventListener('click', () => {
    saveAutomcm();
  });

  // Clear console
  document.getElementById('clear-console').addEventListener('click', () => {
    clearConsole();
  });

  // Agent execution buttons
  document.getElementById('run-planning').addEventListener('click', () => {
    runPlanningPhase();
  });

  document.getElementById('run-modeling').addEventListener('click', () => {
    runModelingPhase();
  });

  document.getElementById('run-writing').addEventListener('click', () => {
    runWritingPhase();
  });

  document.getElementById('run-complete').addEventListener('click', () => {
    runCompleteWorkflow();
  });

  document.getElementById('stop-agent').addEventListener('click', () => {
    stopAgent();
  });

  // Modal controls
  document.getElementById('modal-create').addEventListener('click', () => {
    handleCreateWorkspace();
  });

  document.getElementById('modal-cancel').addEventListener('click', () => {
    closeModal();
  });

  // Enter key in workspace name input
  document.getElementById('workspace-name-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleCreateWorkspace();
    }
  });

  // Click outside modal to close
  document.getElementById('new-workspace-modal').addEventListener('click', (e) => {
    if (e.target.id === 'new-workspace-modal') {
      closeModal();
    }
  });

  // PDF and data upload buttons
  document.getElementById('upload-problem-pdf').addEventListener('click', () => {
    uploadProblemPDF();
  });

  document.getElementById('upload-data').addEventListener('click', () => {
    uploadDataFiles();
  });
}

// Setup Agent Event Listeners
function setupAgentListeners() {
  console.log('🔧 Setting up agent event listeners...');

  // Listen for agent logs
  window.electronAPI.onAgentLog((logData) => {
    console.log('📝 Agent log received:', logData);
    logToConsole(logData.type, logData.message);
  });

  // Listen for phase changes
  window.electronAPI.onPhaseChange((phase) => {
    console.log('🔄 Phase change:', phase);
    updatePhase(phase);
  });

  // Listen for agent errors
  window.electronAPI.onAgentError((error) => {
    console.log('❌ Agent error:', error);
    logToConsole('error', `Agent error: ${error}`);
  });

  // Listen for artifact creation events
  window.electronAPI.onArtifactCreated(async (data) => {
    console.log('📦 Artifact created:', data);
    logToConsole('success', `📦 Artifact created: ${data.name}`);

    // Refresh workspace to show new artifact
    if (currentWorkspace) {
      const result = await window.electronAPI.loadWorkspace(currentWorkspace);
      if (result.success) {
        updateArtifactsList(result.artifacts);
      }
    }
  });

  // Listen for equations extraction
  if (window.electronAPI.onEquationsExtracted) {
    window.electronAPI.onEquationsExtracted((equations) => {
      console.log('📐 Equations extracted:', equations);
      if (equations && equations.length > 0) {
        logToConsole('info', `📐 ${equations.length} equations extracted`);
        // Clear placeholder first
        const viewer = document.getElementById('equation-viewer');
        const placeholder = viewer.querySelector('.placeholder-text');
        if (placeholder) placeholder.remove();

        equations.forEach(eq => {
          addEquationToViewer(eq.latex, eq.label);
        });

        // Save to workflow state
        workflowState.analysisData.equations = equations;
        saveWorkflowState(currentWorkspace);
      } else {
        console.log('📐 No equations found in artifacts');
        logToConsole('warning', '📐 No equations found - modeling output may not contain LaTeX formulas');
      }
    });
  }

  // Listen for sensitivity results
  if (window.electronAPI.onSensitivityResults) {
    window.electronAPI.onSensitivityResults((data) => {
      console.log('📊 Sensitivity results received:', data);
      logToConsole('success', '📊 Sensitivity analysis complete');
      updateValidationStatus('sensitivity', 'pass', data.content ? data.content.substring(0, 200) : '');
      // Display full sensitivity results in Analysis tab
      if (data.content) {
        displaySensitivityResults(data.content);
        // Save to workflow state
        workflowState.analysisData.sensitivityResults = data.content;
        saveWorkflowState(currentWorkspace);
      }
    });
  }

  // Listen for validation updates
  if (window.electronAPI.onValidationUpdate) {
    window.electronAPI.onValidationUpdate((status) => {
      console.log('✓ Validation update:', status);
      if (status.dimensional) {
        updateValidationStatus('dimensional', status.dimensional);
        workflowState.analysisData.validation.dimensional = status.dimensional;
      }
      if (status.sensitivity) {
        updateValidationStatus('sensitivity', status.sensitivity);
        workflowState.analysisData.validation.sensitivity = status.sensitivity;
      }
      if (status.variable) {
        updateValidationStatus('variable', status.variable);
        workflowState.analysisData.validation.variable = status.variable;
      }
      saveWorkflowState(currentWorkspace);
    });
  }

  console.log('✅ Agent event listeners setup complete');
}

// Agent Execution Functions
async function runPlanningPhase() {
  if (!currentWorkspace) {
    logToConsole('error', 'Please load a workspace first');
    return;
  }

  if (agentRunning) {
    logToConsole('warning', 'Agent already running');
    return;
  }

  try {
    setAgentRunning(true);
    logToConsole('info', '📊 Starting planning phase...');

    // Try to get problem statement from uploaded PDF first
    let problemStatement = null;
    let usedProblemPdf = false;

    try {
      const problemResult = await window.electronAPI.getProblemStatement(currentWorkspace);
      if (problemResult.success && problemResult.content) {
        problemStatement = problemResult.content;
        usedProblemPdf = true;
        logToConsole('info', '✓ Using problem statement from uploaded PDF (problem.md)');
      }
    } catch (error) {
      // No problem.md found
    }

    // Warn if falling back to AUTOMCM.md
    if (!problemStatement) {
      logToConsole('warning', '⚠️  No problem.md found - using AUTOMCM.md placeholder');
      logToConsole('warning', '   Consider uploading the problem PDF first for better results');
      problemStatement = editorContent;
    }

    const result = await window.electronAPI.runPlanningPhase(currentWorkspace, problemStatement);

    if (result.success) {
      planResult = result.result;
      workflowState.planningComplete = true;
      workflowState.planResult = result.result; // Save plan to workflow state
      await saveWorkflowState(currentWorkspace);
      updateButtonStates();
      logToConsole('success', '✅ Planning phase complete');

      // Reload workspace to show new artifacts
      await loadWorkspace(currentWorkspace);
    } else {
      logToConsole('error', `Planning failed: ${result.error}`);
    }
  } catch (error) {
    logToConsole('error', `Error: ${error.message}`);
  } finally {
    setAgentRunning(false);
  }
}

async function runModelingPhase() {
  if (!workflowState.planningComplete) {
    logToConsole('error', 'Please complete planning phase first');
    return;
  }

  if (agentRunning) {
    logToConsole('warning', 'Agent already running');
    return;
  }

  try {
    setAgentRunning(true);
    logToConsole('info', '🔬 Starting modeling phase...');

    // Extract the plan text from planResult object
    let planText = planResult?.plan || planResult;

    // If plan is not available, try to load from artifact
    if (!planText || planText === 'null' || typeof planText !== 'string' || planText.length === 0) {
      logToConsole('info', 'Loading plan from artifact...');
      try {
        const artifactResult = await window.electronAPI.readArtifact(currentWorkspace, 'planning-phase-result.md');
        if (artifactResult.success) {
          // Extract the plan section from the artifact
          const content = artifactResult.content;
          const planMatch = content.match(/## 4\. Proposed Approach\n\n([\s\S]*?)(?=\n---\n\n## Approval Checklist|$)/);
          if (planMatch && planMatch[1]) {
            planText = planMatch[1].trim();
            logToConsole('success', 'Plan loaded from artifact');
          } else {
            // If no structured plan found, use the whole artifact as a fallback
            planText = content;
            logToConsole('warning', 'Using full artifact content as plan');
          }
        } else {
          logToConsole('error', 'Could not load plan artifact. Please run planning phase first.');
          return;
        }
      } catch (error) {
        logToConsole('error', `Failed to load plan: ${error.message}`);
        return;
      }
    }

    logToConsole('info', `Using plan (${typeof planText}, length: ${planText?.length || 0} chars)`);
    const result = await window.electronAPI.runModelingPhase(currentWorkspace, planText);

    if (result.success) {
      workflowState.modelingComplete = true;
      await saveWorkflowState(currentWorkspace);
      updateButtonStates();
      logToConsole('success', '✅ Modeling phase complete');
      // Reload workspace to show new artifacts
      await loadWorkspace(currentWorkspace);
      // Auto-load equations and switch to analysis tab
      logToConsole('info', '📊 Loading analysis results...');
      await loadEquationsFromArtifacts();
      // Save equations to state after loading
      const viewer = document.getElementById('equation-viewer');
      const eqBlocks = viewer.querySelectorAll('.equation-block');
      if (eqBlocks.length > 0) {
        // Extract equations from viewer and save
        const equations = [];
        eqBlocks.forEach(block => {
          const label = block.querySelector('.equation-label')?.textContent || '';
          const mathDiv = block.querySelector('div:not(.equation-label)');
          if (mathDiv) {
            // Store the rendered HTML for display (we'll use the saved data)
            equations.push({ latex: '', label, rendered: true });
          }
        });
      }
      switchTab('analysis');
    } else {
      logToConsole('error', `Modeling failed: ${result.error}`);
    }
  } catch (error) {
    logToConsole('error', `Error: ${error.message}`);
  } finally {
    setAgentRunning(false);
  }
}

async function runWritingPhase() {
  if (!workflowState.modelingComplete) {
    logToConsole('error', 'Please complete modeling phase first');
    return;
  }

  if (agentRunning) {
    logToConsole('warning', 'Agent already running');
    return;
  }

  try {
    setAgentRunning(true);
    logToConsole('info', '✍️ Starting writing phase...');

    // Load model results from artifact if needed
    let modelText = null;
    try {
      const artifactResult = await window.electronAPI.readArtifact(currentWorkspace, 'modeling-phase-result.md');
      if (artifactResult.success) {
        logToConsole('info', 'Model results loaded from artifact');
        modelText = artifactResult.content;
      }
    } catch (error) {
      logToConsole('warning', `Could not load model artifact: ${error.message}`);
    }

    const result = await window.electronAPI.runWritingPhase(currentWorkspace, modelText);

    if (result.success) {
      workflowState.writingComplete = true;
      await saveWorkflowState(currentWorkspace);
      updateButtonStates();
      logToConsole('success', '✅ Writing phase complete');
      logToConsole('success', '🎉 Complete workflow finished!');
      // Reload workspace to show new artifacts
      await loadWorkspace(currentWorkspace);
      // Switch to paper tab and load paper preview
      switchTab('paper');
    } else {
      logToConsole('error', `Writing failed: ${result.error}`);
    }
  } catch (error) {
    logToConsole('error', `Error: ${error.message}`);
  } finally {
    setAgentRunning(false);
  }
}

async function runCompleteWorkflow() {
  if (!currentWorkspace) {
    logToConsole('error', 'Please load a workspace first');
    return;
  }

  if (agentRunning) {
    logToConsole('warning', 'Agent already running');
    return;
  }

  try {
    setAgentRunning(true);
    logToConsole('info', '🎯 Starting complete MCM workflow...');

    // Try to get problem statement from uploaded PDF first
    let problemStatement = null;
    let usedProblemPdf = false;

    try {
      const problemResult = await window.electronAPI.getProblemStatement(currentWorkspace);
      if (problemResult.success && problemResult.content) {
        problemStatement = problemResult.content;
        usedProblemPdf = true;
        logToConsole('info', '✓ Using problem statement from uploaded PDF (problem.md)');
      }
    } catch (error) {
      // No problem.md found
    }

    // Warn if falling back to AUTOMCM.md
    if (!problemStatement) {
      logToConsole('warning', '⚠️  No problem.md found - using AUTOMCM.md placeholder');
      logToConsole('warning', '   Consider uploading the problem PDF first for better results');
      problemStatement = editorContent;
    }

    const result = await window.electronAPI.runCompleteWorkflow(currentWorkspace, problemStatement);

    if (result.success) {
      logToConsole('success', '🎉 Complete workflow finished successfully!');
      // Reload workspace to show new artifacts
      await loadWorkspace(currentWorkspace);
    } else {
      logToConsole('error', `Workflow failed: ${result.error}`);
    }
  } catch (error) {
    logToConsole('error', `Error: ${error.message}`);
  } finally {
    setAgentRunning(false);
  }
}

async function stopAgent() {
  try {
    logToConsole('warning', 'Stopping agent execution...');
    await window.electronAPI.stopAgent();
    setAgentRunning(false);
  } catch (error) {
    logToConsole('error', `Error stopping agent: ${error.message}`);
  }
}

function setAgentRunning(running) {
  agentRunning = running;
  updateButtonStates();

  // Update status
  const statusProgress = document.getElementById('status-progress');
  statusProgress.textContent = running ? '⚙️ Agent running...' : '';
}

function updateButtonStates() {
  // Update button states based on running state and workflow progress
  document.getElementById('run-planning').disabled = agentRunning;
  document.getElementById('run-modeling').disabled = agentRunning || !workflowState.planningComplete;
  document.getElementById('run-writing').disabled = agentRunning || !workflowState.modelingComplete;
  document.getElementById('run-complete').disabled = agentRunning;
  document.getElementById('stop-agent').style.display = agentRunning ? 'block' : 'none';
}

async function saveWorkflowState(workspaceName) {
  try {
    await window.electronAPI.saveWorkflowState(workspaceName, workflowState);
  } catch (error) {
    console.error('Failed to save workflow state:', error);
  }
}

async function loadWorkflowState(workspaceName) {
  try {
    const result = await window.electronAPI.loadWorkflowState(workspaceName);
    if (result.success && result.state) {
      workflowState = result.state;

      // Ensure analysisData exists (for backwards compatibility)
      if (!workflowState.analysisData) {
        workflowState.analysisData = {
          equations: [],
          validation: {
            dimensional: null,
            sensitivity: null,
            variable: null
          },
          sensitivityResults: null
        };
      }

      // Restore planResult from workflow state
      if (workflowState.planResult) {
        planResult = workflowState.planResult;
      }

      updateButtonStates();

      if (workflowState.planningComplete) {
        logToConsole('info', '✓ Planning phase previously completed');
      }
      if (workflowState.modelingComplete) {
        logToConsole('info', '✓ Modeling phase previously completed');
      }
      if (workflowState.writingComplete) {
        logToConsole('info', '✓ Writing phase previously completed');
      }
    } else {
      // Reset workflow state if not found
      workflowState = {
        planningComplete: false,
        modelingComplete: false,
        writingComplete: false,
        analysisData: {
          equations: [],
          validation: {
            dimensional: null,
            sensitivity: null,
            variable: null
          },
          sensitivityResults: null
        }
      };
      planResult = null;
      updateButtonStates();
    }
  } catch (error) {
    console.error('Failed to load workflow state:', error);
  }
}

// Phase indicator update - Progressive disclosure
function updatePhase(phase, status = 'active') {
  const phaseItems = document.querySelectorAll('.phase-item');
  phaseItems.forEach(item => {
    const itemPhase = item.getAttribute('data-phase');
    item.classList.remove('active', 'completed', 'idle');

    if (itemPhase === phase) {
      item.classList.add(status);
    } else if (shouldBeCompleted(itemPhase, phase)) {
      item.classList.add('completed');
    } else {
      item.classList.add('idle');
    }
  });

  updateCurrentTaskDisplay(phase, status);
  logToConsole('info', `Phase: ${phase} (${status})`);
}

function shouldBeCompleted(itemPhase, currentPhase) {
  const phases = ['planning', 'modeling', 'writing'];
  const itemIndex = phases.indexOf(itemPhase);
  const currentIndex = phases.indexOf(currentPhase);
  return itemIndex < currentIndex;
}

function updateCurrentTaskDisplay(phase, status) {
  const taskDisplay = document.getElementById('current-task');
  const phaseNames = {
    'planning': 'Planning',
    'modeling': 'Modeling',
    'writing': 'Writing'
  };

  if (status === 'active') {
    taskDisplay.textContent = `Current: ${phaseNames[phase]}`;
  } else if (status === 'completed') {
    taskDisplay.textContent = 'Ready';
  } else {
    taskDisplay.textContent = 'Ready';
  }
}

function updatePhaseProgress(phase, progress) {
  const phaseItem = document.querySelector(`.phase-item[data-phase="${phase}"]`);
  if (phaseItem) {
    const progressBar = phaseItem.querySelector('.phase-progress-fill');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }
}

// Validation status updates
function updateValidationStatus(type, status, details = null) {
  const statusId = {
    'dimensional': 'dim-status',
    'sensitivity': 'sens-status',
    'variable': 'var-status'
  }[type];

  if (!statusId) return;

  const badge = document.getElementById(statusId);
  badge.className = 'status-badge';

  if (status === 'pass') {
    badge.classList.add('success');
    badge.textContent = 'Pass ✓';
  } else if (status === 'fail') {
    badge.classList.add('error');
    badge.textContent = 'Fail ✗';
  } else if (status === 'warning') {
    badge.classList.add('warning');
    badge.textContent = 'Warning ⚠';
  } else {
    badge.classList.add('pending');
    badge.textContent = 'Not checked';
  }

  if (details) {
    const detailsDiv = document.getElementById('validation-details');
    detailsDiv.innerHTML += `<div class="validation-detail"><strong>${type}:</strong> ${details}</div>`;
  }
}

// Equation viewer update
function addEquationToViewer(equation, label = '') {
  const viewer = document.getElementById('equation-viewer');

  // Remove placeholder if exists
  const placeholder = viewer.querySelector('.placeholder-text');
  if (placeholder) placeholder.remove();

  const block = document.createElement('div');
  block.className = 'equation-block';

  if (label) {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'equation-label';
    labelDiv.textContent = label;
    block.appendChild(labelDiv);
  }

  const mathDiv = document.createElement('div');
  try {
    katex.render(equation, mathDiv, {
      throwOnError: false,
      displayMode: true,
      strict: false
    });
  } catch (e) {
    mathDiv.innerHTML = `<span style="color: red;">LaTeX Error: ${e.message}</span>`;
  }

  block.appendChild(mathDiv);
  viewer.appendChild(block);
}

// PDF and Data Upload Functions
async function uploadProblemPDF() {
  if (!currentWorkspace) {
    logToConsole('error', 'Please load a workspace first');
    return;
  }

  try {
    logToConsole('info', 'Opening file dialog for problem PDF...');
    const result = await window.electronAPI.uploadProblemPDF(currentWorkspace);

    if (result.success) {
      logToConsole('success', '✅ Problem PDF uploaded and extracted');
      logToConsole('info', `Pages: ${result.metadata.pages}`);
      logToConsole('info', `Problem statement extracted (${result.problemStatement.length} chars)`);

      // Show problem info in UI
      displayProblemInfo(result);

      // Problem is saved to workspace/problem.txt, not AUTOMCM.md
      // User can view it in the Data tab
    } else {
      logToConsole('error', `PDF upload failed: ${result.error}`);
    }
  } catch (error) {
    logToConsole('error', `Error: ${error.message}`);
  }
}

async function uploadDataFiles() {
  if (!currentWorkspace) {
    logToConsole('error', 'Please load a workspace first');
    return;
  }

  try {
    logToConsole('info', 'Opening file dialog for data files...');
    const result = await window.electronAPI.uploadDataFile(currentWorkspace);

    if (result.success) {
      logToConsole('success', `✅ Uploaded ${result.files.length} file(s)`);
      result.files.forEach(file => {
        logToConsole('info', `  - ${file.filename}`);
      });

      // Refresh data files list
      await refreshDataFiles();
    } else {
      logToConsole('error', `Upload failed: ${result.error}`);
    }
  } catch (error) {
    logToConsole('error', `Error: ${error.message}`);
  }
}

async function refreshDataFiles() {
  if (!currentWorkspace) return;

  try {
    const result = await window.electronAPI.listDataFiles(currentWorkspace);

    if (result.success) {
      displayDataFiles(result.files);
    }
  } catch (error) {
    console.error('Error refreshing data files:', error);
  }
}

function displayProblemInfo(problemData) {
  const infoDiv = document.getElementById('problem-info');
  const statement = problemData.problemStatement || problemData.content || '';
  const metadata = problemData.metadata || { pages: 'N/A', extractedAt: new Date().toISOString() };

  infoDiv.innerHTML = `
    <div class="problem-info-card">
      <h3>📄 Problem Statement</h3>
      <p><strong>Saved to:</strong> workspace/problem.md (Markdown format)</p>
      <p><strong>Pages:</strong> ${metadata.pages}</p>
      <p><strong>Extracted:</strong> ${new Date(metadata.extractedAt).toLocaleString()}</p>
      <p><strong>Length:</strong> ${statement.length} characters</p>
      <p style="margin-top: 8px; color: var(--accent-green); font-size: 12px;">
        ℹ️ Planning phase will automatically use this problem statement
      </p>
      <button id="view-problem-text" class="btn-secondary" style="margin-top: 8px;">View Full Text</button>
    </div>
  `;

  document.getElementById('view-problem-text').addEventListener('click', () => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 900px; max-height: 80vh; overflow-y: auto;">
        <button class="modal-close-btn" id="close-modal-btn" title="Close">×</button>
        <h2>Problem Statement (Markdown)</h2>
        <div id="problem-preview" style="padding: 20px; background: var(--bg-secondary); border-radius: 6px; line-height: 1.6;"></div>
      </div>
    `;
    document.body.appendChild(modal);

    // Render markdown preview with proper markdown and LaTeX support
    const previewDiv = document.getElementById('problem-preview');
    const markdown = statement;

    // Use the same rendering pipeline as updatePreview
    marked.setOptions({
      gfm: true,
      breaks: true,
      tables: true
    });

    // Protect LaTeX
    const latexBlocks = [];
    let protected = markdown
      .replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
        const id = latexBlocks.length;
        latexBlocks.push({ type: 'display', tex: tex.trim() });
        return `___LATEX_BLOCK_${id}___`;
      })
      .replace(/\$([^\$\n]+?)\$/g, (match, tex) => {
        const id = latexBlocks.length;
        latexBlocks.push({ type: 'inline', tex: tex.trim() });
        return `___LATEX_INLINE_${id}___`;
      });

    let html = marked.parse(protected);

    // Restore LaTeX
    html = html.replace(/___LATEX_BLOCK_(\d+)___/g, (match, id) => {
      const block = latexBlocks[parseInt(id)];
      try {
        return katex.renderToString(block.tex, {
          throwOnError: false,
          displayMode: true,
          strict: false
        });
      } catch (e) {
        return `<span style="color: red;">LaTeX Error</span>`;
      }
    });
    html = html.replace(/___LATEX_INLINE_(\d+)___/g, (match, id) => {
      const block = latexBlocks[parseInt(id)];
      try {
        return katex.renderToString(block.tex, {
          throwOnError: false,
          displayMode: false,
          strict: false
        });
      } catch (e) {
        return match;
      }
    });

    previewDiv.innerHTML = html;

    document.getElementById('close-modal-btn').addEventListener('click', () => {
      modal.remove();
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  });
}

function displayDataFiles(files) {
  const listDiv = document.getElementById('data-files-list');

  if (files.length === 0) {
    listDiv.innerHTML = '<p class="placeholder-text">No data files uploaded yet</p>';
    return;
  }

  listDiv.innerHTML = `
    <table class="data-files-table">
      <thead>
        <tr>
          <th>Filename</th>
          <th>Type</th>
          <th>Size</th>
          <th>Uploaded</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${files.map(file => `
          <tr>
            <td>${file.filename}</td>
            <td>${file.type || 'unknown'}</td>
            <td>${formatFileSize(file.size)}</td>
            <td>${new Date(file.uploadedAt).toLocaleString()}</td>
            <td>
              <button class="btn-danger btn-sm" onclick="deleteDataFile('${file.filename}')">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

async function deleteDataFile(filename) {
  if (!confirm(`Delete ${filename}?`)) return;

  try {
    const result = await window.electronAPI.deleteDataFile(currentWorkspace, filename);
    if (result.success) {
      logToConsole('success', `Deleted ${filename}`);
      await refreshDataFiles();
    } else {
      logToConsole('error', 'Delete failed');
    }
  } catch (error) {
    logToConsole('error', `Error: ${error.message}`);
  }
}

// Make deleteDataFile globally accessible
window.deleteDataFile = deleteDataFile;

// Sensitivity results display
function displaySensitivityResults(content) {
  const detailsDiv = document.getElementById('validation-details');

  // Create a dedicated section for sensitivity results
  const sensSection = document.createElement('div');
  sensSection.className = 'sensitivity-results-section';
  sensSection.innerHTML = `
    <h4 style="margin: 20px 0 10px 0; color: var(--accent-green);">📊 Sensitivity Analysis Results</h4>
    <div class="sensitivity-content" style="
      background: var(--bg-secondary);
      padding: 15px;
      border-radius: 6px;
      max-height: 400px;
      overflow-y: auto;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      line-height: 1.6;
      white-space: pre-wrap;
    ">${escapeHtml(content)}</div>
  `;

  // Remove old sensitivity results if exists
  const oldSection = detailsDiv.querySelector('.sensitivity-results-section');
  if (oldSection) oldSection.remove();

  detailsDiv.appendChild(sensSection);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Clear Analysis tab UI
function clearAnalysisTab() {
  // Clear equations viewer
  const viewer = document.getElementById('equation-viewer');
  viewer.innerHTML = '<p class="placeholder-text">Complete modeling phase to see equations here.</p>';

  // Reset validation badges
  const badges = {
    'dim-status': 'Not checked',
    'sens-status': 'Not checked',
    'var-status': 'Not checked'
  };

  Object.entries(badges).forEach(([id, text]) => {
    const badge = document.getElementById(id);
    if (badge) {
      badge.className = 'status-badge pending';
      badge.textContent = text;
    }
  });

  // Clear validation details
  const detailsDiv = document.getElementById('validation-details');
  if (detailsDiv) {
    detailsDiv.innerHTML = '';
  }
}

// Restore analysis data from workflow state or load from artifacts
async function restoreAnalysisData() {
  if (!currentWorkspace) return;

  const viewer = document.getElementById('equation-viewer');

  // Try to restore from saved state first
  if (workflowState.analysisData) {
    let restored = false;

    // Restore equations
    if (workflowState.analysisData.equations && workflowState.analysisData.equations.length > 0) {
      viewer.innerHTML = '';
      workflowState.analysisData.equations.forEach(eq => {
        addEquationToViewer(eq.latex, eq.label);
      });
      logToConsole('info', `📐 Restored ${workflowState.analysisData.equations.length} equations from saved state`);
      restored = true;
    }

    // Restore validation status
    if (workflowState.analysisData.validation) {
      const val = workflowState.analysisData.validation;
      if (val.dimensional) updateValidationStatus('dimensional', val.dimensional);
      if (val.sensitivity) updateValidationStatus('sensitivity', val.sensitivity);
      if (val.variable) updateValidationStatus('variable', val.variable);
    }

    // Restore sensitivity results
    if (workflowState.analysisData.sensitivityResults) {
      displaySensitivityResults(workflowState.analysisData.sensitivityResults);
      logToConsole('info', '📊 Restored sensitivity analysis results');
      restored = true;
    }

    if (restored) return;
  }

  // Fallback: Load from artifacts if no saved state
  await loadEquationsFromArtifacts();
}

// Load equations from artifacts (manual refresh)
async function loadEquationsFromArtifacts() {
  if (!currentWorkspace) return;

  const viewer = document.getElementById('equation-viewer');

  try {
    // Clear existing equations
    viewer.innerHTML = '';

    let foundEquations = false;
    let checkedFiles = [];

    // Try to load from modeling-phase-result.md
    try {
      const modelResult = await window.electronAPI.readArtifact(currentWorkspace, 'modeling-phase-result.md');
      if (modelResult.success) {
        checkedFiles.push('modeling-phase-result.md');
        const equations = extractEquationsFromContent(modelResult.content);
        console.log(`Found ${equations.length} equations in modeling-phase-result.md`);
        if (equations.length > 0) {
          equations.forEach(eq => {
            addEquationToViewer(eq.latex, eq.label);
            foundEquations = true;
          });
        }
      }
    } catch (err) {
      console.log('Could not load modeling-phase-result.md:', err.message);
    }

    // Try to load from paper.tex
    try {
      const paperResult = await window.electronAPI.readArtifact(currentWorkspace, '../paper.tex');
      if (paperResult.success) {
        checkedFiles.push('paper.tex');
        const equations = extractEquationsFromContent(paperResult.content);
        console.log(`Found ${equations.length} equations in paper.tex`);
        if (equations.length > 0) {
          equations.forEach(eq => {
            addEquationToViewer(eq.latex, eq.label);
            foundEquations = true;
          });
        }
      }
    } catch (err) {
      console.log('Could not load paper.tex:', err.message);
    }

    if (!foundEquations) {
      viewer.innerHTML = `
        <div class="info-message">
          <p><strong>No equations found</strong></p>
          <p>Checked files: ${checkedFiles.join(', ')}</p>
          <p style="margin-top: 10px; font-size: 12px; color: var(--text-secondary);">
            <strong>Note:</strong> The modeling phase needs to generate equations in LaTeX format (using $$ ... $$ or \\begin{equation}).
            Currently, the modeling output contains conceptual descriptions but no mathematical formulas.
          </p>
        </div>
      `;
      logToConsole('info', `📐 No LaTeX equations found in artifacts (checked: ${checkedFiles.join(', ')})`);
    } else {
      logToConsole('success', `📐 Loaded equations from artifacts`);
    }
  } catch (error) {
    viewer.innerHTML = '<p class="placeholder-text">Error loading equations.</p>';
    console.error('Error in loadEquationsFromArtifacts:', error);
  }
}

// Extract equations from content (client-side)
function extractEquationsFromContent(content) {
  const equations = [];

  // Display math: $$...$$
  const displayMath = content.matchAll(/\$\$([\s\S]+?)\$\$/g);
  for (const match of displayMath) {
    equations.push({ latex: match[1].trim(), label: '' });
  }

  // LaTeX equation environment
  const latexEq = content.matchAll(/\\begin\{equation\*?\}([\s\S]+?)\\end\{equation\*?\}/g);
  for (const match of latexEq) {
    const eq = match[1].trim();
    const labelMatch = eq.match(/\\label\{([^}]+)\}/);
    const label = labelMatch ? labelMatch[1] : '';
    const cleaned = eq.replace(/\\label\{[^}]+\}/g, '').trim();
    equations.push({ latex: cleaned, label });
  }

  // LaTeX align environment
  const alignEq = content.matchAll(/\\begin\{align\*?\}([\s\S]+?)\\end\{align\*?\}/g);
  for (const match of alignEq) {
    const eq = match[1].trim();
    const labelMatch = eq.match(/\\label\{([^}]+)\}/);
    const label = labelMatch ? labelMatch[1] : '';
    const cleaned = eq.replace(/\\label\{[^}]+\}/g, '').trim();
    equations.push({ latex: cleaned, label });
  }

  return equations.slice(0, 30);
}

// Export for debugging
window.autoMCM = {
  updatePhase,
  logToConsole,
  loadWorkspace,
  saveAutomcm,
  runPlanningPhase,
  runModelingPhase,
  runWritingPhase,
  runCompleteWorkflow,
  uploadProblemPDF,
  uploadDataFiles,
  refreshDataFiles
};
