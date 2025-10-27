import { RuleEvaluator } from '../src/services/RuleEvaluator';
import { LoanData, LoanCondition, RuleEvaluationContext } from '../src/types';

describe('RuleEvaluator', () => {
  let ruleEvaluator: RuleEvaluator;

  beforeEach(() => {
    ruleEvaluator = new RuleEvaluator();
  });

  describe('Citizenship Rules', () => {
    it('should apply APP100 when citizenship is not US Citizen', () => {
      const loan: LoanData = {
        citizenship: 'Permanent Resident',
        mortgageType: 'Conv'
      };

      const condition: LoanCondition = {
        conditionCode: 'APP100',
        stage: 'PTD',
        rules: 'This conditions would apply to any file where the citizenship is anything other than US Citizen',
        class: 'UW',
        type: 'APP',
        number: '100',
        name: 'Visa/EAD',
        description: 'Copy of borrowers unexpired visa/EAD or legal US residency verification.',
        editableInByte: 'Editable',
        documentProvider: 'BWR',
        responsibility: 'Underwriter',
        category: 'Borrower',
        borrowerScope: 'Borrower'
      };

      const context: RuleEvaluationContext = { loan, condition };
      const result = ruleEvaluator.evaluate(context);

      expect(result).toBe(true);
    });

    it('should not apply APP100 when citizenship is US Citizen', () => {
      const loan: LoanData = {
        citizenship: 'US Citizen',
        mortgageType: 'Conv'
      };

      const condition: LoanCondition = {
        conditionCode: 'APP100',
        stage: 'PTD',
        rules: 'This conditions would apply to any file where the citizenship is anything other than US Citizen',
        class: 'UW',
        type: 'APP',
        number: '100',
        name: 'Visa/EAD',
        description: 'Copy of borrowers unexpired visa/EAD or legal US residency verification.',
        editableInByte: 'Editable',
        documentProvider: 'BWR',
        responsibility: 'Underwriter',
        category: 'Borrower',
        borrowerScope: 'Borrower'
      };

      const context: RuleEvaluationContext = { loan, condition };
      const result = ruleEvaluator.evaluate(context);

      expect(result).toBe(false);
    });
  });

  describe('LTV Rules', () => {
    it('should apply APP102 when LTV > 80% for conventional loans', () => {
      const loan: LoanData = {
        mortgageType: 'Conv',
        ltv: 85,
        loanPurpose: 'Purchase'
      };

      const condition: LoanCondition = {
        conditionCode: 'APP102',
        stage: 'PTD',
        rules: 'This would be on any conventional purchase or refi where our LTV is greater than 80%. Some product codes will be excluded.',
        class: 'Processor III',
        type: 'APP',
        number: '102',
        name: '',
        description: 'CMG Lender requires ______ % mortgage insurance coverage.',
        editableInByte: 'Editable',
        documentProvider: 'INT',
        responsibility: 'Resp',
        category: 'Loan',
        borrowerScope: 'Loan'
      };

      const context: RuleEvaluationContext = { loan, condition };
      const result = ruleEvaluator.evaluate(context);

      expect(result).toBe(true);
    });

    it('should not apply APP102 when LTV <= 80%', () => {
      const loan: LoanData = {
        mortgageType: 'Conv',
        ltv: 75,
        loanPurpose: 'Purchase'
      };

      const condition: LoanCondition = {
        conditionCode: 'APP102',
        stage: 'PTD',
        rules: 'This would be on any conventional purchase or refi where our LTV is greater than 80%. Some product codes will be excluded.',
        class: 'Processor III',
        type: 'APP',
        number: '102',
        name: '',
        description: 'CMG Lender requires ______ % mortgage insurance coverage.',
        editableInByte: 'Editable',
        documentProvider: 'INT',
        responsibility: 'Resp',
        category: 'Loan',
        borrowerScope: 'Loan'
      };

      const context: RuleEvaluationContext = { loan, condition };
      const result = ruleEvaluator.evaluate(context);

      expect(result).toBe(false);
    });
  });

  describe('VA IRRRL Rules', () => {
    it('should apply CLSNG827 for VA IRRRL loans', () => {
      const loan: LoanData = {
        mortgageType: 'VA',
        vaRefiType: 'IRRRL'
      };

      const condition: LoanCondition = {
        conditionCode: 'CLSNG827',
        stage: 'PTF',
        rules: 'All VA IRRRL loans',
        class: 'PTF',
        type: 'CLSNG',
        number: '827',
        name: '',
        description: 'VA IRRRL - Cash back to the veteran cannot exceed $500 in incidental cost at closing.',
        editableInByte: 'Not Editable',
        documentProvider: 'INT',
        responsibility: 'Underwriter',
        category: 'Loan',
        borrowerScope: 'Loan',
        logicToApply: '$RefiTypeVA == "IRRR", SubPropState, CashFromToBorrower < -500'
      };

      const context: RuleEvaluationContext = { loan, condition };
      const result = ruleEvaluator.evaluate(context);

      expect(result).toBe(true);
    });

    it('should not apply CLSNG827 for non-VA loans', () => {
      const loan: LoanData = {
        mortgageType: 'Conv',
        loanPurpose: 'Refinance'
      };

      const condition: LoanCondition = {
        conditionCode: 'CLSNG827',
        stage: 'PTF',
        rules: 'All VA IRRRL loans',
        class: 'PTF',
        type: 'CLSNG',
        number: '827',
        name: '',
        description: 'VA IRRRL - Cash back to the veteran cannot exceed $500 in incidental cost at closing.',
        editableInByte: 'Not Editable',
        documentProvider: 'INT',
        responsibility: 'Underwriter',
        category: 'Loan',
        borrowerScope: 'Loan'
      };

      const context: RuleEvaluationContext = { loan, condition };
      const result = ruleEvaluator.evaluate(context);

      expect(result).toBe(false);
    });
  });

  describe('Asset Rules', () => {
    it('should apply ASSET500 when bank assets exist', () => {
      const loan: LoanData = {
        mortgageType: 'Conv',
        bankAssets: [
          { type: 'CheckingAccount', amount: 25000, borrowerId: 'B1' },
          { type: 'SavingsAccount', amount: 45000, borrowerId: 'B1' }
        ]
      };

      const condition: LoanCondition = {
        conditionCode: 'ASSET500',
        stage: 'PTD',
        rules: 'On all Convention, FHA, VA, USDA whenever there are bank assets listed on the URLA and no VOA report exists on the loan.',
        class: 'UW',
        type: 'ASSET',
        number: '500',
        name: 'Cash to Close Verification',
        description: 'Provide ___ months banks statements or VOA report to support sufficient funds for closing/reserves.',
        editableInByte: 'Editable',
        documentProvider: 'BWR',
        responsibility: 'Underwriter',
        category: 'Borrower',
        borrowerScope: 'All Borrowers'
      };

      const context: RuleEvaluationContext = { loan, condition };
      const result = ruleEvaluator.evaluate(context);

      expect(result).toBe(true);
    });

    it('should not apply ASSET500 when no bank assets exist', () => {
      const loan: LoanData = {
        mortgageType: 'Conv',
        bankAssets: []
      };

      const condition: LoanCondition = {
        conditionCode: 'ASSET500',
        stage: 'PTD',
        rules: 'On all Convention, FHA, VA, USDA whenever there are bank assets listed on the URLA and no VOA report exists on the loan.',
        class: 'UW',
        type: 'ASSET',
        number: '500',
        name: 'Cash to Close Verification',
        description: 'Provide ___ months banks statements or VOA report to support sufficient funds for closing/reserves.',
        editableInByte: 'Editable',
        documentProvider: 'BWR',
        responsibility: 'Underwriter',
        category: 'Borrower',
        borrowerScope: 'All Borrowers'
      };

      const context: RuleEvaluationContext = { loan, condition };
      const result = ruleEvaluator.evaluate(context);

      expect(result).toBe(false);
    });
  });

  describe('Earnest Money Deposit Rules', () => {
    it('should apply ASSET507 when EMD > $0', () => {
      const loan: LoanData = {
        earnestMoneyDeposit: 10000
      };

      const condition: LoanCondition = {
        conditionCode: 'ASSET507',
        stage: 'PTD',
        rules: 'EMD amount is > $0.00',
        class: 'UW',
        type: 'Asset',
        number: '507',
        name: 'EMD',
        description: 'Copy of statement showing $____ EMD check clearing; EMD must come from Borrowers verified accounts or other acceptable source',
        editableInByte: 'Editable',
        documentProvider: 'BWR',
        responsibility: 'Underwriter',
        category: 'Loan',
        borrowerScope: 'All Borrowers'
      };

      const context: RuleEvaluationContext = { loan, condition };
      const result = ruleEvaluator.evaluate(context);

      expect(result).toBe(true);
    });

    it('should not apply ASSET507 when EMD is $0 or undefined', () => {
      const loan: LoanData = {
        earnestMoneyDeposit: 0
      };

      const condition: LoanCondition = {
        conditionCode: 'ASSET507',
        stage: 'PTD',
        rules: 'EMD amount is > $0.00',
        class: 'UW',
        type: 'Asset',
        number: '507',
        name: 'EMD',
        description: 'Copy of statement showing $____ EMD check clearing; EMD must come from Borrowers verified accounts or other acceptable source',
        editableInByte: 'Editable',
        documentProvider: 'BWR',
        responsibility: 'Underwriter',
        category: 'Loan',
        borrowerScope: 'All Borrowers'
      };

      const context: RuleEvaluationContext = { loan, condition };
      const result = ruleEvaluator.evaluate(context);

      expect(result).toBe(false);
    });
  });
});