# Loan Conditions Rules Engine - Rules and Conditions Documentation

This document provides a comprehensive overview of all rules, conditions, and logic implemented in the Loan Conditions Rules Engine.

## Table of Contents
1. [Overview](#overview)
2. [Loan Type Filtering](#loan-type-filtering)
3. [Rule Categories](#rule-categories)
4. [Special Detection Rules](#special-detection-rules)
5. [Dynamic Field Substitution](#dynamic-field-substitution)
6. [Testing](#testing)

## Overview

The Loan Conditions Rules Engine evaluates MISMO XML loan files against a comprehensive set of business rules to determine which loan conditions apply. The engine supports:

- **50+ loan conditions** from CSV data source
- **4 loan types**: Conventional (Conv), FHA, VA, USDA
- **3 stages**: Prior to Docs (PTD), Prior to Funding (PTF), Post Funding (POST)
- **Automatic loan type filtering** to ensure only applicable conditions are applied
- **Dynamic field substitution** for personalized condition descriptions
- **Contextual reasoning** explaining why each condition applies

## Loan Type Filtering

### Supported Loan Types
- **Conv** (Conventional)
- **FHA** (Federal Housing Administration)
- **VA** (Veterans Affairs)
- **USDA** (United States Department of Agriculture)

### Filtering Logic
The engine pre-filters conditions based on loan type constraints parsed from the CSV rules. Only conditions that support the loan's mortgage type will be evaluated.

**Example:**
- A VA loan will NOT get Conventional-only conditions like `APP102` (LTV > 80% for conventional loans)
- An FHA loan WILL get government loan conditions like `CRED318`

### Loan Type Pattern Recognition
The system recognizes these patterns in CSV rules:
- `VA Only` → Only applies to VA loans
- `All Files Conventional & Govy` → Applies to Conv, FHA, VA, USDA
- `Conv or FHA or VA or RHS` → Applies to Conv, FHA, VA, USDA
- `Mortgage Type = FHA` → Only applies to FHA loans

## Rule Categories

### Application Conditions (APP)

#### APP100 - Citizenship Verification
**Rule:** `citizenship anything other than US citizen`
**Applies When:** Borrower citizenship is not "US Citizen"
**Loan Types:** All
**Description:** Additional documentation required for non-US citizens

#### APP102 - High LTV Conventional
**Rule:** `conventional ltv greater than 80`
**Applies When:** Conventional loan with LTV > 80%
**Loan Types:** Conv only
**Description:** Mortgage insurance requirements for high LTV conventional loans

#### APP108 - Approved Application
**Rule:** `all files conventional & govy approved`
**Applies When:** Conv/FHA/VA/USDA loans with AUS approved status
**Loan Types:** Conv, FHA, VA, USDA
**Description:** Standard approved application condition

### Asset Conditions (ASSET)

#### ASSET500 - Bank Assets Verification
**Rule:** `bank assets urla`
**Applies When:** `<AssetType>Bank</AssetType>` found in MISMO XML
**Loan Types:** All
**Description:** Bank statements or VOA report required for cash to close verification

#### ASSET507 - Earnest Money Deposit
**Rule:** `emd amount is > $0`
**Applies When:** Earnest Money Deposit ≥ $1
**Loan Types:** All
**Description:** EMD verification with dynamic amount substitution
**Dynamic Fields:** `{EarnestMoneyDeposit}` displays actual EMD amount

### Credit Conditions (CRED)

#### CRED305 - Bankruptcy Documentation
**Rule:** `bk in the last 7 years no aus govy`
**Applies When:** 
- `<BankruptcyIndicator>true</BankruptcyIndicator>` in MISMO XML
- No AUS approved status
- Government loans (FHA/VA/USDA)
**Loan Types:** FHA, VA, USDA
**Description:** Bankruptcy letter of explanation and complete bankruptcy papers required

#### CRED308 - REO with Mortgage Liability
**Rule:** `reo linked to a mortgage liability`
**Applies When:** REO property exists with linked mortgage
**Loan Types:** All
**Description:** Additional documentation for real estate owned with existing mortgages

#### CRED318 - Community Property States
**Rule:** `fha, usda and va community property married`
**Applies When:** Government loans in community property states with married borrower
**Loan Types:** FHA, VA, USDA
**Description:** Additional documentation for community property state requirements

### Income Conditions (INC)

#### INC400 - Employment Income
**Rule:** `employer status current self employed empty`
**Applies When:** Current employment, not self-employed
**Loan Types:** Conv, FHA, VA, USDA
**Description:** YTD paystub verification required

#### INC401 - Alimony Income Documentation
**Rule:** `Other Income type = Alimony`
**Applies When:** `<IncomeType>Alimony</IncomeType>` found in MISMO XML
**Loan Types:** Conv, FHA, VA, USDA
**Description:** Divorce settlement agreement pages reflecting alimony

#### INC402 - Alimony Income Verification
**Rule:** `Other Income type = Alimony`
**Applies When:** `<IncomeType>Alimony</IncomeType>` found in MISMO XML
**Loan Types:** Conv, FHA, VA, USDA
**Description:** Evidence of alimony income receipt for specified months

#### INC4xx - Child Support Income
**Rule:** `Other Income type = Child Support`
**Applies When:** `<IncomeType>Child Support</IncomeType>` found in MISMO XML
**Loan Types:** Conv, FHA, VA, USDA
**Description:** Divorce settlement agreement pages reflecting child support

### New Construction Conditions (NEW CONST)

#### NEW CONST1400 - VA New Construction
**Rule:** `new construction VA only`
**Applies When:** VA loan with new construction flag
**Loan Types:** VA only
**Description:** VA-specific new construction requirements

#### NEW CONST1401 - Government New Construction
**Rule:** `new construction USDA/VA/FHA specific states`
**Applies When:** Government loans with new construction in specific states
**Loan Types:** USDA, VA, FHA
**Description:** New construction requirements for specific states

#### NEW CONST1405 - HUD/VA Warranty
**Rule:** `new construction warranty completion`
**Applies When:** FHA/VA loans with new construction
**Loan Types:** FHA, VA
**Description:** HUD-92544 / VA 26-1859 Warranty of Completion

### Property Conditions (PROP)

#### PROP601 - Hazard Insurance
**Rule:** `conventional fha va hazard insurance`
**Applies When:** Conv/FHA/VA loans, lien position 1
**Loan Types:** Conv, FHA, VA
**Description:** Proof of hazard insurance with specific coverage requirements

#### PROP603/PROP616 - Termite Inspection
**Rule:** `va termite not irrrl specific states`
**Applies When:** VA loans (not IRRRL) in termite inspection required states
**Loan Types:** VA only
**Description:** Termite inspection requirements for specific states

### Closing Conditions (CLSNG)

#### CLSNG827 - VA IRRRL
**Rule:** `va irrrl`
**Applies When:** VA Interest Rate Reduction Refinance Loan
**Loan Types:** VA only
**Description:** IRRRL-specific closing requirements

#### CLSNG890 - VA Purchase
**Rule:** `loan: va, purchase`
**Applies When:** VA purchase transactions
**Loan Types:** VA only
**Description:** VA purchase loan closing requirements

### Title Conditions (TITLE)

#### TITLE901 - Preliminary Title
**Rule:** `preliminary title`
**Applies When:** All loans with lien position 1
**Loan Types:** All
**Description:** Preliminary title with 12-month chain of title

#### TITLE908 - Closing Protection Letter
**Rule:** `closing protection`
**Applies When:** All loans with lien position 1
**Loan Types:** All
**Description:** CPL and title insurance requirements

## Special Detection Rules

### 1. Bankruptcy Detection
**XML Pattern:** `<BankruptcyIndicator>true</BankruptcyIndicator>`
**Engine Action:** Sets `loan.bankruptcy = true`
**Triggered Conditions:** CRED305 and other bankruptcy-related conditions

**Example XML:**
```xml
<DECLARATIONS>
  <BankruptcyIndicator>true</BankruptcyIndicator>
  <BankruptcyType>Chapter 7</BankruptcyType>
  <BankruptcyDate>2021-03-15</BankruptcyDate>
</DECLARATIONS>
```

### 2. Alimony Income Detection
**XML Pattern:** `<IncomeType>Alimony</IncomeType>`
**Engine Action:** Sets `loan.hasAlimonyIncome = true`
**Triggered Conditions:** INC401, INC402

**Example XML:**
```xml
<OTHER_INCOME>
  <IncomeType>Alimony</IncomeType>
  <MonthlyAmount>1800</MonthlyAmount>
  <Duration>60</Duration>
</OTHER_INCOME>
```

### 3. Child Support Income Detection
**XML Pattern:** `<IncomeType>Child Support</IncomeType>`
**Engine Action:** Sets `loan.hasChildSupportIncome = true`
**Triggered Conditions:** INC4xx

**Example XML:**
```xml
<OTHER_INCOME>
  <IncomeType>Child Support</IncomeType>
  <MonthlyAmount>650</MonthlyAmount>
  <Duration>36</Duration>
</OTHER_INCOME>
```

### 4. Earnest Money Deposit Detection
**XML Pattern:** `<EarnestMoneyDepositAmount>7500</EarnestMoneyDepositAmount>`
**Engine Action:** Triggers ASSET507 when EMD ≥ $1
**Dynamic Substitution:** Amount displayed in condition description

### 5. Bank Assets Detection
**XML Pattern:** `<AssetType>Bank</AssetType>`
**Engine Action:** Sets `loan.hasBankAssets = true`
**Triggered Conditions:** ASSET500

**Example XML:**
```xml
<ASSETS>
  <ASSET>
    <AssetType>Bank</AssetType>
    <AssetAmount>22000</AssetAmount>
    <BorrowerID>B001</BorrowerID>
  </ASSET>
</ASSETS>
```

### 6. New Construction Detection
**XML Pattern:** `<NewConstruction>true</NewConstruction>`
**Engine Action:** Triggers relevant NEW CONST conditions based on loan type

## Dynamic Field Substitution

The engine supports dynamic field substitution in condition descriptions:

### Available Fields
- `{EarnestMoneyDeposit}` - EMD amount formatted as currency
- `{MonthlyPITI}` - Monthly PITI payment amount
- `{PropertyAddress}` - Property street address
- `{LoanAmount}` - Loan amount formatted as currency
- `{LTV}` - Loan-to-value ratio

### Example
**Template:** `Copy of statement showing $${EarnestMoneyDeposit} EMD check clearing`
**Result:** `Copy of statement showing $7,500 EMD check clearing`

## Reason Applied Logic

Each applicable condition includes a `reasonApplied` field explaining why it was triggered:

### Reason Types
- **Loan Type Based:** `"Loan Type = FHA"`
- **Amount Based:** `"EMD = $7,500"`
- **Rule Based:** `"LTV > 80%"`
- **Generic:** `"Applies to FHA loans"`

### Example Response
```json
{
  "conditionCode": "ASSET507",
  "description": "Copy of statement showing $7,500 EMD check clearing",
  "reasonApplied": "EMD = $7,500"
}
```

## Testing

### Test Files Available
The system includes 11 comprehensive test files covering different loan scenarios:

1. **`fha-bankruptcy-alimony.xml`** - Tests bankruptcy + alimony + child support detection
2. **`conv-high-ltv.xml`** - Tests conventional high LTV conditions
3. **`va-new-construction.xml`** - Tests VA new construction rules
4. **`fha-low-down.xml`** - Tests FHA high LTV conditions
5. **`usda-rural.xml`** - Tests USDA-specific conditions
6. **`conv-refinance.xml`** - Tests refinance logic
7. **`va-irrrl.xml`** - Tests VA IRRRL conditions
8. **`fha-non-citizen.xml`** - Tests citizenship verification
9. **`conv-no-emd.xml`** - Tests scenarios without EMD
10. **`usda-new-construction.xml`** - Tests USDA new construction
11. **`va-simultaneous-close.xml`** - Tests REO scenarios

### Expected Condition Counts
- **Conventional loans:** 25-27 conditions typically
- **Government loans (FHA/VA/USDA):** 24-28 conditions typically
- **Loans with special circumstances:** Up to 30+ conditions

### Testing Commands

**Individual file test:**
```bash
curl -X POST http://localhost:3000/api/loans/evaluate -F "loanFile=@test-files/fha-bankruptcy-alimony.xml"
```

**Batch testing:**
```bash
node test-all-loans.js
```

## API Endpoints

### Evaluate Loan File
**POST** `/api/loans/evaluate`
- Upload MISMO XML file
- Returns applicable conditions by stage (PTD/PTF/POST)
- Includes dynamic field substitution and reasoning

### Health Check
**GET** `/api/health`
- Returns system status and loaded condition count

### Condition Statistics
**GET** `/api/conditions/stats`
- Returns statistics about loaded conditions

---

**Last Updated:** October 27, 2025  
**Version:** 2.0  
**Total Conditions:** 50+  
**Supported Loan Types:** Conv, FHA, VA, USDA  
**Special Detections:** Bankruptcy, Alimony Income, Child Support Income, EMD, New Construction