import { ConditionsLoader } from './ConditionsLoader';
import { MismoParser } from './MismoParser';
import { RuleEvaluator } from './RuleEvaluator';
import { DynamicFieldProcessor } from './DynamicFieldProcessor';
import { LoanTypeFilter } from './LoanTypeFilter';
import { LoanData, LoanCondition, ConditionResult, ApplicableCondition, Stage } from '../types';

export class LoanConditionsService {
  private conditionsLoader: ConditionsLoader;
  private mismoParser: MismoParser;
  private ruleEvaluator: RuleEvaluator;
  private dynamicProcessor: DynamicFieldProcessor;
  private conditions: LoanCondition[] = [];

  constructor(csvFilePath?: string) {
    this.conditionsLoader = new ConditionsLoader(csvFilePath);
    this.mismoParser = new MismoParser();
    this.ruleEvaluator = new RuleEvaluator();
    this.dynamicProcessor = new DynamicFieldProcessor();
  }

  async initialize(): Promise<void> {
    this.conditions = await this.conditionsLoader.loadConditions();
    console.log(`Loaded ${this.conditions.length} conditions for evaluation`);
  }

  async evaluateLoan(xmlContent: string): Promise<ConditionResult> {
    try {
      // Ensure conditions are loaded
      if (this.conditions.length === 0) {
        await this.initialize();
      }

      // Parse the MISMO XML file
      const loanData = this.mismoParser.parseLoanFile(xmlContent);
      
      // Evaluate all conditions against the loan
      const applicableConditions = await this.evaluateConditions(loanData);
      
      // Group conditions by stage and format result
      const result = this.formatResult(applicableConditions, loanData);
      
      return result;
    } catch (error) {
      console.error('Error evaluating loan:', error);
      throw error;
    }
  }

  async evaluateConditions(loanData: LoanData): Promise<ApplicableCondition[]> {
    const applicableConditions: ApplicableCondition[] = [];
    
    console.log(`Evaluating ${this.conditions.length} conditions against loan data`);
    
    // Step 1: Filter conditions by loan type
    const filterResult = LoanTypeFilter.filterConditionsByLoanType(this.conditions, loanData);
    const filteredConditions = filterResult.applicable;
    
    console.log(`Loan Type Filtering: ${filteredConditions.length}/${this.conditions.length} conditions applicable for ${loanData.mortgageType || 'Unknown'} loans`);
    
    if (filterResult.filtered.length > 0) {
      console.log(`Filtered out ${filterResult.filtered.length} conditions due to loan type mismatch:`);
      filterResult.filtered.slice(0, 5).forEach(condition => {
        const reason = filterResult.filterReasons[condition.conditionCode];
        console.log(`  - ${condition.conditionCode}: ${reason}`);
      });
      if (filterResult.filtered.length > 5) {
        console.log(`  ... and ${filterResult.filtered.length - 5} more`);
      }
    }
    
    // Step 2: Evaluate remaining conditions using business rules
    for (const condition of filteredConditions) {
      try {
        // Evaluate if this condition applies to the loan
        const isApplicable = this.ruleEvaluator.evaluate({
          loan: loanData,
          condition: condition
        });
        
        if (isApplicable) {
          // Process dynamic fields and create applicable condition
          const applicableCondition = this.createApplicableCondition(condition, loanData);
          applicableConditions.push(applicableCondition);
          
          console.log(`✓ ${condition.conditionCode} applies (Rules)`);
          console.log(`✓ Condition ${condition.conditionCode} applies`);
        }
      } catch (error) {
        console.error(`Error evaluating condition ${condition.conditionCode}:`, error);
        // Continue with other conditions
      }
    }
    
    console.log(`Found ${applicableConditions.length} applicable conditions`);
    return applicableConditions;
  }

  private createApplicableCondition(condition: LoanCondition, loanData: LoanData): ApplicableCondition {
    // Process description with dynamic field substitution
    const processedDescription = this.dynamicProcessor.processDescription(condition, loanData);
    const processedBorrowerDescription = this.dynamicProcessor.processBorrowerDescription(condition, loanData);
    
    // Get dynamic fields for reference
    const dynamicFields = this.dynamicProcessor.getDynamicFields(condition, loanData);
    
    const applicableCondition: ApplicableCondition = {
      conditionCode: condition.conditionCode,
      class: condition.class,
      description: processedDescription,
      borrowerDescription: processedBorrowerDescription,
      documentProvider: condition.documentProvider,
      category: condition.category
    };
    
    // Add dynamic fields if they exist
    if (Object.keys(dynamicFields).length > 0) {
      applicableCondition.dynamicFields = dynamicFields;
    }
    
    // Generate reason why this condition was applied
    applicableCondition.reasonApplied = this.generateReasonApplied(condition, loanData);
    
    return applicableCondition;
  }

  private formatResult(applicableConditions: ApplicableCondition[], loanData: LoanData): ConditionResult {
    // Group conditions by stage
    const conditionsByStage: Record<Stage, ApplicableCondition[]> = {
      PTD: [],
      PTF: [],
      POST: []
    };
    
    // Map each applicable condition to its stage
    for (const applicableCondition of applicableConditions) {
      // Find the original condition to get the stage
      const originalCondition = this.conditions.find(c => c.conditionCode === applicableCondition.conditionCode);
      if (originalCondition) {
        const stage = originalCondition.stage as Stage;
        if (conditionsByStage[stage]) {
          conditionsByStage[stage].push(applicableCondition);
        }
      }
    }
    
    // Sort conditions within each stage by condition code
    Object.keys(conditionsByStage).forEach(stage => {
      conditionsByStage[stage as Stage].sort((a, b) => a.conditionCode.localeCompare(b.conditionCode));
    });
    
    const result: ConditionResult = {
      loanId: loanData.loanId,
      evaluationDate: new Date().toISOString(),
      conditions: conditionsByStage,
      totalConditions: applicableConditions.length
    };
    
    return result;
  }

  // Method to get condition statistics
  getConditionsStats(): {
    total: number;
    byStage: Record<string, number>;
    byType: Record<string, number>;
    byClass: Record<string, number>;
    byLoanType: Record<string, number>;
  } {
    const stats = {
      total: this.conditions.length,
      byStage: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byClass: {} as Record<string, number>,
      byLoanType: {} as Record<string, number>
    };
    
    this.conditions.forEach(condition => {
      // Count by stage
      stats.byStage[condition.stage] = (stats.byStage[condition.stage] || 0) + 1;
      
      // Count by type
      stats.byType[condition.type] = (stats.byType[condition.type] || 0) + 1;
      
      // Count by class
      stats.byClass[condition.class] = (stats.byClass[condition.class] || 0) + 1;
      
      // Count by supported loan types
      if (condition.supportedLoanTypes) {
        condition.supportedLoanTypes.forEach(loanType => {
          stats.byLoanType[loanType] = (stats.byLoanType[loanType] || 0) + 1;
        });
      }
    });
    
    return stats;
  }

  // Method to get specific condition details
  getConditionDetails(conditionCode: string): LoanCondition | undefined {
    return this.conditions.find(c => c.conditionCode === conditionCode);
  }

  // Method to search conditions
  searchConditions(searchTerm: string): LoanCondition[] {
    const term = searchTerm.toLowerCase();
    return this.conditions.filter(condition => 
      condition.conditionCode.toLowerCase().includes(term) ||
      condition.name.toLowerCase().includes(term) ||
      condition.description.toLowerCase().includes(term) ||
      condition.rules.toLowerCase().includes(term)
    );
  }

  // Method to validate a loan data structure
  validateLoanData(loanData: LoanData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic validation
    if (!loanData.mortgageType) {
      errors.push('Mortgage type is required');
    }
    
    if (!loanData.loanPurpose) {
      errors.push('Loan purpose is required');
    }
    
    if (loanData.loanAmount !== undefined && loanData.loanAmount <= 0) {
      errors.push('Loan amount must be greater than 0');
    }
    
    if (loanData.ltv !== undefined && (loanData.ltv <= 0 || loanData.ltv > 100)) {
      errors.push('LTV must be between 0 and 100');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Generate reason why a condition was applied
  private generateReasonApplied(condition: LoanCondition, loanData: LoanData): string {
    const reasons: string[] = [];
    const rules = condition.rules.toLowerCase();
    const conditionCode = condition.conditionCode;
    
    // Specific condition-by-condition analysis
    switch (conditionCode) {
      case 'APP100':
        if (loanData.citizenship && loanData.citizenship !== 'US Citizen') {
          reasons.push(`Citizenship = "${loanData.citizenship}" (not US Citizen)`);
        }
        break;
        
      case 'APP102':
        if (loanData.ltv && loanData.ltv > 80) {
          reasons.push(`LTV = ${loanData.ltv}% (> 80%)`);
        }
        if (loanData.loanPurpose) {
          reasons.push(`Loan Purpose = ${loanData.loanPurpose}`);
        }
        if (loanData.mortgageType) {
          reasons.push(`Loan Type = ${loanData.mortgageType}`);
        }
        break;
        
      case 'APP108':
        if (loanData.ausResult === 'Approved') {
          reasons.push(`AUS Result = ${loanData.ausResult}`);
        }
        if (loanData.mortgageType) {
          reasons.push(`Loan Type = ${loanData.mortgageType}`);
        }
        break;
        
      case 'ASSET500':
        if (loanData.hasBankAssets) {
          reasons.push('Bank Assets Present');
          if (loanData.bankAssets?.length) {
            const totalAssets = loanData.bankAssets.reduce((sum, asset) => sum + asset.amount, 0);
            reasons.push(`Total Bank Assets = $${totalAssets.toLocaleString()}`);
          }
        }
        break;
        
      case 'ASSET507':
        if (loanData.earnestMoneyDeposit) {
          reasons.push(`EMD = $${loanData.earnestMoneyDeposit.toLocaleString()} (≥ $1)`);
        }
        break;
        
      case 'CRED305':
        if (loanData.bankruptcy) {
          reasons.push('Bankruptcy = true');
        }
        if (loanData.ausResult !== 'Approved') {
          reasons.push(`AUS Result = ${loanData.ausResult || 'Not Approved'}`);
        }
        if (loanData.mortgageType && ['FHA', 'VA', 'USDA'].includes(loanData.mortgageType)) {
          reasons.push(`Government Loan Type = ${loanData.mortgageType}`);
        }
        break;
        
      case 'CRED308':
        if (loanData.reo?.some(property => property.linkedToMortgage)) {
          reasons.push('REO Property with Linked Mortgage');
          const linkedReo = loanData.reo.filter(property => property.linkedToMortgage);
          reasons.push(`${linkedReo.length} REO Properties with Mortgages`);
        }
        break;
        
      case 'CRED318':
        if (['FHA', 'VA', 'USDA'].includes(loanData.mortgageType || '')) {
          reasons.push(`Government Loan = ${loanData.mortgageType}`);
        }
        if (loanData.marriageStatus === 'Married') {
          reasons.push(`Marital Status = ${loanData.marriageStatus}`);
        }
        break;
        
      case 'INC401':
      case 'INC402':
        if (loanData.hasAlimonyIncome) {
          reasons.push('Alimony Income Present');
          const alimonyIncome = loanData.income?.filter(inc => 
            inc.type.toLowerCase() === 'alimony'
          );
          if (alimonyIncome?.length) {
            const totalAlimony = alimonyIncome.reduce((sum, inc) => sum + inc.amount, 0);
            reasons.push(`Monthly Alimony = $${totalAlimony.toLocaleString()}`);
          }
        }
        break;
        
      case 'INC4xx':
        if (loanData.hasChildSupportIncome) {
          reasons.push('Child Support Income Present');
          const childSupportIncome = loanData.income?.filter(inc => 
            inc.type.toLowerCase() === 'child support'
          );
          if (childSupportIncome?.length) {
            const totalChildSupport = childSupportIncome.reduce((sum, inc) => sum + inc.amount, 0);
            reasons.push(`Monthly Child Support = $${totalChildSupport.toLocaleString()}`);
          }
        }
        break;
        
      case 'INC400':
      case 'INC403':
      case 'INC404':
        if (loanData.income?.some(inc => inc.type === 'Employment')) {
          reasons.push('Employment Income Present');
        }
        if (!loanData.selfEmployed) {
          reasons.push('Not Self-Employed');
        }
        break;
        
      case 'INC407':
        if (loanData.mortgageType === 'FHA' && loanData.selfEmployed) {
          reasons.push('FHA Loan + Self-Employed');
        }
        if (loanData.mortgageType === 'VA' && loanData.underwritingMethod === 'Manual') {
          reasons.push('VA Loan + Manual Underwrite');
        }
        break;
        
      case 'INC409':
        // Retirement funds condition - would need specific asset type checking
        reasons.push('Retirement Account Assets Present');
        break;
        
      case 'CLSNG827':
        if (loanData.mortgageType === 'VA' && loanData.vaRefiType === 'IRRRL') {
          reasons.push(`VA ${loanData.vaRefiType} Refinance`);
        }
        break;
        
      case 'CLSNG890':
        if (loanData.mortgageType === 'VA' && loanData.loanPurpose === 'Purchase') {
          reasons.push(`VA ${loanData.loanPurpose} Transaction`);
        }
        break;
        
      default:
        // Handle NEW CONST conditions
        if (conditionCode.startsWith('NEW CONST')) {
          if (loanData.newConstruction) {
            reasons.push('New Construction = true');
          }
          if (loanData.mortgageType) {
            reasons.push(`Loan Type = ${loanData.mortgageType}`);
          }
          if (loanData.propertyState) {
            reasons.push(`Property State = ${loanData.propertyState}`);
          }
        }
        // Handle PROP conditions
        else if (conditionCode.startsWith('PROP')) {
          if (loanData.lienPosition === 1) {
            reasons.push(`Lien Position = ${loanData.lienPosition}`);
          }
          if (loanData.propertyState && conditionCode.includes('603') || conditionCode.includes('616')) {
            // Termite inspection states
            reasons.push(`Property State = ${loanData.propertyState} (Termite Required)`);
          }
        }
        // Handle TITLE conditions
        else if (conditionCode.startsWith('TITLE')) {
          if (loanData.lienPosition === 1) {
            reasons.push(`Lien Position = ${loanData.lienPosition}`);
          }
        }
        break;
    }
    
    // Add loan type as context if not already specified
    if (reasons.length === 0 || !reasons.some(r => r.includes('Loan Type'))) {
      if (loanData.mortgageType) {
        // Check if this is a loan-type specific condition
        if (condition.supportedLoanTypes && condition.supportedLoanTypes.length < 4) {
          reasons.push(`Loan Type = ${loanData.mortgageType} (Supported)`);
        } else {
          reasons.push(`Applies to ${loanData.mortgageType} loans`);
        }
      }
    }
    
    // Fallback if still no reasons
    if (reasons.length === 0) {
      reasons.push('General loan requirement');
    }
    
    return reasons.join(', ');
  }

  // Method to reload conditions from CSV
  async reloadConditions(): Promise<void> {
    this.conditions = await this.conditionsLoader.reloadConditions();
    console.log(`Reloaded ${this.conditions.length} conditions`);
  }
}