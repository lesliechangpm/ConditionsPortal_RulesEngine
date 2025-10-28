import { LoanCondition, LoanType, LoanTypeConstraint, LoanTypeFilterResult, LoanData } from '../types';

export class LoanTypeFilter {
  private static readonly LOAN_TYPE_PATTERNS = [
    // Specific type patterns
    { pattern: /VA\s+Only/i, types: ['VA'] },
    { pattern: /FHA\s+Only/i, types: ['FHA'] },
    { pattern: /USDA\s+Only/i, types: ['USDA'] },
    { pattern: /Conv(?:entional)?\s+Only/i, types: ['Conv'] },
    
    // Multiple type patterns
    { pattern: /All\s+Files\s+Conventional\s+&\s+Govy/i, types: ['Conv', 'FHA', 'VA', 'USDA'] },
    { pattern: /Conventional,?\s+FHA,?\s+VA\s+and\s+USDA/i, types: ['Conv', 'FHA', 'VA', 'USDA'] },
    { pattern: /On\s+all\s+Convention,?\s+FHA,?\s+VA,?\s+USDA/i, types: ['Conv', 'FHA', 'VA', 'USDA'] },
    
    // Specific combinations with "or" syntax
    { pattern: /Conv(?:entional)?\s+-or-\s+FHA\s+-or-\s+VA\s+-or-\s+(?:RHS|USDA)/i, types: ['Conv', 'FHA', 'VA', 'USDA'] },
    { pattern: /Conv(?:entional)?\s+-or-\s+VA\s+-or-\s+FHA/i, types: ['Conv', 'VA', 'FHA'] },
    { pattern: /FHA\s+-or-\s+VA/i, types: ['FHA', 'VA'] },
    
    // "Conv or FHA or VA or RHS" syntax (without dashes)
    { pattern: /Conv(?:entional)?\s+or\s+FHA\s+or\s+VA\s+or\s+(?:RHS|USDA)/i, types: ['Conv', 'FHA', 'VA', 'USDA'] },
    { pattern: /Mortgage\s+Type\s*=\s*Conv(?:entional)?\s+or\s+FHA\s+or\s+VA\s+or\s+(?:RHS|USDA)/i, types: ['Conv', 'FHA', 'VA', 'USDA'] },
    
    // State-specific exclusions
    { pattern: /New\s+Const\s+in\s+specific\s+states\s+USDA\/VA\/FHA/i, types: ['USDA', 'VA', 'FHA'] },
    
    // Exclude conventional patterns
    { pattern: /(?!.*Conv).*VA.*FHA.*USDA/i, types: ['VA', 'FHA', 'USDA'] },
    
    // Generic government loans
    { pattern: /(?:FHA|VA|USDA)/i, types: [] }, // Will be handled by more specific patterns above
  ];

  private static readonly LOGIC_PATTERNS = [
    // Column Q mortgage type constraints
    { pattern: /Mortgage\s+Type\s*=\s*VA/i, types: ['VA'] },
    { pattern: /Mortgage\s+Type\s*=\s*FHA/i, types: ['FHA'] },
    { pattern: /Mortgage\s+Type\s*=\s*Conv(?:entional)?/i, types: ['Conv'] },
    { pattern: /Mortgage\s+Type\s*=\s*USDA/i, types: ['USDA'] },
    
    // Multiple types in logic
    { pattern: /Mortgage\s+Type.*Conv.*FHA.*VA.*(?:USDA|RHS)/i, types: ['Conv', 'FHA', 'VA', 'USDA'] },
    { pattern: /Loan:\s*VA/i, types: ['VA'] },
    { pattern: /Loan:\s*FHA/i, types: ['FHA'] },
  ];

  /**
   * Parse loan type constraints from condition rules and logic
   */
  public static parseConditionConstraints(condition: LoanCondition): LoanTypeConstraint[] {
    const constraints: LoanTypeConstraint[] = [];
    
    // Parse Column C (Rules)
    if (condition.rules) {
      const rulesConstraint = this.parseRulesText(condition.rules);
      if (rulesConstraint.length > 0) {
        constraints.push({
          conditionCode: condition.conditionCode,
          supportedTypes: rulesConstraint,
          constraint: condition.rules,
          source: 'rules'
        });
      }
    }
    
    // Parse Column Q (Logic to Apply)
    if (condition.logicToApply) {
      const logicConstraint = this.parseLogicText(condition.logicToApply);
      if (logicConstraint.length > 0) {
        constraints.push({
          conditionCode: condition.conditionCode,
          supportedTypes: logicConstraint,
          constraint: condition.logicToApply,
          source: 'logic'
        });
      }
    }
    
    return constraints;
  }

  /**
   * Parse loan types from Column C rules text
   */
  private static parseRulesText(rulesText: string): LoanType[] {
    const normalizedText = rulesText.trim();
    
    // Try each pattern
    for (const { pattern, types } of this.LOAN_TYPE_PATTERNS) {
      if (pattern.test(normalizedText)) {
        return types as LoanType[];
      }
    }
    
    // If no specific pattern matched, look for individual loan type mentions
    const foundTypes: LoanType[] = [];
    
    if (/\bVA\b/i.test(normalizedText)) foundTypes.push('VA');
    if (/\bFHA\b/i.test(normalizedText)) foundTypes.push('FHA');
    if (/\bUSDA\b/i.test(normalizedText)) foundTypes.push('USDA');
    if (/\b(?:Conv|Conventional)\b/i.test(normalizedText)) foundTypes.push('Conv');
    
    return foundTypes;
  }

  /**
   * Parse loan types from Column Q logic text
   */
  private static parseLogicText(logicText: string): LoanType[] {
    const normalizedText = logicText.trim();
    
    // Try each logic pattern
    for (const { pattern, types } of this.LOGIC_PATTERNS) {
      if (pattern.test(normalizedText)) {
        return types as LoanType[];
      }
    }
    
    return [];
  }

  /**
   * Filter conditions based on loan type
   */
  public static filterConditionsByLoanType(
    conditions: LoanCondition[], 
    loanData: LoanData
  ): LoanTypeFilterResult {
    const applicable: LoanCondition[] = [];
    const filtered: LoanCondition[] = [];
    const filterReasons: Record<string, string> = {};
    
    const loanType = this.normalizeLoanType(loanData.mortgageType);
    
    for (const condition of conditions) {
      const constraints = this.parseConditionConstraints(condition);
      
      if (constraints.length === 0) {
        // No constraints found - assume it applies to all loan types
        condition.supportedLoanTypes = ['Conv', 'FHA', 'VA', 'USDA', 'Non-QM'];
        applicable.push(condition);
        continue;
      }
      
      let conditionApplies = false;
      let allConstraints: LoanType[] = [];
      
      // Check each constraint
      for (const constraint of constraints) {
        if (constraint.supportedTypes.includes(loanType)) {
          conditionApplies = true;
        }
        allConstraints = [...allConstraints, ...constraint.supportedTypes];
      }
      
      // Remove duplicates and store supported types
      condition.supportedLoanTypes = [...new Set(allConstraints)];
      
      if (conditionApplies) {
        applicable.push(condition);
      } else {
        filtered.push(condition);
        filterReasons[condition.conditionCode] = 
          `Loan type '${loanType}' not supported. Supports: ${condition.supportedLoanTypes.join(', ')}`;
      }
    }
    
    return {
      applicable,
      filtered,
      filterReasons
    };
  }

  /**
   * Normalize loan type to standard format
   */
  private static normalizeLoanType(mortgageType?: string): LoanType {
    if (!mortgageType) return 'Conv'; // Default to conventional
    
    const normalized = mortgageType.toUpperCase();
    
    switch (normalized) {
      case 'CONV':
      case 'CONVENTIONAL':
        return 'Conv';
      case 'FHA':
        return 'FHA';
      case 'VA':
        return 'VA';
      case 'USDA':
      case 'RHS':
        return 'USDA';
      case 'NON-QM':
      case 'NONQM':
        return 'Non-QM';
      default:
        console.warn(`Unknown mortgage type: ${mortgageType}, defaulting to Conv`);
        return 'Conv';
    }
  }

  /**
   * Get summary of filtering results
   */
  public static getFilterSummary(result: LoanTypeFilterResult, loanType?: string): string {
    const total = result.applicable.length + result.filtered.length;
    const filteredCount = result.filtered.length;
    const applicableCount = result.applicable.length;
    
    return `Loan Type Filter Summary for ${loanType || 'Unknown'}: ` +
           `${applicableCount}/${total} conditions applicable, ` +
           `${filteredCount} filtered out`;
  }
}