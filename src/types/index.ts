export interface LoanCondition {
  conditionCode: string; // Column A
  stage: string; // Column B (PTD, PTF, POST)
  rules: string; // Column C
  class: string; // Column D
  type: string; // Column E
  number: string; // Column F
  name: string; // Column G
  description: string; // Column H
  editableInByte: string; // Column I
  dynamicDescription?: string; // Column J
  borrowerDescription?: string; // Column K
  documentProvider: string; // Column L (INT/BWR)
  responsibility: string; // Column M
  category: string; // Column N
  borrowerScope: string; // Column O
  dynamicData?: string; // Column P
  dataForLogic?: string; // Column Q1
  logicToApply?: string; // Column Q2
  byteFilter?: string; // Column R
  supportedLoanTypes?: string[]; // Parsed from rules (Conv, FHA, VA, USDA, etc.)
}

export interface ApplicableCondition {
  conditionCode: string;
  class: string;
  description: string;
  borrowerDescription?: string;
  documentProvider: string;
  category: string;
  dynamicFields?: Record<string, string>;
  reasonApplied?: string; // Why this condition was applied (e.g., "EMD >= $1", "Loan Type = VA")
}

export interface ConditionResult {
  loanId?: string;
  evaluationDate: string;
  conditions: {
    PTD: ApplicableCondition[];
    PTF: ApplicableCondition[];
    POST: ApplicableCondition[];
  };
  totalConditions: number;
}

export interface LoanData {
  // Basic loan information
  loanId?: string;
  loanPurpose?: string; // Purchase, Refinance, etc.
  mortgageType?: string; // Conv, FHA, VA, USDA, Non-QM
  lienPosition?: number;
  loanAmount?: number;
  ltv?: number;
  productCode?: string;
  
  // Property information
  propertyState?: string;
  newConstruction?: boolean;
  propertyType?: string;
  
  // Borrower information
  citizenship?: string;
  marriageStatus?: string;
  selfEmployed?: boolean;
  bankruptcy?: boolean;
  hasAlimonyIncome?: boolean;
  hasChildSupportIncome?: boolean;
  hasBankAssets?: boolean;
  
  // Financial information
  earnestMoneyDeposit?: number;
  cashToBorrower?: number;
  monthlyPiti?: number;
  
  // Assets and income
  bankAssets?: Array<{
    type: string;
    amount: number;
    borrowerId?: string;
  }>;
  
  income?: Array<{
    type: string;
    amount: number;
    source: string;
    borrowerId?: string;
  }>;
  
  // Real estate owned
  reo?: Array<{
    address: string;
    linkedToMortgage?: boolean;
    paidOffAtClosing?: boolean;
  }>;
  
  // AUS and underwriting
  ausResult?: string;
  underwritingMethod?: string;
  
  // VA specific
  vaRefiType?: string;
  
  // Additional fields as needed
  [key: string]: unknown;
}

export interface RuleEvaluationContext {
  loan: LoanData;
  condition: LoanCondition;
}

export interface RuleEvaluationResult {
  applies: boolean;
  reason?: string;
}

export interface RuleParser {
  evaluate(context: RuleEvaluationContext): boolean;
}

export type Stage = 'PTD' | 'PTF' | 'POST';

export type LoanType = 'Conv' | 'FHA' | 'VA' | 'USDA' | 'Non-QM';

export interface LoanTypeConstraint {
  conditionCode: string;
  supportedTypes: LoanType[];
  constraint: string; // Original constraint text
  source: 'rules' | 'logic'; // Whether from Column C or Column Q
}

export interface LoanTypeFilterResult {
  applicable: LoanCondition[];
  filtered: LoanCondition[];
  filterReasons: Record<string, string>; // conditionCode -> reason for filtering
}