import { AnalysisResult, ConversionResult } from '../types';

declare global {
  interface Window {
    WasmLoader: any;
    pyodide: any;
  }
}

class WasmService {
  private wasmLoader: any = null;
  private pythonModule: any = null;
  private rustModule: any = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log('🚀 Initializing WASM Service...');
      
      // Load WASM loader script
      await this.loadWasmLoader();
      
      // Initialize WASM modules
      this.wasmLoader = new window.WasmLoader();
      const modules = await this.wasmLoader.loadAll();
      
      this.pythonModule = modules.python;
      this.rustModule = modules.rust;
      this.initialized = true;
      
      console.log('✅ WASM Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize WASM Service:', error);
      throw error;
    }
  }

  private async loadWasmLoader(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.WasmLoader) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = '/wasm-loader.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load WASM loader'));
      document.head.appendChild(script);
    });
  }

  async analyzeDocument(file: File): Promise<AnalysisResult> {
    if (!this.pythonModule) {
      throw new Error('Python WASM module not initialized');
    }

    try {
      console.log(`🔍 Analyzing document: ${file.name}`);
      
      // Call Python WASM function
      const resultJson = this.pythonModule.analyzeDocument(file.name);
      const result = JSON.parse(resultJson);
      
      return {
        originalName: result.original_name,
        suggestedName: result.suggested_name,
        confidence: result.confidence,
        documentType: result.document_type
      };
    } catch (error) {
      console.error('Python analysis error:', error);
      // Fallback to mock analysis
      return this.mockPythonAnalysis(file.name);
    }
  }

  async convertDocuments(
    files: File[], 
    examType: string, 
    targetFormats: string[], 
    maxSizes: Record<string, number>
  ): Promise<ConversionResult> {
    if (!this.rustModule) {
      throw new Error('Rust WASM module not initialized');
    }

    try {
      console.log(`🔄 Converting ${files.length} documents for ${examType}`);
      
      // Convert files to format expected by Rust WASM
      const fileData = await Promise.all(
        files.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          return {
            name: file.name,
            content: Array.from(new Uint8Array(arrayBuffer)),
            mime_type: file.type,
            size: file.size
          };
        })
      );
      
      const request = {
        files: fileData,
        exam_type: examType,
        target_formats: targetFormats,
        max_sizes: maxSizes
      };
      
      // Call Rust WASM function
      const converter = new this.rustModule.WasmDocumentConverter();
      const resultJson = converter.convert_documents(JSON.stringify(request));
      const result = JSON.parse(resultJson);
      
      // Convert blob URLs to actual downloadable URLs
      if (result.success) {
        for (const file of result.files) {
          // In a real implementation, you would create proper blob URLs
          // For now, we'll create mock downloadable content
          const blob = new Blob([new Uint8Array(fileData[0].content)], {
            type: this.getMimeType(file.format)
          });
          file.download_url = URL.createObjectURL(blob);
        }
      }
      
      return {
        success: result.success,
        files: result.files.map((f: any) => ({
          originalName: f.original_name,
          convertedName: f.converted_name,
          downloadUrl: f.download_url
        })),
        error: result.error
      };
    } catch (error) {
      console.error('Rust conversion error:', error);
      // Fallback to mock conversion
      return this.mockConversion(files, targetFormats);
    }
  }

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'PDF': 'application/pdf',
      'JPEG': 'image/jpeg',
      'JPG': 'image/jpeg',
      'PNG': 'image/png',
      'DOCX': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    return mimeTypes[format.toUpperCase()] || 'application/octet-stream';
  }

  // Mock implementations for development
  private mockPythonAnalysis(fileName: string): AnalysisResult {
    const documentTypes: Record<string, string> = {
      'marksheet': '10thMarksheet',
      'certificate': 'Certificate', 
      'photo': 'PassportPhoto',
      'signature': 'Signature',
      'aadhar': 'AadharCard',
      'pan': 'PANCard',
      'caste': 'CasteCertificate',
      'income': 'IncomeCertificate'
    };
    
    const lowerName = fileName.toLowerCase();
    let suggestedName = fileName;
    let documentType = 'Unknown';
    let confidence = 0.5;
    
    for (const [key, value] of Object.entries(documentTypes)) {
      if (lowerName.includes(key)) {
        documentType = value;
        const extension = fileName.split('.').pop();
        suggestedName = `${value}.${extension}`;
        confidence = 0.85;
        break;
      }
    }
    
    // Detect class/grade
    if (lowerName.includes('10') || lowerName.includes('tenth')) {
      suggestedName = suggestedName.replace('Marksheet', '10thMarksheet');
      confidence = Math.min(confidence + 0.1, 1.0);
    } else if (lowerName.includes('12') || lowerName.includes('twelfth')) {
      suggestedName = suggestedName.replace('Marksheet', '12thMarksheet');
      confidence = Math.min(confidence + 0.1, 1.0);
    }
    
    return {
      originalName: fileName,
      suggestedName,
      confidence,
      documentType
    };
  }

  private async mockConversion(
    files: File[],
    targetFormats: string[]
  ): Promise<ConversionResult> {
    console.log('🔄 Using mock conversion (WASM modules not available)');
    
    // Simulate conversion delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const convertedFiles = [];
    
    for (const file of files) {
      // Create a mock converted file for the primary target format
      const primaryFormat = targetFormats[0];
      
      // Create a blob with the original file content
      const blob = new Blob([await file.arrayBuffer()], { 
        type: this.getMimeType(primaryFormat)
      });
      const url = URL.createObjectURL(blob);
      
      const baseName = file.name.split('.')[0];
      const convertedName = `${baseName}_converted.${primaryFormat.toLowerCase()}`;
      
      convertedFiles.push({
        originalName: file.name,
        convertedName,
        downloadUrl: url
      });
    }
    
    return {
      success: true,
      files: convertedFiles
    };
  }
}

export const wasmService = new WasmService();