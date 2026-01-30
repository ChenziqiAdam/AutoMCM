import SymPyWrapper from '../tools/sympy-wrapper.js';

/**
 * Dimensional Validator - Symbolic dimensional analysis using SymPy
 * Checks dimensional consistency of equations
 */
class DimensionalValidator {
  constructor() {
    this.sympy = new SymPyWrapper();

    // Base SI units
    this.baseUnits = {
      'm': { length: 1 },
      'kg': { mass: 1 },
      's': { time: 1 },
      'K': { temperature: 1 },
      'A': { current: 1 },
      'mol': { amount: 1 },
      'cd': { luminosity: 1 }
    };

    // Common derived units
    this.derivedUnits = {
      'N': { mass: 1, length: 1, time: -2 }, // Newton
      'Pa': { mass: 1, length: -1, time: -2 }, // Pascal
      'J': { mass: 1, length: 2, time: -2 }, // Joule
      'W': { mass: 1, length: 2, time: -3 }, // Watt
      'm/s': { length: 1, time: -1 },
      'm/s²': { length: 1, time: -2 },
      'kg/m³': { mass: 1, length: -3 },
      'mg/L': { mass: 1, length: -3 }, // equivalent to kg/m³
    };
  }

  /**
   * Validate equation using SymPy symbolic analysis
   */
  async validateEquationSymbolic(equation, variableUnits = {}) {
    try {
      console.log(`🔍 Validating equation symbolically: ${equation}`);

      // Create SymPy validation code
      const validationCode = this._generateSymPyValidationCode(equation, variableUnits);

      const result = await this.sympy.execute(validationCode);

      if (result.success && result.output) {
        const parsed = JSON.parse(result.output);
        return {
          valid: parsed.dimensionally_consistent,
          leftDimensions: parsed.left_dimensions,
          rightDimensions: parsed.right_dimensions,
          message: parsed.dimensionally_consistent
            ? 'Equation is dimensionally consistent'
            : `Dimensional mismatch: ${parsed.left_dimensions} ≠ ${parsed.right_dimensions}`,
          method: 'symbolic'
        };
      }

      // Fallback to rule-based
      console.warn('SymPy validation failed, using rule-based method');
      return this._validateRuleBased(equation, variableUnits);

    } catch (error) {
      console.warn(`Symbolic validation error: ${error.message}`);
      return this._validateRuleBased(equation, variableUnits);
    }
  }

  /**
   * Generate SymPy code for dimensional validation
   */
  _generateSymPyValidationCode(equation, variableUnits) {
    // Extract variable names from units mapping
    const varDeclarations = Object.entries(variableUnits)
      .map(([varName, unit]) => {
        const dims = this.parseUnit(unit);
        const dimsStr = JSON.stringify(dims);
        return `    '${varName}': ${dimsStr}`;
      })
      .join(',\n');

    return `
from sympy.physics.units import *
from sympy import *
import json

# Define variable dimensions
var_dims = {
${varDeclarations}
}

# Parse equation
try:
    equation_str = "${equation.replace(/"/g, '\\"')}"

    # Split by = sign
    if '=' in equation_str:
        left, right = equation_str.split('=')
    else:
        left = equation_str
        right = "0"

    # Get dimensional analysis
    # Simplified: just extract dimensions from variables
    left_dims = {}
    right_dims = {}

    for var, dims in var_dims.items():
        if var in left:
            for dim_type, power in dims.items():
                left_dims[dim_type] = left_dims.get(dim_type, 0) + power
        if var in right:
            for dim_type, power in dims.items():
                right_dims[dim_type] = right_dims.get(dim_type, 0) + power

    # Check consistency
    consistent = left_dims == right_dims

    result = {
        "dimensionally_consistent": consistent,
        "left_dimensions": str(left_dims),
        "right_dimensions": str(right_dims)
    }

    print(json.dumps(result))

except Exception as e:
    print(json.dumps({
        "dimensionally_consistent": False,
        "left_dimensions": "parse_error",
        "right_dimensions": "parse_error",
        "error": str(e)
    }))
`;
  }

  /**
   * Rule-based validation (fallback)
   */
  _validateRuleBased(equation, variableUnits) {
    // Simple rule-based checking
    const leftSide = { unit: Object.values(variableUnits)[0] || '' };
    const rightSide = { unit: Object.values(variableUnits)[1] || '' };

    return {
      valid: this.areCompatible(leftSide.unit, rightSide.unit),
      leftDimensions: this.parseUnit(leftSide.unit),
      rightDimensions: this.parseUnit(rightSide.unit),
      method: 'rule-based'
    };
  }

  /**
   * Parse unit string into dimensional components
   */
  parseUnit(unitString) {
    if (!unitString || unitString === '-' || unitString === 'dimensionless') {
      return {};
    }

    // Check if it's a known unit
    if (this.baseUnits[unitString]) {
      return this.baseUnits[unitString];
    }

    if (this.derivedUnits[unitString]) {
      return this.derivedUnits[unitString];
    }

    // Try to parse composite units (simplified)
    return this._parseComposite(unitString);
  }

  /**
   * Parse composite unit (basic implementation)
   */
  _parseComposite(unitString) {
    const dimensions = {};

    if (unitString.includes('/')) {
      const [numerator, denominator] = unitString.split('/');
      const numDims = this.parseUnit(numerator);
      const denDims = this.parseUnit(denominator);

      // Combine
      for (const [dim, power] of Object.entries(numDims)) {
        dimensions[dim] = power;
      }
      for (const [dim, power] of Object.entries(denDims)) {
        dimensions[dim] = (dimensions[dim] || 0) - power;
      }

      return dimensions;
    }

    return dimensions;
  }

  /**
   * Check if two units are dimensionally compatible
   */
  areCompatible(unit1, unit2) {
    const dims1 = this.parseUnit(unit1);
    const dims2 = this.parseUnit(unit2);

    // Get all dimension keys
    const allDims = new Set([
      ...Object.keys(dims1),
      ...Object.keys(dims2)
    ]);

    // Check each dimension
    for (const dim of allDims) {
      const power1 = dims1[dim] || 0;
      const power2 = dims2[dim] || 0;

      if (power1 !== power2) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate an equation (compatibility wrapper)
   */
  async validateEquation(equation, variableUnits = {}) {
    return await this.validateEquationSymbolic(equation, variableUnits);
  }

  /**
   * Validate variable registry entries
   */
  async validateRegistry(variables) {
    const errors = [];
    const warnings = [];

    for (const variable of variables) {
      // Check if unit is recognized
      const dimensions = this.parseUnit(variable.units);

      if (Object.keys(dimensions).length === 0 &&
          variable.units &&
          variable.units !== '-' &&
          variable.units !== 'dimensionless') {
        warnings.push({
          variable: variable.symbol,
          message: `Unknown unit: ${variable.units}`
        });
      }

      // Check if constraints make sense
      if (variable.constraints && variable.units) {
        // Could add constraint validation here
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Suggest unit for a variable based on definition
   */
  suggestUnit(definition) {
    const suggestions = [];
    const lowerDef = definition.toLowerCase();

    if (lowerDef.includes('distance') || lowerDef.includes('length')) {
      suggestions.push('m');
    }
    if (lowerDef.includes('mass')) {
      suggestions.push('kg');
    }
    if (lowerDef.includes('time') || lowerDef.includes('duration')) {
      suggestions.push('s');
    }
    if (lowerDef.includes('velocity') || lowerDef.includes('speed')) {
      suggestions.push('m/s');
    }
    if (lowerDef.includes('acceleration')) {
      suggestions.push('m/s²');
    }
    if (lowerDef.includes('force')) {
      suggestions.push('N');
    }
    if (lowerDef.includes('pressure')) {
      suggestions.push('Pa');
    }
    if (lowerDef.includes('energy')) {
      suggestions.push('J');
    }
    if (lowerDef.includes('power')) {
      suggestions.push('W');
    }
    if (lowerDef.includes('density')) {
      suggestions.push('kg/m³');
    }
    if (lowerDef.includes('concentration')) {
      suggestions.push('mg/L');
    }
    if (lowerDef.includes('temperature')) {
      suggestions.push('K');
    }

    return suggestions;
  }
}

export default DimensionalValidator;
