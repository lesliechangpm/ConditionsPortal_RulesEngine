# Test MISMO Loan Files

This directory contains 10 diverse MISMO XML test files designed to thoroughly test the Loan Conditions Rules Engine across different loan types and scenarios.

## Test Files Overview

| File | Loan Type | Purpose | Key Features |
|------|-----------|---------|--------------|
| `conv-high-ltv.xml` | Conventional | Purchase | LTV 95%, EMD $25K, Bank assets |
| `va-new-construction.xml` | VA | Purchase | New construction, 100% LTV, EMD $5K |
| `fha-low-down.xml` | FHA | Purchase | 96.5% LTV, New construction, EMD $8K |
| `usda-rural.xml` | USDA | Purchase | 100% LTV, Self-employed, EMD $3K |
| `conv-refinance.xml` | Conventional | Refinance | 75% LTV, REO property, No EMD |
| `va-irrrl.xml` | VA | Refinance | IRRRL type, Cash back limits, No EMD |
| `fha-non-citizen.xml` | FHA | Purchase | Non-US citizen, Alimony income, EMD $12K |
| `conv-no-emd.xml` | Conventional | Purchase | 80% LTV, No EMD, High income |
| `usda-new-construction.xml` | USDA | Purchase | New construction, 100% LTV, EMD $2.5K |
| `va-simultaneous-close.xml` | VA | Purchase | REO w/ VA mortgage, Simultaneous closing |
| `fha-bankruptcy-alimony.xml` | FHA | Purchase | Bankruptcy history, Alimony/child support, EMD $7.5K |
| `conv-reo-to-be-sold.xml` | Conventional | Purchase | REO properties to be sold, Bank assets, EMD $15K |

## Loan Type Distribution

- **Conventional (Conv)**: 5 files
- **VA**: 3 files  
- **FHA**: 3 files
- **USDA**: 2 files

## Testing Features

These files test various rule triggers including:

- **Loan Type Filtering**: Each file should only get conditions applicable to its loan type
- **EMD Conditions**: ASSET507 should trigger when EMD ≥ $1
- **LTV Rules**: Mortgage insurance requirements for high LTV conventional loans
- **New Construction**: VA/FHA/USDA specific new construction conditions
- **Refinance Logic**: Different rules for purchase vs refinance
- **Citizenship**: APP100 for non-US citizens
- **Income Types**: Employment, self-employed, alimony income, child support
- **REO Properties**: Conditions for existing real estate owned
- **VA Specific**: IRRRL, simultaneous closing, new construction requirements
- **Credit History**: Bankruptcy declarations and post-bankruptcy credit profiles

## How to Test

### Individual File Testing
```bash
curl -X POST http://localhost:3000/api/loans/evaluate -F "loanFile=@test-files/conv-high-ltv.xml"
```

### Batch Testing
```bash
node test-all-loans.js
```

## Expected Results

Each test should demonstrate:

1. **Correct loan type filtering** (e.g., VA files don't get Conv-only conditions)
2. **Proper EMD handling** (ASSET507 appears when EMD ≥ $1)
3. **Appropriate condition counts** (typically 15-35 conditions per loan)
4. **Accurate reason explanations** (reasonApplied field shows why each condition applies)
5. **Stage distribution** (most conditions in PTD, some in PTF/POST)

## Validation Points

- Conv high LTV loans should get mortgage insurance conditions
- VA new construction should get VA-specific building conditions
- FHA non-citizens should get citizenship verification conditions
- USDA loans should get USDA-specific requirements
- Refinance loans should get different conditions than purchases
- Files with EMD = $0 should NOT get ASSET507
- Files with EMD ≥ $1 should GET ASSET507 with correct amount display