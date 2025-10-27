import * as ExcelJS from 'exceljs';
import { ConditionResult, ApplicableCondition, Stage } from '../types';

export class ExportService {

  // Export to JSON format
  exportToJSON(results: ConditionResult): string {
    return JSON.stringify(results, null, 2);
  }

  // Export to CSV format
  exportToCSV(results: ConditionResult): string {
    const csvRows: string[] = [];
    
    // Add header
    csvRows.push('Stage,Condition Code,Class,Description,Borrower Description,Document Provider,Category');
    
    // Add data for each stage
    Object.entries(results.conditions).forEach(([stage, conditions]) => {
      conditions.forEach(condition => {
        const row = [
          stage,
          condition.conditionCode,
          condition.class,
          this.escapeCsvField(condition.description),
          this.escapeCsvField(condition.borrowerDescription || ''),
          condition.documentProvider,
          condition.category
        ].join(',');
        csvRows.push(row);
      });
    });
    
    return csvRows.join('\n');
  }

  // Export to Excel format
  async exportToExcel(results: ConditionResult): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Loan Conditions');

    // Add title
    worksheet.addRow(['Loan Conditions Report']);
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.addRow([]);

    // Add loan info
    worksheet.addRow(['Loan ID:', results.loanId || 'Not specified']);
    worksheet.addRow(['Evaluation Date:', new Date(results.evaluationDate).toLocaleString()]);
    worksheet.addRow(['Total Conditions:', results.totalConditions]);
    worksheet.addRow([]);

    // Add headers
    const headers = ['Stage', 'Condition Code', 'Class', 'Description', 'Borrower Description', 'Document Provider', 'Category'];
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add data
    Object.entries(results.conditions).forEach(([stage, conditions]) => {
      conditions.forEach(condition => {
        worksheet.addRow([
          stage,
          condition.conditionCode,
          condition.class,
          condition.description,
          condition.borrowerDescription || '',
          condition.documentProvider,
          condition.category
        ]);
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (column.header === 'Description' || column.header === 'Borrower Description') {
        column.width = 50;
      } else {
        column.width = 15;
      }
    });

    // Set text wrapping for description columns
    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex > 7) { // Skip header rows
        row.getCell(4).alignment = { wrapText: true, vertical: 'top' };
        row.getCell(5).alignment = { wrapText: true, vertical: 'top' };
        row.height = 40;
      }
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  // Generate HTML report for PDF conversion
  generateHTMLReport(results: ConditionResult): string {
    const stageNames = {
      PTD: 'Prior to Docs',
      PTF: 'Prior to Funding', 
      POST: 'Post Funding'
    };

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Loan Conditions Report</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.4;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .loan-info { 
            background-color: #f5f5f5; 
            padding: 15px; 
            margin-bottom: 20px;
            border-radius: 5px;
        }
        .stage-section { 
            margin-bottom: 30px; 
            page-break-inside: avoid;
        }
        .stage-header { 
            background-color: #4CAF50; 
            color: white; 
            padding: 10px; 
            font-weight: bold;
            font-size: 16px;
        }
        .condition { 
            border: 1px solid #ddd; 
            margin-bottom: 10px; 
            padding: 15px;
            background-color: white;
        }
        .condition-header { 
            font-weight: bold; 
            margin-bottom: 8px;
            color: #333;
        }
        .condition-code { 
            color: #2196F3; 
            font-weight: bold;
        }
        .condition-class { 
            background-color: #e0e0e0; 
            padding: 2px 6px; 
            border-radius: 3px; 
            font-size: 12px;
            margin-left: 10px;
        }
        .condition-provider { 
            background-color: #ff9800; 
            color: white; 
            padding: 2px 6px; 
            border-radius: 3px; 
            font-size: 12px;
            margin-left: 5px;
        }
        .description { 
            margin: 10px 0; 
            line-height: 1.5;
        }
        .borrower-description { 
            background-color: #fff3e0; 
            padding: 8px; 
            border-left: 3px solid #ff9800; 
            margin-top: 8px;
            font-style: italic;
        }
        .summary { 
            background-color: #e3f2fd; 
            padding: 15px; 
            border-radius: 5px; 
            margin-bottom: 20px;
        }
        .no-conditions {
            text-align: center;
            color: #666;
            font-style: italic;
            padding: 20px;
        }
        @media print {
            body { margin: 10px; }
            .stage-section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏦 Loan Conditions Report</h1>
        <p>Comprehensive evaluation of applicable loan conditions</p>
    </div>

    <div class="loan-info">
        <h3>📋 Loan Information</h3>
        <p><strong>Loan ID:</strong> ${results.loanId || 'Not specified'}</p>
        <p><strong>Evaluation Date:</strong> ${new Date(results.evaluationDate).toLocaleString()}</p>
        <p><strong>File Processed:</strong> MISMO XML Loan File</p>
    </div>

    <div class="summary">
        <strong>📊 Summary:</strong> Found ${results.totalConditions} applicable condition${results.totalConditions !== 1 ? 's' : ''} 
        ${results.totalConditions > 0 ? 'grouped by loan lifecycle stage' : ''}
    </div>
`;

    // Generate sections for each stage
    (['PTD', 'PTF', 'POST'] as Stage[]).forEach(stage => {
      const conditions = results.conditions[stage];
      const stageName = stageNames[stage];
      
      html += `
    <div class="stage-section">
        <div class="stage-header">
            ${stageName} (${stage}) - ${conditions.length} condition${conditions.length !== 1 ? 's' : ''}
        </div>
`;

      if (conditions.length === 0) {
        html += `
        <div class="no-conditions">
            ✅ No conditions required for this stage
        </div>
`;
      } else {
        conditions.forEach(condition => {
          html += `
        <div class="condition">
            <div class="condition-header">
                <span class="condition-code">${condition.conditionCode}</span>
                <span class="condition-class">${condition.class}</span>
                <span class="condition-provider">${condition.documentProvider}</span>
            </div>
            <div class="description">
                ${condition.description}
            </div>
            ${condition.borrowerDescription ? `
            <div class="borrower-description">
                <strong>For Borrower:</strong> ${condition.borrowerDescription}
            </div>
            ` : ''}
            <div style="margin-top: 10px; font-size: 12px; color: #666;">
                <strong>Category:</strong> ${condition.category}
            </div>
        </div>
`;
        });
      }

      html += `    </div>\n`;
    });

    html += `
    <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
        Generated by Loan Conditions Rules Engine - ${new Date().toLocaleString()}
    </div>
</body>
</html>`;

    return html;
  }

  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return '"' + field.replace(/"/g, '""') + '"';
    }
    return field;
  }

  // Generate filename based on loan data and format
  generateFileName(results: ConditionResult, format: 'json' | 'csv' | 'excel' | 'pdf' | 'html'): string {
    const loanId = results.loanId || 'loan';
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const extension = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : format;
    
    return `${loanId}-conditions-${date}.${extension}`;
  }
}