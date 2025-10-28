const fs = require('fs');
const path = require('path');

// Test file configurations
const testFiles = [
  {
    file: 'test-files/conv-high-ltv.xml',
    name: 'Conventional High LTV (95%)',
    expectedFeatures: ['EMD > $1', 'LTV > 80%', 'Conv loan type', 'Purchase', 'Bank assets']
  },
  {
    file: 'test-files/va-new-construction.xml', 
    name: 'VA New Construction',
    expectedFeatures: ['VA loan type', 'New construction', 'EMD > $1', 'Purchase']
  },
  {
    file: 'test-files/fha-low-down.xml',
    name: 'FHA Low Down Payment',
    expectedFeatures: ['FHA loan type', 'High LTV', 'EMD > $1', 'New construction', 'Bank assets']
  },
  {
    file: 'test-files/usda-rural.xml',
    name: 'USDA Rural Loan',
    expectedFeatures: ['USDA loan type', '100% LTV', 'EMD > $1', 'Self-employed', 'Bank assets']
  },
  {
    file: 'test-files/conv-refinance.xml',
    name: 'Conventional Refinance',
    expectedFeatures: ['Conv loan type', 'Refinance', 'REO property', 'Bank assets', 'No EMD']
  },
  {
    file: 'test-files/va-irrrl.xml',
    name: 'VA IRRRL Refinance', 
    expectedFeatures: ['VA loan type', 'IRRRL refi', 'Cash back limits', 'No EMD']
  },
  {
    file: 'test-files/fha-non-citizen.xml',
    name: 'FHA Non-US Citizen',
    expectedFeatures: ['FHA loan type', 'Non-US citizen', 'EMD > $1', 'Alimony income', 'Bank assets']
  },
  {
    file: 'test-files/conv-no-emd.xml',
    name: 'Conventional No EMD',
    expectedFeatures: ['Conv loan type', 'LTV = 80%', 'No EMD', 'Employment income', 'Bank assets']
  },
  {
    file: 'test-files/usda-new-construction.xml',
    name: 'USDA New Construction',
    expectedFeatures: ['USDA loan type', 'New construction', 'EMD > $1', '100% LTV', 'Employment income']
  },
  {
    file: 'test-files/va-simultaneous-close.xml',
    name: 'VA Simultaneous Closing',
    expectedFeatures: ['VA loan type', 'Purchase', 'REO with VA mortgage', 'EMD > $1', 'Employment income']
  },
  {
    file: 'test-files/fha-bankruptcy-alimony.xml',
    name: 'FHA Bankruptcy & Alimony',
    expectedFeatures: ['FHA loan type', 'Bankruptcy history', 'Alimony income', 'Child support', 'EMD > $1']
  },
  {
    file: 'test-files/conv-reo-to-be-sold.xml',
    name: 'Conventional REO Properties',
    expectedFeatures: ['Conv loan type', 'REO properties', 'Properties to be sold', 'Bank assets', 'EMD > $1']
  }
];

async function testLoan(testConfig) {
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
    
    console.log(`\n=== ${testConfig.name} ===`);
    console.log(`File: ${testConfig.file}`);
    console.log(`Loan ID: ${data.loanId}`);
    console.log(`Total Conditions: ${data.totalConditions}`);
    console.log(`Expected Features: ${testConfig.expectedFeatures.join(', ')}`);
    
    // Show condition breakdown by stage
    const stages = ['PTD', 'PTF', 'POST'];
    stages.forEach(stage => {
      const count = data.conditions[stage].length;
      if (count > 0) {
        console.log(`  ${stage}: ${count} conditions`);
      }
    });
    
    // Show a few example conditions with reasons
    console.log(`Sample Conditions:`);
    data.conditions.PTD.slice(0, 3).forEach(condition => {
      console.log(`  - ${condition.conditionCode}: ${condition.reasonApplied}`);
    });
    
    if (data.conditions.PTF.length > 0) {
      data.conditions.PTF.slice(0, 1).forEach(condition => {
        console.log(`  - ${condition.conditionCode} (PTF): ${condition.reasonApplied}`);
      });
    }

    return { success: true, totalConditions: data.totalConditions };
    
  } catch (error) {
    console.log(`\n=== ${testConfig.name} ===`);
    console.log(`File: ${testConfig.file}`);
    console.log(`❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 Running Loan Rules Engine Tests');
  console.log('=====================================');
  
  const results = [];
  
  for (const testConfig of testFiles) {
    const result = await testLoan(testConfig);
    results.push({ ...testConfig, ...result });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n\n📊 TEST SUMMARY');
  console.log('===============');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log(`\n✅ Successful Tests:`);
    successful.forEach(r => {
      console.log(`  - ${r.name}: ${r.totalConditions} conditions`);
    });
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed Tests:`);
    failed.forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  // Show loan type distribution
  console.log(`\n📋 Loan Type Distribution:`);
  const loanTypes = {};
  testFiles.forEach(test => {
    const loanType = test.expectedFeatures.find(f => f.includes('loan type'))?.replace(' loan type', '') || 'Unknown';
    loanTypes[loanType] = (loanTypes[loanType] || 0) + 1;
  });
  
  Object.entries(loanTypes).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} tests`);
  });
}

// Run if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testFiles, runAllTests };