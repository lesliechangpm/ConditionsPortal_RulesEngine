const fs = require('fs');
const path = require('path');

// Comprehensive test files designed to trigger all conditions
const comprehensiveTestFiles = [
  {
    file: 'test-files/comprehensive-va-test.xml',
    name: 'VA Comprehensive Test',
    expectedConditions: [
      'APP100', 'APP108', 'ASSET500', 'ASSET507', 'CLSNG827', 'CLSNG890', 
      'CRED305', 'CRED308', 'CRED314', 'CRED317', 'CRED318', 'CRED319', 'CRED323', 'CRED324', 'CRED326',
      'INC401', 'INC402', 'INC406', 'INC407', 'INC408', 'INC409', 'INC410', 'INC413', 'INC414', 'INC423', 
      'MISC718', 'MISC765',
      'NEW CONST1400', 'NEW CONST1401', 'NEW CONST1405', 'NEW CONST1407', 'NEW CONST1412',
      'PROP601', 'PROP603', 'PROP616', 'PROP617', 
      'TITLE901', 'TITLE908'
    ]
  },
  {
    file: 'test-files/comprehensive-fha-self-employed.xml',
    name: 'FHA Self-Employed Test',
    expectedConditions: [
      'APP108', 'ASSET500', 'CRED314', 'CRED317', 'CRED318', 'CRED319', 'CRED323', 'CRED324', 'CRED326',
      'INC400', 'INC401', 'INC402', 'INC403', 'INC404', 'INC407', 'INC408', 'INC409', 'INC410', 'INC413', 'INC414', 'INC423', 'INC4xx',
      'MISC718', 'MISC765',
      'NEW CONST1401', 'NEW CONST1405', 'NEW CONST1412',
      'PROP601', 
      'TITLE901', 'TITLE908'
    ]
  },
  {
    file: 'test-files/comprehensive-usda-new-const.xml',
    name: 'USDA New Construction Test',
    expectedConditions: [
      'APP100', 'APP108', 'ASSET500', 'ASSET507', 
      'CRED305', 'CRED314', 'CRED317', 'CRED318', 'CRED323', 'CRED324',
      'INC400', 'INC401', 'INC402', 'INC403', 'INC404', 'INC409', 'INC423',
      'MISC718', 'MISC765',
      'NEW CONST1401', 'NEW CONST1412',
      'PROP601', 
      'TITLE901', 'TITLE908'
    ]
  },
  {
    file: 'test-files/comprehensive-conv-high-ltv.xml',
    name: 'Conventional High LTV Test',
    expectedConditions: [
      'APP102', 'APP108', 'ASSET500', 'ASSET507', 
      'CRED308', 'CRED314', 'CRED317', 'CRED319', 'CRED323', 'CRED324', 'CRED326',
      'INC400', 'INC401', 'INC402', 'INC403', 'INC404', 'INC409',
      'MISC718', 'MISC765',
      'PROP601', 
      'TITLE901', 'TITLE908'
    ]
  },
  {
    file: 'test-files/fha-bankruptcy-alimony.xml',
    name: 'FHA Bankruptcy & Income Test',
    expectedConditions: [
      'APP100', 'APP108', 'ASSET500', 'ASSET507', 
      'CRED305', 'CRED314', 'CRED317', 'CRED319', 'CRED323', 'CRED324', 'CRED326',
      'INC400', 'INC401', 'INC402', 'INC403', 'INC404', 'INC409', 'INC423', 'INC4xx',
      'MISC718', 'MISC765',
      'NEW CONST1405',
      'PROP601', 
      'TITLE901', 'TITLE908'
    ]
  },
  {
    file: 'test-files/conv-reo-to-be-sold.xml',
    name: 'Conventional REO Test',
    expectedConditions: [
      'APP102', 'APP108', 'ASSET500', 'ASSET507', 
      'CRED301', 'CRED308', 'CRED309', 'CRED314', 'CRED317', 'CRED319', 'CRED323', 'CRED324', 'CRED326',
      'INC400', 'INC403', 'INC404', 'INC409',
      'MISC718', 'MISC765',
      'PROP601', 
      'TITLE901', 'TITLE908'
    ]
  },
  {
    file: 'test-files/missing-conditions-test.xml',
    name: 'Missing Conditions Test',
    expectedConditions: [
      'APP108', 'ASSET500', 'ASSET507', 
      'CRED301', 'CRED308', 'CRED309', 'CRED313', 'CRED314', 'CRED317', 'CRED318', 'CRED319', 'CRED323', 'CRED324', 'CRED326',
      'INC400', 'INC401', 'INC402', 'INC403', 'INC404', 'INC407', 'INC409', 'INC410', 'INC413', 'INC414', 'INC423', 'INC4xx',
      'MISC718', 'MISC765',
      'NEW CONST1404', 'NEW CONST1405',
      'PROP601', 
      'TITLE901', 'TITLE908'
    ]
  },
  {
    file: 'test-files/va-purchase-new-const.xml',
    name: 'VA Purchase New Construction Test',
    expectedConditions: [
      'APP108', 'ASSET500', 'ASSET507', 
      'CLSNG890',
      'CRED313', 'CRED314', 'CRED317', 'CRED319', 'CRED323', 'CRED324', 'CRED326',
      'INC400', 'INC401', 'INC402', 'INC403', 'INC404', 'INC409', 'INC410', 'INC413', 'INC414', 'INC423', 'INC4xx',
      'MISC718', 'MISC765',
      'NEW CONST1400', 'NEW CONST1405', 'NEW CONST1407', 'NEW CONST1412',
      'PROP601', 'PROP603', 'PROP617',
      'TITLE901', 'TITLE908'
    ]
  }
];

// All 50 conditions that should be covered across all tests
const allConditions = [
  'APP100', 'APP102', 'APP108',
  'ASSET500', 'ASSET507',
  'CLSNG827', 'CLSNG890',
  'CRED301', 'CRED305', 'CRED308', 'CRED309', 'CRED310', 'CRED313', 'CRED314', 'CRED317', 'CRED318', 'CRED319', 'CRED320', 'CRED323', 'CRED324', 'CRED326',
  'INC400', 'INC401', 'INC402', 'INC403', 'INC404', 'INC406', 'INC407', 'INC408', 'INC409', 'INC410', 'INC413', 'INC414', 'INC423', 'INC4xx',
  'MISC718', 'MISC765',
  'NEW CONST1400', 'NEW CONST1401', 'NEW CONST1404', 'NEW CONST1405', 'NEW CONST1407', 'NEW CONST1412',
  'PROP601', 'PROP603', 'PROP616', 'PROP617',
  'TITLE901', 'TITLE908'
];

async function testLoanFile(testConfig) {
  const fetch = (await import('node-fetch')).default;
  const FormData = (await import('form-data')).default;
  
  try {
    if (!fs.existsSync(testConfig.file)) {
      throw new Error(`File not found: ${testConfig.file}`);
    }

    const form = new FormData();
    form.append('loanFile', fs.createReadStream(testConfig.file));

    const response = await fetch('http://localhost:3000/api/loans/evaluate', {
      method: 'POST',
      body: form
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Evaluation failed');
    }

    const data = result.data;
    
    // Get all triggered condition codes
    const triggeredConditions = [
      ...data.conditions.PTD.map(c => c.conditionCode),
      ...data.conditions.PTF.map(c => c.conditionCode),
      ...data.conditions.POST.map(c => c.conditionCode)
    ];

    console.log(`\n=== ${testConfig.name} ===`);
    console.log(`File: ${testConfig.file}`);
    console.log(`Total Conditions Triggered: ${data.totalConditions}`);
    console.log(`Triggered Conditions: ${triggeredConditions.join(', ')}`);
    
    // Show condition breakdown by stage
    const stages = ['PTD', 'PTF', 'POST'];
    stages.forEach(stage => {
      const count = data.conditions[stage].length;
      if (count > 0) {
        console.log(`  ${stage}: ${count} conditions`);
      }
    });

    // Show detailed reasons for first few conditions
    console.log(`Sample Condition Reasons:`);
    data.conditions.PTD.slice(0, 3).forEach(condition => {
      console.log(`  - ${condition.conditionCode}: ${condition.reasonApplied}`);
    });

    return { 
      success: true, 
      totalConditions: data.totalConditions,
      triggeredConditions: triggeredConditions,
      conditionDetails: data.conditions
    };
    
  } catch (error) {
    console.log(`\n=== ${testConfig.name} ===`);
    console.log(`File: ${testConfig.file}`);
    console.log(`❌ ERROR: ${error.message}`);
    return { 
      success: false, 
      error: error.message,
      triggeredConditions: []
    };
  }
}

async function runComprehensiveTests() {
  console.log('🚀 Running Comprehensive Loan Conditions Tests');
  console.log('==============================================');
  console.log(`Testing ${allConditions.length} total conditions across ${comprehensiveTestFiles.length} test files`);
  
  const results = [];
  const allTriggeredConditions = new Set();
  
  for (const testConfig of comprehensiveTestFiles) {
    const result = await testLoanFile(testConfig);
    results.push({ ...testConfig, ...result });
    
    // Track all triggered conditions
    if (result.triggeredConditions) {
      result.triggeredConditions.forEach(condition => {
        allTriggeredConditions.add(condition);
      });
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Analysis and Summary
  console.log('\n\n📊 COMPREHENSIVE TEST ANALYSIS');
  console.log('===============================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful Tests: ${successful.length}/${results.length}`);
  console.log(`❌ Failed Tests: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log(`\n✅ Test Results Summary:`);
    successful.forEach(r => {
      console.log(`  - ${r.name}: ${r.totalConditions} conditions triggered`);
    });
  }
  
  // Condition Coverage Analysis
  const triggeredConditionsList = Array.from(allTriggeredConditions).sort();
  const notTriggeredConditions = allConditions.filter(condition => 
    !allTriggeredConditions.has(condition)
  );
  
  console.log(`\n📋 CONDITION COVERAGE ANALYSIS:`);
  console.log(`Total Conditions Defined: ${allConditions.length}`);
  console.log(`Conditions Triggered: ${triggeredConditionsList.length}`);
  console.log(`Coverage Percentage: ${((triggeredConditionsList.length / allConditions.length) * 100).toFixed(1)}%`);
  
  console.log(`\n✅ TRIGGERED CONDITIONS (${triggeredConditionsList.length}):`);
  console.log(`${triggeredConditionsList.join(', ')}`);
  
  if (notTriggeredConditions.length > 0) {
    console.log(`\n⚠️  NOT TRIGGERED CONDITIONS (${notTriggeredConditions.length}):`);
    console.log(`${notTriggeredConditions.join(', ')}`);
    
    console.log(`\n📝 Missing Condition Analysis:`);
    notTriggeredConditions.forEach(condition => {
      console.log(`  - ${condition}: May require specific scenario not covered in current tests`);
    });
  } else {
    console.log(`\n🎉 PERFECT COVERAGE! All ${allConditions.length} conditions have been triggered!`);
  }
  
  // Loan Type Coverage
  console.log(`\n📊 Loan Type Test Distribution:`);
  const loanTypeResults = {};
  results.forEach(result => {
    const loanType = result.name.split(' ')[0]; // Extract loan type from test name
    if (!loanTypeResults[loanType]) loanTypeResults[loanType] = [];
    loanTypeResults[loanType].push(result);
  });
  
  Object.entries(loanTypeResults).forEach(([loanType, tests]) => {
    const totalConditions = tests.reduce((sum, test) => sum + (test.totalConditions || 0), 0);
    console.log(`  ${loanType}: ${tests.length} tests, ${totalConditions} total conditions triggered`);
  });
  
  return {
    totalTests: results.length,
    successfulTests: successful.length,
    failedTests: failed.length,
    totalConditionsCovered: triggeredConditionsList.length,
    totalConditionsDefined: allConditions.length,
    coveragePercentage: (triggeredConditionsList.length / allConditions.length) * 100,
    triggeredConditions: triggeredConditionsList,
    missingConditions: notTriggeredConditions
  };
}

// Run if called directly
if (require.main === module) {
  runComprehensiveTests().catch(console.error);
}

module.exports = { comprehensiveTestFiles, runComprehensiveTests, allConditions };