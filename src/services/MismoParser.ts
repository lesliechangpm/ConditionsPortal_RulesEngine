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
        const declarations = this.findInObject(borrower, ['DECLARATION', 'Declarations']);
        if (declarations) {
          loanData.bankruptcy = this.getBooleanValue(declarations, ['@_BankruptcyIndicator', 'Bankruptcy']);
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
        loanData.earnestMoneyDeposit = this.getNumericValue(financial, ['@_EarnestMoneyDepositAmount', 'EarnestMoney']);
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
        const assetArray = Array.isArray(assets) ? assets : [assets];
        
        assetArray.forEach((asset: any) => {
          if (asset && this.getValue(asset, ['@_AssetType', 'AssetType']) === 'CheckingAccount' || 
              this.getValue(asset, ['@_AssetType', 'AssetType']) === 'SavingsAccount') {
            loanData.bankAssets?.push({
              type: this.getValue(asset, ['@_AssetType', 'AssetType']) || 'Bank',
              amount: this.getNumericValue(asset, ['@_AssetCashOrMarketValueAmount', 'Amount']) || 0,
              borrowerId: this.getValue(asset, ['@_BorrowerID', 'BorrowerID'])
            });
          }
        });
      }

      // Extract income
      const income = this.findInObject(jsonObj, ['INCOME', 'Income']);
      if (income) {
        loanData.income = [];
        const incomeArray = Array.isArray(income) ? income : [income];
        
        incomeArray.forEach((inc: any) => {
          if (inc) {
            loanData.income?.push({
              type: this.getValue(inc, ['@_IncomeType', 'IncomeType']) || 'Unknown',
              amount: this.getNumericValue(inc, ['@_IncomeAmount', 'Amount']) || 0,
              source: this.getValue(inc, ['@_IncomeSource', 'Source']) || 'Unknown',
              borrowerId: this.getValue(inc, ['@_BorrowerID', 'BorrowerID'])
            });
          }
        });
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
              paidOffAtClosing: this.getBooleanValue(property, ['@_PaidOffAtClosingIndicator', 'PaidOffAtClosing'])
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