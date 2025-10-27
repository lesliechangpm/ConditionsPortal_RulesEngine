import { ConditionsLoader } from './ConditionsLoader';
import { MismoParser } from './MismoParser';
import { RuleEvaluator } from './RuleEvaluator';
import { DynamicFieldProcessor } from './DynamicFieldProcessor';
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
    
    for (const condition of this.conditions) {
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
  } {
    const stats = {
      total: this.conditions.length,
      byStage: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byClass: {} as Record<string, number>
    };
    
    this.conditions.forEach(condition => {
      // Count by stage
      stats.byStage[condition.stage] = (stats.byStage[condition.stage] || 0) + 1;
      
      // Count by type
      stats.byType[condition.type] = (stats.byType[condition.type] || 0) + 1;
      
      // Count by class
      stats.byClass[condition.class] = (stats.byClass[condition.class] || 0) + 1;
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

  // Method to reload conditions from CSV
  async reloadConditions(): Promise<void> {
    this.conditions = await this.conditionsLoader.reloadConditions();
    console.log(`Reloaded ${this.conditions.length} conditions`);
  }
}