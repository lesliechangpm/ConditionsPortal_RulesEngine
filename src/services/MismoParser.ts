import { XMLParser } from 'fast-xml-parser';
import { LoanData } from '../types';

export class MismoParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true,
      processEntities: true,
      allowBooleanAttributes: true
    });
  }

  parseLoanFile(xmlContent: string): LoanData {
    try {
      const jsonObj = this.parser.parse(xmlContent);
      
      // Navigate through MISMO XML structure
      // This is a simplified parser - real MISMO files have complex nested structures
      const loanData: LoanData = {};
      
      // Extract loan information from various MISMO paths
      this.extractLoanInfo(jsonObj, loanData);
      this.extractPropertyInfo(jsonObj, loanData);
      this.extractBorrowerInfo(jsonObj, loanData);
      this.extractFinancialInfo(jsonObj, loanData);
      this.extractAssetsAndIncome(jsonObj, loanData);
      this.extractRealEstateOwned(jsonObj, loanData);
      this.extractUnderwritingInfo(jsonObj, loanData);
      this.extractCreditInfo(jsonObj, loanData);
      
      return loanData;
    } catch (error) {
      console.error('Error parsing MISMO XML:', error);
      throw new Error(`Failed to parse MISMO file: ${error}`);
    }
  }

  private extractLoanInfo(jsonObj: any, loanData: LoanData): void {
    try {
      // Navigate through typical MISMO structure paths
      const loan = this.findInObject(jsonObj, ['LOAN', 'Loan']);
      
      if (loan) {
        loanData.loanId = this.getValue(loan, ['@_LoanRoleType', 'LoanIdentifier']);
        loanData.loanPurpose = this.getValue(loan, ['@_LoanPurposeType', 'LoanPurpose']);
        loanData.loanAmount = this.getNumericValue(loan, ['@_LoanAmount', 'LoanAmount', 'LOAN_AMOUNT']);
        loanData.mortgageType = this.getValue(loan, ['@_MortgageType', 'MortgageType', 'MORTGAGE_TYPE']);
        loanData.lienPosition = this.getNumericValue(loan, ['@_LienPriorityType', 'LienPosition']);
        loanData.ltv = this.getNumericValue(loan, ['@_LoanToValuePercent', 'LTV', 'LoanToValue']);
        loanData.productCode = this.getValue(loan, ['@_ProductCode', 'ProductCode']);
        loanData.vaRefiType = this.getValue(loan, ['@_VARefiType', 'VARefiType']);
        loanData.newConstruction = this.getBooleanValue(loan, ['@_NewConstructionIndicator', 'NewConstruction']);
        loanData.ausResult = this.getValue(loan, ['@_AUSResult', 'AUSResult']);
        loanData.creditRunIndicator = this.getBooleanValue(loan, ['@_CreditRunIndicator', 'CreditRunIndicator']);
      }
    } catch (error) {
      console.warn('Warning extracting loan info:', error);
    }
  }

  private extractPropertyInfo(jsonObj: any, loanData: LoanData): void {
    try {
      const property = this.findInObject(jsonObj, ['PROPERTY', 'Property', 'COLLATERAL']);
      
      if (property) {
        const address = this.findInObject(property, ['ADDRESS', 'Address']);
        if (address) {
          loanData.propertyState = this.getValue(address, ['@_StateCode', 'State', 'StateCode']);
        }
        
        loanData.newConstruction = this.getBooleanValue(property, ['@_NewConstructionIndicator', 'NewConstruction']);
        loanData.propertyType = this.getValue(property, ['@_PropertyType', 'PropertyType']);
      }
    } catch (error) {
      console.warn('Warning extracting property info:', error);
    }
  }

  private extractBorrowerInfo(jsonObj: any, loanData: LoanData): void {
    try {
      const borrower = this.findInObject(jsonObj, ['BORROWER', 'Borrower', 'PARTIES']);
      
      if (borrower) {
        loanData.citizenship = this.getValue(borrower, ['@_CitizenshipType', 'Citizenship']);
        loanData.marriageStatus = this.getValue(borrower, ['@_MaritalStatusType', 'MaritalStatus']);
        loanData.selfEmployed = this.getBooleanValue(borrower, ['@_SelfEmployedIndicator', 'SelfEmployed']);
        
        // Check for bankruptcy declaration
        const declarations = this.findInObject(borrower, ['DECLARATIONS', 'DECLARATION', 'Declarations']);
        if (declarations) {
          loanData.bankruptcy = this.getBooleanValue(declarations, ['@_BankruptcyIndicator', 'BankruptcyIndicator']);
        }
      }
    } catch (error) {
      console.warn('Warning extracting borrower info:', error);
    }
  }

  private extractFinancialInfo(jsonObj: any, loanData: LoanData): void {
    try {
      const financial = this.findInObject(jsonObj, ['FINANCIAL', 'Financial']);
      
      if (financial) {
        loanData.earnestMoneyDeposit = this.getNumericValue(financial, ['@_EarnestMoneyDepositAmount', 'EarnestMoneyDepositAmount', 'EarnestMoney']);
        loanData.cashToBorrower = this.getNumericValue(financial, ['@_CashFromToBorrowerAmount', 'CashToBorrower']);
        loanData.monthlyPiti = this.getNumericValue(financial, ['@_PITIAmount', 'PITI', 'MonthlyPayment']);
      }
    } catch (error) {
      console.warn('Warning extracting financial info:', error);
    }
  }

  private extractAssetsAndIncome(jsonObj: any, loanData: LoanData): void {
    try {
      // Extract assets
      const assets = this.findInObject(jsonObj, ['ASSETS', 'Assets']);
      if (assets) {
        loanData.bankAssets = [];
        loanData.hasBankAssets = false; // Initialize flag
        
        const assetArray = Array.isArray(assets) ? assets : [assets];
        
        assetArray.forEach((asset: any) => {
          const assetType = this.getValue(asset, ['@_AssetType', 'AssetType']);
          
          // Check for bank assets (Bank, CheckingAccount, SavingsAccount)
          if (asset && (assetType === 'Bank' || assetType === 'CheckingAccount' || assetType === 'SavingsAccount')) {
            loanData.hasBankAssets = true; // Set flag when any bank asset is found
            
            loanData.bankAssets?.push({
              type: assetType || 'Bank',
              amount: this.getNumericValue(asset, ['@_AssetCashOrMarketValueAmount', 'AssetAmount', 'Amount']) || 0,
              borrowerId: this.getValue(asset, ['@_BorrowerID', 'BorrowerID'])
            });
          }
        });
      }

      // Extract income
      const income = this.findInObject(jsonObj, ['INCOME', 'Income']);
      if (income) {
        loanData.income = [];
        loanData.hasAlimonyIncome = false; // Initialize flags
        loanData.hasChildSupportIncome = false;
        
        // Handle both direct income objects and nested structures
        const incomeItems: any[] = [];
        
        // Check for employment income
        const employment = this.findInObject(income, ['EMPLOYMENT', 'Employment']);
        if (employment) {
          const empArray = Array.isArray(employment) ? employment : [employment];
          incomeItems.push(...empArray.map(emp => ({
            type: 'Employment',
            amount: this.getNumericValue(emp, ['@_BaseIncome', 'BaseIncome']),
            source: this.getValue(emp, ['@_EmployerName', 'EmployerName']) || 'Employment',
            borrowerId: this.getValue(emp, ['@_BorrowerID', 'BorrowerID']),
            ownershipShare: this.getNumericValue(emp, ['@_OwnershipShare', 'OwnershipShare']),
            employedByFamily: this.getBooleanValue(emp, ['@_EmployedByFamily', 'EmployedByFamily'])
          })));
        }
        
        // Check for other income types (including alimony)
        const otherIncome = this.findInObject(income, ['OTHER_INCOME', 'OtherIncome']);
        if (otherIncome) {
          const otherArray = Array.isArray(otherIncome) ? otherIncome : [otherIncome];
          otherArray.forEach((inc: any) => {
            if (inc) {
              const incomeType = this.getValue(inc, ['@_IncomeType', 'IncomeType']);
              const monthlyAmount = this.getNumericValue(inc, ['@_MonthlyAmount', 'MonthlyAmount']);
              
              // Check for special income types
              if (incomeType) {
                const lowerType = incomeType.toLowerCase();
                if (lowerType === 'alimony') {
                  loanData.hasAlimonyIncome = true;
                } else if (lowerType === 'child support') {
                  loanData.hasChildSupportIncome = true;
                }
              }
              
              incomeItems.push({
                type: incomeType || 'Unknown',
                amount: monthlyAmount || 0,
                source: incomeType || 'Other',
                borrowerId: this.getValue(inc, ['@_BorrowerID', 'BorrowerID'])
              });
            }
          });
        }
        
        // Handle direct income array if present
        const directIncome = Array.isArray(income) ? income : (income.INCOME_DETAIL ? [income] : []);
        directIncome.forEach((inc: any) => {
          if (inc && inc !== employment && inc !== otherIncome) {
            const incomeType = this.getValue(inc, ['@_IncomeType', 'IncomeType']);
            if (incomeType) {
              const lowerType = incomeType.toLowerCase();
              if (lowerType === 'alimony') {
                loanData.hasAlimonyIncome = true;
              } else if (lowerType === 'child support') {
                loanData.hasChildSupportIncome = true;
              }
            }
            
            incomeItems.push({
              type: incomeType || 'Unknown',
              amount: this.getNumericValue(inc, ['@_IncomeAmount', 'Amount']) || 0,
              source: this.getValue(inc, ['@_IncomeSource', 'Source']) || 'Unknown',
              borrowerId: this.getValue(inc, ['@_BorrowerID', 'BorrowerID'])
            });
          }
        });
        
        loanData.income = incomeItems.filter(item => item.amount > 0 || item.type !== 'Unknown');
      }
    } catch (error) {
      console.warn('Warning extracting assets and income:', error);
    }
  }

  private extractRealEstateOwned(jsonObj: any, loanData: LoanData): void {
    try {
      const reo = this.findInObject(jsonObj, ['REO', 'RealEstateOwned', 'REAL_ESTATE_OWNED']);
      if (reo) {
        loanData.reo = [];
        const reoArray = Array.isArray(reo) ? reo : [reo];
        
        reoArray.forEach((property: any) => {
          if (property) {
            const address = this.findInObject(property, ['ADDRESS', 'Address']);
            const addressString = address ? 
              `${this.getValue(address, ['@_StreetAddress', 'Street'])} ${this.getValue(address, ['@_CityName', 'City'])} ${this.getValue(address, ['@_StateCode', 'State'])}` : 
              'Unknown Address';
              
            loanData.reo?.push({
              address: addressString,
              linkedToMortgage: this.getBooleanValue(property, ['@_LinkedToMortgageIndicator', 'LinkedToMortgage']),
              paidOffAtClosing: this.getBooleanValue(property, ['@_PaidOffAtClosingIndicator', 'PaidOffAtClosing']),
              markedToBeSold: this.getBooleanValue(property, ['@_MarkedToBeSoldIndicator', 'MarkedToBeSold'])
            });
          }
        });
      }
    } catch (error) {
      console.warn('Warning extracting real estate owned:', error);
    }
  }

  private extractUnderwritingInfo(jsonObj: any, loanData: LoanData): void {
    try {
      const underwriting = this.findInObject(jsonObj, ['UNDERWRITING', 'Underwriting', 'AUS']);
      
      if (underwriting) {
        loanData.ausResult = this.getValue(underwriting, ['@_AUSResult', 'AUSRecommendation', 'Result']);
        loanData.underwritingMethod = this.getValue(underwriting, ['@_UnderwritingMethod', 'Method']);
        loanData.vaRefiType = this.getValue(underwriting, ['@_VARefiType', 'VARefiType']);
      }
    } catch (error) {
      console.warn('Warning extracting underwriting info:', error);
    }
  }

  private extractCreditInfo(jsonObj: any, loanData: LoanData): void {
    try {
      const credit = this.findInObject(jsonObj, ['CREDIT_PROFILE', 'CreditProfile', 'CREDIT']);
      
      if (credit) {
        loanData.creditRunIndicator = this.getBooleanValue(credit, ['@_CreditRunIndicator', 'CreditRunIndicator']);
        loanData.creditScore = this.getNumericValue(credit, ['@_CreditScore', 'CreditScore']);
      }
    } catch (error) {
      console.warn('Warning extracting credit info:', error);
    }
  }

  private findInObject(obj: any, paths: string[]): any {
    if (!obj) return null;
    
    for (const path of paths) {
      if (obj[path] !== undefined) {
        return obj[path];
      }
    }
    
    // Deep search for nested objects
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const found = this.findInObject(obj[key], paths);
        if (found) return found;
      }
    }
    
    return null;
  }

  private getValue(obj: any, paths: string[]): string | undefined {
    const value = this.findInObject(obj, paths);
    return value !== null && value !== undefined ? String(value) : undefined;
  }

  private getNumericValue(obj: any, paths: string[]): number | undefined {
    const value = this.findInObject(obj, paths);
    if (value !== null && value !== undefined) {
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    }
    return undefined;
  }

  private getBooleanValue(obj: any, paths: string[]): boolean | undefined {
    const value = this.findInObject(obj, paths);
    if (value !== null && value !== undefined) {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === 'yes' || lower === '1') return true;
        if (lower === 'false' || lower === 'no' || lower === '0') return false;
      }
      if (typeof value === 'number') return value !== 0;
    }
    return undefined;
  }
}