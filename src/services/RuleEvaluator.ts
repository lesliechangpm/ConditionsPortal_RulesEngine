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
    
    // Enhanced mortgage type validation patterns
    if (this.containsMortgageTypeLogic(logic)) {
      return this.evaluateMortgageTypeLogic(logic, loan);
    }
    
    // Pattern: "Lien Position = 1"
    if (logic.includes('lien position') && logic.includes('= 1')) {
      return loan.lienPosition === 1;
    }
    
    // Pattern: "Is this loan a new construction [Home Form] = Yes"
    if (logic.includes('new construction') && logic.includes('= yes')) {
      return Boolean(loan.newConstruction);
    }
    
    // Pattern: "Loan Purpose = Purchase"
    if (logic.includes('loan purpose') && logic.includes('purchase')) {
      return loan.loanPurpose?.toLowerCase() === 'purchase';
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
    
    // ASSET500 - Bank assets on URLA without VOA (updated to use parsed flag)
    if (rules.includes('bank assets') && rules.includes('urla')) {
      return Boolean(loan.hasBankAssets);
    }
    
    // ASSET507 - EMD >= $1 (updated per user requirement)
    if (rules.includes('emd amount is > $0')) {
      return (loan.earnestMoneyDeposit || 0) >= 1;
    }
    
    // CLSNG827 - VA IRRRL loans
    if (rules.includes('va irrrl') || rules.includes('all va irrrl')) {
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
    
    // General bankruptcy conditions - trigger when BankruptcyIndicator is true
    if (rules.includes('bankruptcy') || rules.includes('bankrupt')) {
      return Boolean(loan.bankruptcy);
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
    
    // INC401/INC402 - Alimony income (updated to use parsed flag)
    if (rules.includes('other income type = alimony') || rules.includes('alimony')) {
      return Boolean(loan.hasAlimonyIncome);
    }
    
    // INC4xx - Child support income
    if (rules.includes('child support') || rules.includes('other income type = child support')) {
      return Boolean(loan.hasChildSupportIncome);
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
    
    // CRED301 - REO to be sold exists
    if (rules.includes('any reo to be sold exists')) {
      return Boolean(loan.reo && loan.reo.some(property => Boolean(property.markedToBeSold)));
    }
    
    // CRED310 - REO refinance payoff at closing
    if (rules.includes('loan purpose = refinance') && rules.includes('any reo has a mortgage') && rules.includes('marked to be paid off at closing')) {
      return loan.loanPurpose === 'Refinance' &&
             loan.lienPosition === 1 &&
             ['Conv', 'FHA', 'VA', 'USDA'].includes(loan.mortgageType || '') &&
             Boolean(loan.reo && loan.reo.some(property => 
               Boolean(property.linkedToMortgage) && Boolean(property.paidOffAtClosing)));
    }
    
    // CRED320 - Credit was run
    if (rules.includes('conventional, fha, va and usda where credit was run')) {
      return ['Conv', 'Conventional', 'FHA', 'VA', 'USDA'].includes(loan.mortgageType || '') &&
             Boolean(loan.creditRunIndicator);
    }
    
    // INC408 - Self-employed with high ownership or family employment
    if (rules.includes('self employed or business owner field is not empty') && 
        (rules.includes('ownership share = greater than or equal to 25 percent') || 
         rules.includes('employed by family or party to transaction field = yes'))) {
      return Boolean(loan.selfEmployed === true) &&
             Boolean(loan.income && loan.income.some(inc => 
               (inc.ownershipShare !== undefined && inc.ownershipShare >= 25) ||
               Boolean(inc.employedByFamily)));
    }
    
    // INC423 - Government loan employment verification
    if (rules.includes('all fha, va and usda transactions')) {
      return ['FHA', 'VA', 'USDA'].includes(loan.mortgageType || '');
    }
    
    // NEW CONST1400 - VA new construction acknowledgment
    if (rules.includes('va only') && rules.includes('new construction checkbox = true only') && rules.includes('purchase only')) {
      return loan.mortgageType === 'VA' &&
             Boolean(loan.newConstruction) &&
             loan.loanPurpose === 'Purchase';
    }
    
    // NEW CONST1401 - Termite protection for new construction
    if (rules.includes('new const in specific states') && rules.includes('usda/va/fha')) {
      const termiteStates = [
        'Alabama', 'Arkansas', 'Arizona', 'California', 'Connecticut', 'Delaware', 
        'Florida', 'Georgia', 'Hawaii', 'Iowa', 'Illinois', 'Indiana', 'Kansas', 
        'Kentucky', 'Louisiana', 'Massachusetts', 'Maryland', 'Mississippi', 'Missouri', 
        'North Carolina', 'Nebraska', 'New Jersey', 'New Mexico', 'Nevada', 'Ohio', 
        'Oklahoma', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'Tennessee', 
        'Texas', 'Utah', 'Virginia', 'West Virginia', 'Washington, D.C.'
      ];
      
      return ['USDA', 'VA', 'FHA'].includes(loan.mortgageType || '') &&
             Boolean(loan.newConstruction) &&
             termiteStates.includes(loan.propertyState || '');
    }
    
    // NEW CONST1404 - FHA new construction certification
    if (rules.includes('all fha new construction purchase')) {
      return loan.mortgageType === 'FHA' &&
             Boolean(loan.newConstruction) &&
             loan.loanPurpose === 'Purchase';
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

  private containsMortgageTypeLogic(logic: string): boolean {
    return logic.includes('mortgage type') || 
           logic.includes('loan_mortgagetype') ||
           logic.includes('loan:');
  }
  
  private evaluateMortgageTypeLogic(logic: string, loan: LoanData): boolean {
    const loanType = loan.mortgageType?.toLowerCase() || '';
    
    // Pattern: "Mortgage Type = VA"
    if (logic.includes('mortgage type = va') || logic.includes('loan: va')) {
      return loanType === 'va';
    }
    
    // Pattern: "Mortgage Type = FHA"  
    if (logic.includes('mortgage type = fha') || logic.includes('loan: fha')) {
      return loanType === 'fha';
    }
    
    // Pattern: "Mortgage Type = Conv"
    if (logic.includes('mortgage type = conv') || logic.includes('mortgage type = conventional')) {
      return loanType === 'conv' || loanType === 'conventional';
    }
    
    // Pattern: "Mortgage Type = USDA"
    if (logic.includes('mortgage type = usda') || logic.includes('mortgage type = rhs')) {
      return loanType === 'usda' || loanType === 'rhs';
    }
    
    // Pattern: "Loan_MortgageType In List: VA"
    if (logic.includes('loan_mortgagetype') && logic.includes('in list')) {
      if (logic.includes('va')) return loanType === 'va';
      if (logic.includes('fha')) return loanType === 'fha';
      if (logic.includes('conv')) return loanType === 'conv' || loanType === 'conventional';
      if (logic.includes('usda')) return loanType === 'usda';
    }
    
    // Pattern: "Mortgage Type is NOT Non-QM" 
    if (logic.includes('mortgage type is not non-qm') || logic.includes('mortgage type ≠ non-qm')) {
      return loanType !== 'non-qm' && loanType !== 'nonqm';
    }
    
    // Multiple type patterns like "Mortgage Type = Conv -or- FHA -or- VA -or- RHS"
    if (logic.includes('-or-') && logic.includes('mortgage type')) {
      const supportedTypes = [];
      if (logic.includes('conv')) supportedTypes.push('conv', 'conventional');
      if (logic.includes('fha')) supportedTypes.push('fha');
      if (logic.includes('va')) supportedTypes.push('va');
      if (logic.includes('usda') || logic.includes('rhs')) supportedTypes.push('usda', 'rhs');
      
      return supportedTypes.includes(loanType);
    }
    
    return true; // Default to true if no specific mortgage type logic found
  }
}