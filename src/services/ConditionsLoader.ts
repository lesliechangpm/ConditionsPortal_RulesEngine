import * as fs from 'fs';
import csv from 'csv-parser';
import { LoanCondition } from '../types';
import { LoanTypeFilter } from './LoanTypeFilter';

export class ConditionsLoader {
  private conditions: LoanCondition[] = [];
  private csvFilePath: string;

  constructor(csvFilePath: string = './ConditionsPortal_Loan_Conditions_Formatted.csv') {
    this.csvFilePath = csvFilePath;
  }

  async loadConditions(): Promise<LoanCondition[]> {
    if (this.conditions.length > 0) {
      return this.conditions;
    }

    return new Promise((resolve, reject) => {
      const conditions: LoanCondition[] = [];
      
      fs.createReadStream(this.csvFilePath)
        .pipe(csv({
          headers: [
            'conditionCode',     // Column A
            'stage',             // Column B  
            'rules',             // Column C
            'class',             // Column D
            'type',              // Column E
            'number',            // Column F
            'name',              // Column G
            'description',       // Column H
            'editableInByte',    // Column I
            'dynamicDescription', // Column J
            'borrowerDescription', // Column K
            'documentProvider',  // Column L
            'responsibility',    // Column M
            'category',          // Column N
            'borrowerScope',     // Column O
            'dynamicData',       // Column P
            'dataForLogic',      // Column Q1
            'logicToApply',      // Column Q2
            'byteFilter'         // Column R
          ]
        }))
        .on('data', (row) => {
          // Skip header row and empty rows
          if (row.conditionCode && row.conditionCode !== 'Condition Code' && row.conditionCode.trim() !== '') {
            const condition: LoanCondition = {
              conditionCode: row.conditionCode?.trim() || '',
              stage: row.stage?.trim() || '',
              rules: row.rules?.trim() || '',
              class: row.class?.trim() || '',
              type: row.type?.trim() || '',
              number: row.number?.trim() || '',
              name: row.name?.trim() || '',
              description: row.description?.trim() || '',
              editableInByte: row.editableInByte?.trim() || '',
              dynamicDescription: row.dynamicDescription?.trim() || undefined,
              borrowerDescription: row.borrowerDescription?.trim() || undefined,
              documentProvider: row.documentProvider?.trim() || '',
              responsibility: row.responsibility?.trim() || '',
              category: row.category?.trim() || '',
              borrowerScope: row.borrowerScope?.trim() || '',
              dynamicData: row.dynamicData?.trim() || undefined,
              dataForLogic: row.dataForLogic?.trim() || undefined,
              logicToApply: row.logicToApply?.trim() || undefined,
              byteFilter: row.byteFilter?.trim() || undefined
            };
            
            // Parse and store supported loan types
            const constraints = LoanTypeFilter.parseConditionConstraints(condition);
            if (constraints.length > 0) {
              const allTypes = constraints.flatMap(c => c.supportedTypes);
              condition.supportedLoanTypes = [...new Set(allTypes)];
            } else {
              // If no constraints found, assume applies to all loan types
              condition.supportedLoanTypes = ['Conv', 'FHA', 'VA', 'USDA', 'Non-QM'];
            }
            
            conditions.push(condition);
          }
        })
        .on('end', () => {
          this.conditions = conditions;
          console.log(`Loaded ${conditions.length} loan conditions from CSV`);
          resolve(conditions);
        })
        .on('error', (error) => {
          console.error('Error loading conditions CSV:', error);
          reject(error);
        });
    });
  }

  getConditions(): LoanCondition[] {
    return this.conditions;
  }

  getConditionsByStage(stage: 'PTD' | 'PTF' | 'POST'): LoanCondition[] {
    return this.conditions.filter(condition => condition.stage === stage);
  }

  getConditionByCode(code: string): LoanCondition | undefined {
    return this.conditions.find(condition => condition.conditionCode === code);
  }

  getConditionsByType(type: string): LoanCondition[] {
    return this.conditions.filter(condition => condition.type === type);
  }

  getConditionsByClass(classType: string): LoanCondition[] {
    return this.conditions.filter(condition => condition.class === classType);
  }

  async reloadConditions(): Promise<LoanCondition[]> {
    this.conditions = [];
    return this.loadConditions();
  }

  getConditionsCount(): number {
    return this.conditions.length;
  }

  getStagesSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    this.conditions.forEach(condition => {
      summary[condition.stage] = (summary[condition.stage] || 0) + 1;
    });
    return summary;
  }

  getLoanTypeSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    this.conditions.forEach(condition => {
      if (condition.supportedLoanTypes) {
        condition.supportedLoanTypes.forEach(loanType => {
          summary[loanType] = (summary[loanType] || 0) + 1;
        });
      }
    });
    return summary;
  }

  getConditionsByLoanType(loanType: string): LoanCondition[] {
    return this.conditions.filter(condition => 
      condition.supportedLoanTypes?.includes(loanType as any)
    );
  }
}