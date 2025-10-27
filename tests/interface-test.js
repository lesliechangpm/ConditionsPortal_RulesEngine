const puppeteer = require('puppeteer');
const path = require('path');

async function testWebInterface() {
    console.log('🚀 Starting Web Interface Test...');
    
    const browser = await puppeteer.launch({
        headless: false, // Show browser for visual verification
        defaultViewport: { width: 1280, height: 800 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        // Enable console logging from the page
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

        console.log('📄 Testing page load at http://localhost:3000...');
        
        // Test 1: Page loads correctly
        try {
            await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 10000 });
            console.log('✅ Page loaded successfully');
            
            // Take screenshot of initial page
            await page.screenshot({ path: 'test-screenshots/01-initial-page.png', fullPage: true });
        } catch (error) {
            console.log('❌ Failed to load page:', error.message);
            return false;
        }

        // Test 2: Check if required elements exist
        console.log('🔍 Checking if UI elements are present...');
        
        const elementsToCheck = [
            { selector: '#uploadArea', name: 'Upload Area' },
            { selector: '#chooseFileBtn', name: 'Choose File Button' },
            { selector: '#fileInput', name: 'File Input' },
            { selector: '#fileInfo', name: 'File Info Section' },
            { selector: '#evaluateBtn', name: 'Evaluate Button' }
        ];

        for (const element of elementsToCheck) {
            const exists = await page.$(element.selector);
            if (exists) {
                console.log(`✅ ${element.name} found`);
            } else {
                console.log(`❌ ${element.name} not found`);
            }
        }

        // Test 3: Test Choose File button functionality
        console.log('🖱️ Testing Choose File button click...');
        
        try {
            // Click the choose file button
            await page.click('#chooseFileBtn');
            console.log('✅ Choose File button clicked successfully');
            
            // Wait a moment to see if file dialog opens (we can't directly test this)
            await new Promise(resolve => setTimeout(resolve, 1000));
            await page.screenshot({ path: 'test-screenshots/02-after-button-click.png' });
            
        } catch (error) {
            console.log('❌ Choose File button click failed:', error.message);
        }

        // Test 4: Test drag and drop area functionality
        console.log('📂 Testing upload area hover and click...');
        
        try {
            // Hover over upload area
            await page.hover('#uploadArea');
            await page.screenshot({ path: 'test-screenshots/03-hover-upload-area.png' });
            console.log('✅ Upload area hover working');
            
            // Click upload area (should trigger file input)
            await page.click('#uploadArea');
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('✅ Upload area click working');
            
        } catch (error) {
            console.log('❌ Upload area interaction failed:', error.message);
        }

        // Test 5: Check JavaScript errors
        console.log('🔧 Checking for JavaScript errors...');
        
        const jsErrors = [];
        page.on('pageerror', error => {
            jsErrors.push(error.message);
        });
        
        // Trigger some JavaScript by interacting with elements
        await page.evaluate(() => {
            // Try to trigger the event handlers
            const uploadArea = document.getElementById('uploadArea');
            const chooseBtn = document.getElementById('chooseFileBtn');
            const fileInput = document.getElementById('fileInput');
            
            console.log('Upload Area:', uploadArea ? 'Found' : 'Not Found');
            console.log('Choose Button:', chooseBtn ? 'Found' : 'Not Found');
            console.log('File Input:', fileInput ? 'Found' : 'Not Found');
            
            // Check if event listeners are attached
            if (chooseBtn) {
                console.log('Choose button click test...');
                chooseBtn.click();
            }
            
            return {
                uploadAreaExists: !!uploadArea,
                chooseBtnExists: !!chooseBtn,
                fileInputExists: !!fileInput
            };
        });

        // Test 6: Test file input directly
        console.log('📁 Testing file input element directly...');
        
        try {
            const fileInputHandle = await page.$('#fileInput');
            if (fileInputHandle) {
                console.log('✅ File input element accessible');
                
                // Check file input properties
                const inputProps = await page.evaluate(() => {
                    const input = document.getElementById('fileInput');
                    return {
                        type: input.type,
                        accept: input.accept,
                        style: input.style.display,
                        className: input.className
                    };
                });
                
                console.log('File Input Properties:', inputProps);
            } else {
                console.log('❌ File input element not accessible');
            }
        } catch (error) {
            console.log('❌ File input test failed:', error.message);
        }

        // Test 7: Test with a sample file (simulate file upload)
        console.log('📄 Testing simulated file upload...');
        
        try {
            // Create a test XML file path
            const testFilePath = path.join(__dirname, '..', 'public', 'sample-test-loan.xml');
            
            // Check if test file exists
            const fs = require('fs');
            if (fs.existsSync(testFilePath)) {
                console.log('✅ Test file found:', testFilePath);
                
                // Upload the file using Puppeteer's file upload method
                const fileInput = await page.$('#fileInput');
                if (fileInput) {
                    await fileInput.uploadFile(testFilePath);
                    console.log('✅ File uploaded successfully');
                    
                    // Wait to see if file info appears
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await page.screenshot({ path: 'test-screenshots/04-after-file-upload.png' });
                    
                    // Check if file info is displayed
                    const fileInfoVisible = await page.evaluate(() => {
                        const fileInfo = document.getElementById('fileInfo');
                        return fileInfo && fileInfo.style.display !== 'none';
                    });
                    
                    if (fileInfoVisible) {
                        console.log('✅ File info displayed correctly');
                        
                        // Try to click evaluate button
                        const evaluateBtn = await page.$('#evaluateBtn');
                        if (evaluateBtn) {
                            console.log('🚀 Testing loan evaluation...');
                            await page.click('#evaluateBtn');
                            
                            // Wait for processing
                            await new Promise(resolve => setTimeout(resolve, 5000));
                            await page.screenshot({ path: 'test-screenshots/05-after-evaluation.png', fullPage: true });
                            
                            // Check if results are displayed
                            const resultsVisible = await page.evaluate(() => {
                                const results = document.getElementById('results');
                                return results && results.style.display !== 'none';
                            });
                            
                            if (resultsVisible) {
                                console.log('✅ Evaluation completed and results displayed');
                            } else {
                                console.log('❌ Results not displayed after evaluation');
                            }
                        }
                    } else {
                        console.log('❌ File info not displayed after upload');
                    }
                } else {
                    console.log('❌ Could not find file input for upload');
                }
            } else {
                console.log('❌ Test file not found:', testFilePath);
            }
        } catch (error) {
            console.log('❌ File upload test failed:', error.message);
        }

        // Final screenshot
        await page.screenshot({ path: 'test-screenshots/06-final-state.png', fullPage: true });
        
        console.log('📊 Test completed. Screenshots saved to test-screenshots/');
        console.log('🔍 Check the screenshots to verify visual functionality');
        
        return true;

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        return false;
    } finally {
        // Keep browser open for 5 seconds to allow manual inspection
        console.log('🕐 Keeping browser open for 5 seconds for manual inspection...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        await browser.close();
    }
}

// Create screenshots directory
const fs = require('fs');
const screenshotsDir = 'test-screenshots';
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
}

// Run the test
testWebInterface()
    .then(success => {
        if (success) {
            console.log('🎉 Web interface test completed!');
        } else {
            console.log('💥 Web interface test failed!');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('💥 Test runner failed:', error);
        process.exit(1);
    });