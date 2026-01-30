import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

/**
 * Python Code Executor - Runs Python code safely
 */
class PythonExecutor {
  constructor(workspacePath, options = {}) {
    this.workspacePath = workspacePath;
    this.pythonCommand = options.pythonCommand || 'python3';
    this.timeout = options.timeout || 120000; // 120 seconds (2 minutes) default
  }

  /**
   * Execute Python code from a string
   */
  async executeCode(code, options = {}) {
    const tempFile = path.join(
      this.workspacePath,
      'models',
      `temp_${Date.now()}.py`
    );

    try {
      // Write code to temp file
      await fs.writeFile(tempFile, code, 'utf8');

      // Execute
      const result = await this.executeFile(tempFile, options);

      // Clean up temp file
      await fs.unlink(tempFile);

      return result;
    } catch (error) {
      // Try to clean up even on error
      try {
        await fs.unlink(tempFile);
      } catch {}

      throw error;
    }
  }

  /**
   * Execute Python file
   */
  async executeFile(filePath, options = {}) {
    const timeout = options.timeout || this.timeout;

    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonCommand, [filePath], {
        cwd: this.workspacePath
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            stdout,
            stderr,
            exitCode: code
          });
        } else {
          reject({
            success: false,
            stdout,
            stderr,
            exitCode: code,
            error: `Process exited with code ${code}`
          });
        }
      });

      process.on('error', (error) => {
        reject({
          success: false,
          stdout,
          stderr,
          error: error.message
        });
      });

      // Set timeout
      const timer = setTimeout(() => {
        process.kill();
        reject({
          success: false,
          stdout,
          stderr,
          error: 'Execution timeout'
        });
      }, timeout);

      process.on('close', () => clearTimeout(timer));
    });
  }

  /**
   * Check if Python is available
   */
  async checkPython() {
    try {
      const result = await this.executeCode('print("OK")');
      return result.success && result.stdout.trim() === 'OK';
    } catch {
      return false;
    }
  }

  /**
   * Install Python package using pip
   */
  async installPackage(packageName) {
    return new Promise((resolve, reject) => {
      console.log(`📦 Installing ${packageName}...`);
      const process = spawn(this.pythonCommand, ['-m', 'pip', 'install', packageName]);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          console.log(`✓ ${packageName} installed`);
          resolve({ success: true, stdout, stderr });
        } else {
          reject(new Error(`Failed to install ${packageName}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Check if a Python package is installed
   */
  async checkPackage(packageName) {
    try {
      const result = await this.executeCode(`import ${packageName}\nprint("OK")`);
      return result.success && result.stdout.trim() === 'OK';
    } catch {
      return false;
    }
  }

  /**
   * Get Python version
   */
  async getPythonVersion() {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonCommand, ['--version']);

      let output = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error('Failed to get Python version'));
        }
      });
    });
  }

  /**
   * Install package using pip
   */
  async installPackage(packageName) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonCommand, ['-m', 'pip', 'install', packageName]);

      let output = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output });
        } else {
          reject({ success: false, output, error: `Failed to install ${packageName}` });
        }
      });
    });
  }
}

export default PythonExecutor;
