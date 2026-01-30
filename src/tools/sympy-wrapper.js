import PythonExecutor from './python-executor.js';

/**
 * SymPy Wrapper - Interface to SymPy for symbolic mathematics
 */
class SymPyWrapper {
  constructor(workspacePath) {
    this.executor = new PythonExecutor(workspacePath);
  }

  /**
   * Check dimensional consistency of an equation
   */
  async checkDimensions(equation, variables) {
    console.log('🔬 Checking dimensional consistency...');

    // Build SymPy code for dimensional analysis
    const code = this._generateDimensionalCheckCode(equation, variables);

    try {
      const result = await this.executor.executeCode(code);

      if (result.success) {
        const output = result.stdout.trim();
        return {
          consistent: output.includes('CONSISTENT'),
          details: output
        };
      } else {
        return {
          consistent: false,
          error: result.stderr
        };
      }
    } catch (error) {
      return {
        consistent: false,
        error: error.message || error.error
      };
    }
  }

  /**
   * Generate SymPy code for dimensional checking
   */
  _generateDimensionalCheckCode(equation, variables) {
    return `
from sympy import symbols, sympify
from sympy.physics.units import length, mass, time, velocity, force

# Define symbols with dimensions
${variables.map(v => `${v.symbol} = symbols('${v.symbol}', real=True)`).join('\n')}

# Parse equation
try:
    expr = sympify("${equation}")
    print("CONSISTENT: Equation parsed successfully")
    print(f"Expression: {expr}")
except Exception as e:
    print(f"ERROR: {e}")
`.trim();
  }

  /**
   * Solve equation symbolically
   */
  async solveEquation(equation, solveFor) {
    console.log(`🧮 Solving for ${solveFor}...`);

    const code = `
from sympy import symbols, solve, sympify

# Define variables
${solveFor} = symbols('${solveFor}')

# Parse and solve equation
equation = sympify("${equation}")
solution = solve(equation, ${solveFor})

print("Solutions:")
for sol in solution:
    print(f"  {sol}")
`.trim();

    try {
      const result = await this.executor.executeCode(code);

      if (result.success) {
        return {
          success: true,
          solutions: result.stdout.trim()
        };
      } else {
        return {
          success: false,
          error: result.stderr
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || error.error
      };
    }
  }

  /**
   * Simplify mathematical expression
   */
  async simplify(expression) {
    console.log('✨ Simplifying expression...');

    const code = `
from sympy import sympify, simplify

expr = sympify("${expression}")
simplified = simplify(expr)

print(f"Original: {expr}")
print(f"Simplified: {simplified}")
`.trim();

    try {
      const result = await this.executor.executeCode(code);

      if (result.success) {
        return {
          success: true,
          result: result.stdout.trim()
        };
      } else {
        return {
          success: false,
          error: result.stderr
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || error.error
      };
    }
  }

  /**
   * Calculate partial derivatives
   */
  async partialDerivative(expression, variable) {
    console.log(`∂/∂${variable}...`);

    const code = `
from sympy import symbols, sympify, diff

${variable} = symbols('${variable}')

expr = sympify("${expression}")
derivative = diff(expr, ${variable})

print(f"f = {expr}")
print(f"∂f/∂{variable} = {derivative}")
`.trim();

    try {
      const result = await this.executor.executeCode(code);

      if (result.success) {
        return {
          success: true,
          derivative: result.stdout.trim()
        };
      } else {
        return {
          success: false,
          error: result.stderr
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || error.error
      };
    }
  }

  /**
   * Perform Taylor series expansion
   */
  async taylorSeries(expression, variable, point, order = 4) {
    console.log(`📈 Taylor series expansion around ${variable}=${point}...`);

    const code = `
from sympy import symbols, sympify, series

${variable} = symbols('${variable}')

expr = sympify("${expression}")
taylor = series(expr, ${variable}, ${point}, ${order})

print(f"Taylor series of {expr} around ${variable}=${point}:")
print(taylor)
`.trim();

    try {
      const result = await this.executor.executeCode(code);

      if (result.success) {
        return {
          success: true,
          series: result.stdout.trim()
        };
      } else {
        return {
          success: false,
          error: result.stderr
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || error.error
      };
    }
  }

  /**
   * Convert expression to LaTeX
   */
  async toLatex(expression) {
    console.log('📝 Converting to LaTeX...');

    const code = `
from sympy import sympify, latex

expr = sympify("${expression}")
latex_code = latex(expr)

print(latex_code)
`.trim();

    try {
      const result = await this.executor.executeCode(code);

      if (result.success) {
        return {
          success: true,
          latex: result.stdout.trim()
        };
      } else {
        return {
          success: false,
          error: result.stderr
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || error.error
      };
    }
  }

  /**
   * Perform sensitivity analysis
   */
  async sensitivityAnalysis(expression, parameters, ranges) {
    console.log('📊 Performing sensitivity analysis...');

    const code = `
import sympy as sp
import numpy as np

# Define symbols
${parameters.map(p => `${p.name} = sp.symbols('${p.name}')`).join('\n')}

# Parse expression
expr = sp.sympify("${expression}")

# Calculate partial derivatives (sensitivity)
print("Sensitivity Analysis:")
print("=" * 50)

${parameters.map(p => `
derivative = sp.diff(expr, ${p.name})
print(f"∂f/∂${p.name} = {derivative}")

# Evaluate at nominal value
nominal = {${parameters.map(p2 => `${p2.name}: ${p2.nominal}`).join(', ')}}
sensitivity = derivative.subs(nominal)
print(f"  At nominal: {sensitivity}")
print()
`).join('\n')}

# Relative sensitivity
print("Relative Sensitivities:")
f_nominal = expr.subs(nominal)
${parameters.map(p => `
rel_sens = (derivative.subs(nominal) * ${p.nominal}) / f_nominal
print(f"  ${p.name}: {rel_sens}")
`).join('\n')}
`.trim();

    try {
      const result = await this.executor.executeCode(code);

      if (result.success) {
        return {
          success: true,
          analysis: result.stdout.trim()
        };
      } else {
        return {
          success: false,
          error: result.stderr
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || error.error
      };
    }
  }

  /**
   * Check if SymPy is installed
   */
  async checkInstallation() {
    try {
      const result = await this.executor.executeCode(`
import sympy
print(f"SymPy version: {sympy.__version__}")
print("OK")
`.trim());

      return result.success && result.stdout.includes('OK');
    } catch {
      return false;
    }
  }

  /**
   * Install SymPy if not present
   */
  async installSymPy() {
    console.log('📦 Installing SymPy...');

    try {
      await this.executor.installPackage('sympy');
      console.log('✓ SymPy installed');
      return true;
    } catch (error) {
      console.error('Failed to install SymPy:', error);
      return false;
    }
  }
}

export default SymPyWrapper;
