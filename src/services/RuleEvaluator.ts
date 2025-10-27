import { LoanCondition, LoanData, RuleEvaluationContext, RuleParser } from '../types';

export class RuleEvaluator implements RuleParser {
  
  evaluate(context: RuleEvaluationContext): boolean {
    const { loan, condition } = context;
    
    try {
      // First check if there's specific technical logic in Column Q (logicToApply) that's different from rules
      if (condition.logicToApply && 
          condition.logicToApply.trim() !== '' && 
          condition.logicToApply !== condition.rules &&
          (condition.logicToApply.includes('==') || condition.logicToApply.includes('In List:') || condition.logicToApply.includes('Not Blank'))) {
        const result = this.evaluateLogicExpression(condition.logicToApply, loan);
        if (result) console.log(`✓ ${condition.conditionCode} applies (TechLogic)`);
        return result;
      }
      
      // Otherwise, parse the rules text from Column C (or logicToApply if it's the same)
      const rulesText = condition.rules || condition.logicToApply || '';
      if (rulesText.trim() !== '') {
        const result = this.evaluateRulesText(rulesText, loan);
        if (result) console.log(`✓ ${condition.conditionCode} applies (Rules)`);
        return result;
      }
      
      return false;
    } catch (error) {
      console.error(`Error evaluating condition ${condition.conditionCode}:`, error);
      return false;
    }
  }

  private evaluateLogicExpression(logicExpression: string, loan: LoanData): boolean {
    const logic = logicExpression.toLowerCase().trim();
    
    // Handle specific logic patterns found in the CSV
    
    // Pattern: $RefiTypeVA == "IRRR"
    if (logic.includes('$refitypeva') && logic.includes('irrr')) {
      return loan.vaRefiType === 'IRRR' || loan.vaRefiType === 'IRRRL';
    }
    
    // Pattern: CashFromToBorrower < -500
    if (logic.includes('cashfromtoborrower') && logic.includes('< -500')) {
      return (loan.cashToBorrower || 0) < -500;
    }
    
    // Pattern: "FileData_OriginationChannel In List: Retail"
    if (logic.includes('filedata_originationchannel') && logic.includes('retail')) {
      // This would need to be mapped from loan data - placeholder logic
      return true; // Assume retail for now
    }
    
    // Pattern: "1003App1_LiquidAssets Not Blank"
    if (logic.includes('1003app1_liquidassets') && logic.includes('not blank')) {
      return Boolean(loan.bankAssets && loan.bankAssets.length > 0);
    }
    
    // Pattern: "1003App1_IncomeBase Not Blank"  
    if (logic.includes('1003app1_incomebase') && logic.includes('not blank')) {
      return Boolean(loan.income && loan.income.length > 0);
    }
    
    // Pattern: "Loan_MortgageType In List: VA"
    if (logic.includes('loan_mortgagetype') && logic.includes('va')) {
      return loan.mortgageType === 'VA';
    }
    
    return false;
  }

  private evaluateRulesText(rulesText: string, loan: LoanData): boolean {
    const rules = rulesText.toLowerCase().trim();
    
    // APP100 - Citizenship rule
    if (rules.includes('citizenship') && rules.includes('anything other than us citizen')) {
      return loan.citizenship !== undefined && loan.citizenship !== 'US Citizen';
    }
    
    // APP102 - LTV > 80% conventional
    if (rules.includes('conventional') && rules.includes('ltv') && rules.includes('greater than 80')) {
      return (loan.mortgageType === 'Conv' || loan.mortgageType === 'Conventional') && 
             (loan.ltv || 0) > 80;
    }
    
    // APP108 - All files conventional & govy with approved status
    if (rules.includes('all files conventional & govy') && rules.includes('approved')) {
      return ['Conv', 'Conventional', 'FHA', 'VA', 'USDA'].includes(loan.mortgageType || '') &&
             loan.ausResult === 'Approved';
    }
    
    // ASSET500 - Bank assets on URLA without VOA
    if (rules.includes('bank assets') && rules.includes('urla') && rules.includes('no voa')) {
      return Boolean(loan.bankAssets && loan.bankAssets.length > 0);
    }
    
    // ASSET507 - EMD > $0
    if (rules.includes('emd amount') && rules.includes('> $0')) {
      return (loan.earnestMoneyDeposit || 0) > 0;
    }
    
    // CLSNG827 - VA IRRRL loans
    if (rules.includes('va irrrl')) {
      return loan.mortgageType === 'VA' && 
             (loan.vaRefiType === 'IRRRL' || loan.vaRefiType === 'IRRR');
    }
    
    // CLSNG890 - VA Purchase
    if (rules.includes('loan: va, purchase')) {
      return loan.mortgageType === 'VA' && loan.loanPurpose === 'Purchase';
    }
    
    // CRED305 - Bankruptcy in last 7 years, no AUS approved, govy loans
    if (rules.includes('bk in the last 7 years') && rules.includes('no aus') && rules.includes('govy')) {
      return Boolean(loan.bankruptcy) && 
             loan.ausResult !== 'Approved' &&
             ['FHA', 'VA', 'USDA'].includes(loan.mortgageType || '');
    }
    
    // CRED308 - REO with linked mortgage liability
    if (rules.includes('reo') && rules.includes('linked to a mortgage liability')) {
      return Boolean(loan.reo && loan.reo.some(property => Boolean(property.linkedToMortgage)));
    }
    
    // CRED309 - Refinance with payoffs at closing
    if (rules.includes('refinance') && rules.includes('paid off at closing')) {
      return loan.loanPurpose === 'Refinance' &&
             loan.lienPosition === 1 &&
             ['Conv', 'FHA', 'VA', 'USDA'].includes(loan.mortgageType || '') &&
             Boolean(loan.reo && loan.reo.some(property => Boolean(property.paidOffAtClosing)));
    }
    
    // CRED317 - Lien position = 1
    if (rules.includes('lien position = 1')) {
      return loan.lienPosition === 1;
    }
    
    // CRED318 - FHA, USDA, VA community property states with married borrower
    if (rules.includes('fha, usda and va') && rules.includes('community property') && rules.includes('married')) {
      return ['FHA', 'VA', 'USDA'].includes(loan.mortgageType || '') &&
             loan.marriageStatus === 'Married';
    }
    
    // INC400 - Primary/Secondary employment, not self-employed
    if (rules.includes('employer status') && rules.includes('current') && rules.includes('self employed') && rules.includes('empty')) {
      return Boolean(loan.income && loan.income.length > 0) && 
             !Boolean(loan.selfEmployed) &&
             ['Conv', 'FHA', 'VA', 'USDA'].includes(loan.mortgageType || '');
    }
    
    // INC401/INC402 - Alimony income
    if (rules.includes('other income type = alimony')) {
      return Boolean(loan.income && loan.income.some(inc => inc.type.toLowerCase().includes('alimony')));
    }
    
    // INC406 - Pension income
    if (rules.includes('income with type = pension')) {
      return Boolean(loan.income && loan.income.some(inc => inc.type.toLowerCase().includes('pension')));
    }
    
    // INC407 - FHA self-employed or VA manual underwrite
    if (rules.includes('fha') && rules.includes('self-employed') || 
        rules.includes('va') && rules.includes('manual underwrite')) {
      return (loan.mortgageType === 'FHA' && Boolean(loan.selfEmployed)) ||
             (loan.mortgageType === 'VA' && loan.underwritingMethod === 'Manual');
    }
    
    // NEW CONST conditions
    if (rules.includes('new construction')) {
      const hasNewConstruction = Boolean(loan.newConstruction);
      
      if (rules.includes('va only')) {
        return loan.mortgageType === 'VA' && hasNewConstruction && loan.loanPurpose === 'Purchase';
      }
      
      if (rules.includes('fha new construction')) {
        return loan.mortgageType === 'FHA' && hasNewConstruction;
      }
      
      return hasNewConstruction;
    }
    
    // PROP601 - Hazard insurance for Conv/VA/FHA
    if (rules.includes('coventional') || rules.includes('conventional') || 
        (rules.includes('va') && rules.includes('fha') && rules.includes('hazard insurance'))) {
      return ['Conv', 'Conventional', 'VA', 'FHA'].includes(loan.mortgageType || '') &&
             loan.lienPosition === 1;
    }
    
    // PROP603/PROP616 - VA termite requirements
    if (rules.includes('va') && rules.includes('termite') && rules.includes('not irrrl')) {
      const termiteStates = [
        'Alabama', 'Arkansas', 'Arizona', 'California', 'Connecticut', 'Delaware', 
        'Florida', 'Georgia', 'Hawaii', 'Iowa', 'Illinois', 'Indiana', 'Kansas', 
        'Kentucky', 'Louisiana', 'Massachusetts', 'Maryland', 'Mississippi', 'Missouri', 
        'North Carolina', 'Nebraska', 'New Jersey', 'New Mexico', 'Nevada', 'Ohio', 
        'Oklahoma', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'Tennessee', 
        'Texas', 'Utah', 'Virginia', 'West Virginia', 'Washington, D.C.'
      ];
      
      return loan.mortgageType === 'VA' &&
             loan.vaRefiType !== 'IRRRL' &&
             !Boolean(loan.newConstruction) &&
             loan.lienPosition === 1 &&
             termiteStates.includes(loan.propertyState || '');
    }
    
    // PROP617 - VA Appraisal
    if (rules.includes('va') && rules.includes('exclude irrrl')) {
      return loan.mortgageType === 'VA' && 
             loan.vaRefiType !== 'IRRRL' &&
             loan.lienPosition === 1;
    }
    
    // TITLE901/TITLE908 - Title requirements
    if (rules.includes('preliminary title') || rules.includes('closing protection')) {
      return ['Conv', 'Conventional', 'VA', 'FHA', 'USDA'].includes(loan.mortgageType || '') &&
             loan.lienPosition === 1;
    }
    
    // Generic mortgage type checks
    if (rules.includes('conventional, fha, va and usda') || rules.includes('all transactions')) {
      return ['Conv', 'Conventional', 'FHA', 'VA', 'USDA'].includes(loan.mortgageType || '');
    }
    
    if (rules.includes('every loan') || rules.includes('all loans')) {
      return true;
    }
    
    // Default: if we can't parse the rule, don't apply the condition
    console.warn(`Unable to parse rule: ${rulesText}`);
    return false;
  }

  // Helper method to check if loan meets basic criteria for a condition type
  private meetsBasicCriteria(loan: LoanData, conditionType: string): boolean {
    switch (conditionType) {
      case 'APP':
        return true; // Application conditions can apply to any loan
      case 'ASSET':
        return loan.bankAssets !== undefined || loan.earnestMoneyDeposit !== undefined;
      case 'CRED':
        return true; // Credit conditions can apply to any loan
      case 'INC':
        return loan.income !== undefined && loan.income.length > 0;
      case 'PROP':
        return loan.propertyState !== undefined;
      case 'TITLE':
        return loan.lienPosition === 1;
      case 'CLSNG':
        return loan.mortgageType !== undefined;
      default:
        return true;
    }
  }
}