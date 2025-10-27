import { LoanData, LoanCondition } from '../types';

export class DynamicFieldProcessor {
  
  processDescription(condition: LoanCondition, loan: LoanData): string {
    let description = condition.description;
    
    // Use dynamic description if available
    if (condition.dynamicDescription && condition.dynamicDescription.trim() !== '') {
      description = condition.dynamicDescription;
    }
    
    // Process dynamic field substitutions
    description = this.substituteDynamicFields(description, loan, condition);
    
    return description;
  }

  processBorrowerDescription(condition: LoanCondition, loan: LoanData): string | undefined {
    if (!condition.borrowerDescription) {
      return undefined;
    }
    
    let description = condition.borrowerDescription;
    description = this.substituteDynamicFields(description, loan, condition);
    
    return description;
  }

  private substituteDynamicFields(text: string, loan: LoanData, condition: LoanCondition): string {
    let processedText = text;
    
    // Common field substitutions based on the CSV data
    const substitutions: Record<string, string> = {};
    
    // Extract dynamic data fields from condition.dynamicData
    if (condition.dynamicData) {
      this.parseDynamicDataFields(condition.dynamicData, loan, substitutions);
    }
    
    // Standard field mappings
    substitutions['<Monthly PITI>'] = this.formatCurrency(loan.monthlyPiti);
    substitutions['<Earnest Money Deposit>'] = this.formatCurrency(loan.earnestMoneyDeposit);
    substitutions['<ReqMIPercent>'] = this.getMortgageInsurancePercent(loan);
    substitutions['<MI Company Name>'] = this.getMICompanyName(loan);
    substitutions['<MI Rate Factor>'] = this.getMIRateFactor(loan);
    substitutions['<MI Type>'] = this.getMIType(loan);
    substitutions['<MI $ Amount>'] = this.formatCurrency(this.getMIAmount(loan));
    
    // Borrower and property specific fields
    substitutions['<#>'] = this.getRequiredMonths(loan, condition).toString();
    
    // REO property addresses
    if (loan.reo && loan.reo.length > 0) {
      substitutions['<<property address from REO linked to mortgage>>'] = loan.reo[0].address;
      substitutions['<REO.Street>'] = loan.reo[0].address;
    }
    
    // Date fields
    const applicationDate = new Date().toLocaleDateString();
    substitutions['<application date>'] = applicationDate;
    
    // Years for tax returns
    const currentYear = new Date().getFullYear();
    substitutions['______'] = `${currentYear - 1} & ${currentYear - 2}`;
    substitutions['_____ & _____'] = `${currentYear - 1} & ${currentYear - 2}`;
    
    // Apply all substitutions
    for (const [placeholder, value] of Object.entries(substitutions)) {
      if (value && value !== 'undefined' && value !== '') {
        processedText = processedText.replace(new RegExp(this.escapeRegex(placeholder), 'g'), value);
      }
    }
    
    // Handle blank fields that need to be filled
    processedText = this.handleBlankFields(processedText, loan, condition);
    
    return processedText;
  }

  private parseDynamicDataFields(dynamicData: string, loan: LoanData, substitutions: Record<string, string>): void {
    // Parse dynamic data fields like:
    // "<ReqMIPercent> \n<MI Company Name> \n<MI Rate Factor>\n<MI Type> \n<MI $ Amount>"
    
    const fields = dynamicData.split('\n').map(f => f.trim()).filter(f => f);
    
    fields.forEach(field => {
      switch (field) {
        case '<ReqMIPercent>':
          substitutions[field] = this.getMortgageInsurancePercent(loan);
          break;
        case '<MI Company Name>':
          substitutions[field] = this.getMICompanyName(loan);
          break;
        case '<MI Rate Factor>':
          substitutions[field] = this.getMIRateFactor(loan);
          break;
        case '<MI Type>':
          substitutions[field] = this.getMIType(loan);
          break;
        case '<MI $ Amount>':
          substitutions[field] = this.formatCurrency(this.getMIAmount(loan));
          break;
        case '<Monthly PITI>':
          substitutions[field] = this.formatCurrency(loan.monthlyPiti);
          break;
        case '<Earnest Money Deposit Amount>':
          substitutions[field] = this.formatCurrency(loan.earnestMoneyDeposit);
          break;
      }
    });
  }

  private getMortgageInsurancePercent(loan: LoanData): string {
    // Calculate required MI percentage based on LTV and loan type
    if (loan.mortgageType === 'FHA') {
      return loan.ltv && loan.ltv <= 90 ? '0.80%' : '0.85%';
    } else if (loan.mortgageType === 'Conv' || loan.mortgageType === 'Conventional') {
      if (loan.ltv && loan.ltv <= 85) return '0.25%';
      if (loan.ltv && loan.ltv <= 90) return '0.35%';
      if (loan.ltv && loan.ltv <= 95) return '0.52%';
      return '0.65%';
    }
    return '0.35%'; // Default
  }

  private getMICompanyName(loan: LoanData): string {
    // This would typically come from loan data or be configurable
    return 'Genworth Mortgage Insurance';
  }

  private getMIRateFactor(loan: LoanData): string {
    // Rate factor calculation based on loan characteristics
    return '0.35';
  }

  private getMIType(loan: LoanData): string {
    // Determine MI type (BPMI, LPMI, Monthly, etc.)
    return 'Monthly';
  }

  private getMIAmount(loan: LoanData): number {
    // Calculate MI amount based on loan amount and rate factor
    if (loan.loanAmount) {
      const rateFactor = parseFloat(this.getMIRateFactor(loan));
      return loan.loanAmount * (rateFactor / 100) / 12; // Monthly amount
    }
    return 0;
  }

  private getRequiredMonths(loan: LoanData, condition: LoanCondition): number {
    // Determine required months based on mortgage type and condition
    if (condition.conditionCode.startsWith('ASSET')) {
      if (loan.mortgageType === 'VA') return 1;
      if (loan.mortgageType === 'FHA') return 2;
      if (loan.mortgageType === 'Conv' || loan.mortgageType === 'Conventional') return 2;
      if (loan.mortgageType === 'USDA') return 1;
    }
    return 2; // Default
  }

  private handleBlankFields(text: string, loan: LoanData, condition: LoanCondition): string {
    let processedText = text;
    
    // Handle patterns like "_____ months" 
    if (processedText.includes('___ months')) {
      const months = this.getRequiredMonths(loan, condition);
      processedText = processedText.replace(/___ months/g, `${months} months`);
    }
    
    // Handle patterns like "for _____" (borrower name)
    if (processedText.includes('for _______.')) {
      processedText = processedText.replace(/for _______\./g, 'for borrower.');
    }
    
    // Handle patterns like "to support $______" (amount)
    if (processedText.includes('to support $_______')) {
      if (loan.income && loan.income.length > 0) {
        const totalIncome = loan.income.reduce((sum, inc) => sum + inc.amount, 0);
        processedText = processedText.replace(/to support \$_______/g, `to support ${this.formatCurrency(totalIncome)}`);
      }
    }
    
    // Handle employment/business specific blanks
    if (processedText.includes('from _____')) {
      processedText = processedText.replace(/from _____/g, 'from employer');
    }
    
    if (processedText.includes('for _____')) {
      processedText = processedText.replace(/for _____/g, 'for business');
    }
    
    // Handle property address blanks
    if (processedText.includes('located at ____')) {
      if (loan.reo && loan.reo.length > 0) {
        processedText = processedText.replace(/located at ____/g, `located at ${loan.reo[0].address}`);
      }
    }
    
    return processedText;
  }

  private formatCurrency(amount?: number): string {
    if (amount === undefined || amount === null) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Method to get all dynamic fields that would be substituted
  getDynamicFields(condition: LoanCondition, loan: LoanData): Record<string, string> {
    const fields: Record<string, string> = {};
    
    if (condition.dynamicData) {
      const dynamicDataFields = condition.dynamicData.split('\n').map(f => f.trim()).filter(f => f);
      
      dynamicDataFields.forEach(field => {
        switch (field) {
          case '<ReqMIPercent>':
            fields.ReqMIPercent = this.getMortgageInsurancePercent(loan);
            break;
          case '<MI Company Name>':
            fields.MICompanyName = this.getMICompanyName(loan);
            break;
          case '<MI Rate Factor>':
            fields.MIRateFactor = this.getMIRateFactor(loan);
            break;
          case '<MI Type>':
            fields.MIType = this.getMIType(loan);
            break;
          case '<MI $ Amount>':
            fields.MIAmount = this.formatCurrency(this.getMIAmount(loan));
            break;
          case '<Monthly PITI>':
            fields.MonthlyPITI = this.formatCurrency(loan.monthlyPiti);
            break;
          case '<Earnest Money Deposit Amount>':
            fields.EarnestMoneyDeposit = this.formatCurrency(loan.earnestMoneyDeposit);
            break;
        }
      });
    }
    
    return fields;
  }
}