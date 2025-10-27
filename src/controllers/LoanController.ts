import { Request, Response } from 'express';
import { LoanConditionsService } from '../services/LoanConditionsService';
import { ExportService } from '../services/ExportService';
import { ConditionResult } from '../types';

export class LoanController {
  private loanService: LoanConditionsService;
  private exportService: ExportService;

  constructor() {
    this.loanService = new LoanConditionsService();
    this.exportService = new ExportService();
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      await this.loanService.initialize();
    } catch (error) {
      console.error('Failed to initialize loan service:', error);
    }
  }

  // POST /api/loans/evaluate - Evaluate MISMO file and return applicable conditions
  evaluateLoan = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ 
          error: 'No file uploaded',
          message: 'Please upload a MISMO XML file'
        });
        return;
      }

      // Validate file type
      if (!req.file.originalname.toLowerCase().endsWith('.xml')) {
        res.status(400).json({ 
          error: 'Invalid file type',
          message: 'Please upload an XML file'
        });
        return;
      }

      const xmlContent = req.file.buffer.toString('utf-8');
      
      // Validate XML content
      if (!xmlContent.trim().startsWith('<?xml') && !xmlContent.trim().startsWith('<')) {
        res.status(400).json({ 
          error: 'Invalid XML format',
          message: 'The uploaded file does not appear to be valid XML'
        });
        return;
      }

      console.log(`Processing MISMO file: ${req.file.originalname} (${req.file.size} bytes)`);
      
      const result = await this.loanService.evaluateLoan(xmlContent);
      
      res.json({
        success: true,
        data: result,
        metadata: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          processedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error evaluating loan:', error);
      res.status(500).json({ 
        error: 'Evaluation failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  // GET /api/conditions/stats - Get condition statistics
  getConditionStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = this.loanService.getConditionsStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting condition stats:', error);
      res.status(500).json({ 
        error: 'Failed to get statistics',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  // GET /api/conditions/:code - Get specific condition details
  getConditionDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      
      if (!code) {
        res.status(400).json({ 
          error: 'Missing condition code',
          message: 'Please provide a condition code'
        });
        return;
      }

      const condition = this.loanService.getConditionDetails(code.toUpperCase());
      
      if (!condition) {
        res.status(404).json({ 
          error: 'Condition not found',
          message: `No condition found with code: ${code}`
        });
        return;
      }

      res.json({
        success: true,
        data: condition
      });
    } catch (error) {
      console.error('Error getting condition details:', error);
      res.status(500).json({ 
        error: 'Failed to get condition details',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  // GET /api/conditions/search?q=searchTerm - Search conditions
  searchConditions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        res.status(400).json({ 
          error: 'Missing search query',
          message: 'Please provide a search query parameter (q)'
        });
        return;
      }

      const conditions = this.loanService.searchConditions(q);
      
      res.json({
        success: true,
        data: {
          query: q,
          count: conditions.length,
          conditions: conditions
        }
      });
    } catch (error) {
      console.error('Error searching conditions:', error);
      res.status(500).json({ 
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  // POST /api/conditions/reload - Reload conditions from CSV
  reloadConditions = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.loanService.reloadConditions();
      const stats = this.loanService.getConditionsStats();
      
      res.json({
        success: true,
        message: 'Conditions reloaded successfully',
        data: stats
      });
    } catch (error) {
      console.error('Error reloading conditions:', error);
      res.status(500).json({ 
        error: 'Failed to reload conditions',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  // GET /api/health - Health check endpoint
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = this.loanService.getConditionsStats();
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Loan Conditions Rules Engine',
        version: '1.0.0',
        conditions: {
          loaded: stats.total > 0,
          count: stats.total
        }
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({ 
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  // POST /api/loans/validate - Validate loan data structure
  validateLoanData = async (req: Request, res: Response): Promise<void> => {
    try {
      const loanData = req.body;
      
      if (!loanData || typeof loanData !== 'object') {
        res.status(400).json({ 
          error: 'Invalid request body',
          message: 'Please provide loan data in the request body'
        });
        return;
      }

      const validation = this.loanService.validateLoanData(loanData);
      
      if (validation.isValid) {
        res.json({
          success: true,
          valid: true,
          message: 'Loan data is valid'
        });
      } else {
        res.status(400).json({
          success: false,
          valid: false,
          errors: validation.errors
        });
      }
    } catch (error) {
      console.error('Error validating loan data:', error);
      res.status(500).json({ 
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  // POST /api/loans/export - Export loan conditions in various formats
  exportLoanConditions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { results, format } = req.body;
      
      if (!results || !format) {
        res.status(400).json({ 
          error: 'Missing required fields',
          message: 'Please provide both results and format in the request body'
        });
        return;
      }

      const conditionResults = results as ConditionResult;
      const fileName = this.exportService.generateFileName(conditionResults, format);

      switch (format.toLowerCase()) {
        case 'json':
          const jsonData = this.exportService.exportToJSON(conditionResults);
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
          res.send(jsonData);
          break;

        case 'csv':
          const csvData = this.exportService.exportToCSV(conditionResults);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
          res.send(csvData);
          break;

        case 'excel':
          const excelBuffer = await this.exportService.exportToExcel(conditionResults);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
          res.send(excelBuffer);
          break;

        case 'html':
          const htmlData = this.exportService.generateHTMLReport(conditionResults);
          res.setHeader('Content-Type', 'text/html');
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
          res.send(htmlData);
          break;

        default:
          res.status(400).json({ 
            error: 'Invalid format',
            message: 'Supported formats: json, csv, excel, html'
          });
          return;
      }

      console.log(`Exported loan conditions in ${format} format: ${fileName}`);

    } catch (error) {
      console.error('Error exporting loan conditions:', error);
      res.status(500).json({ 
        error: 'Export failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  // GET /api/loans/export/formats - Get available export formats
  getExportFormats = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        formats: [
          {
            key: 'json',
            name: 'JSON',
            description: 'JavaScript Object Notation - machine readable format',
            extension: 'json'
          },
          {
            key: 'csv', 
            name: 'CSV',
            description: 'Comma Separated Values - spreadsheet compatible',
            extension: 'csv'
          },
          {
            key: 'excel',
            name: 'Excel',
            description: 'Microsoft Excel spreadsheet with formatting',
            extension: 'xlsx'
          },
          {
            key: 'html',
            name: 'HTML Report',
            description: 'Formatted HTML report for printing or viewing',
            extension: 'html'
          }
        ]
      });
    } catch (error) {
      console.error('Error getting export formats:', error);
      res.status(500).json({ 
        error: 'Failed to get export formats',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };
}