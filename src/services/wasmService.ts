import { AnalysisResult, ConversionResult } from '../types';

class WasmService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log('🚀 Initializing Document Service...');
      
      // Simulate initialization delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.initialized = true;
      console.log('✅ Document Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Document Service:', error);
      throw error;
    }
  }

  async analyzeDocument(file: File): Promise<AnalysisResult> {
    if (!this.initialized) {
      throw new Error('Document service not initialized');
    }

    try {
      console.log(`🔍 Analyzing document: ${file.name}`);
      
      const analysis = this.analyzeFilename(file.name);
      
      return {
        originalName: file.name,
        suggestedName: analysis.suggestedName,
        confidence: analysis.confidence,
        documentType: analysis.documentType
      };
    } catch (error) {
      console.error('Document analysis error:', error);
      return {
        originalName: file.name,
        suggestedName: file.name,
        confidence: 0.5,
        documentType: 'unknown'
      };
    }
  }

  private analyzeFilename(filename: string) {
    const documentPatterns = {
      'marksheet': [
        /marksheet|mark\s*sheet/i,
        /grade\s*report/i,
        /academic\s*record/i,
        /transcript/i,
        /result/i
      ],
      'certificate': [
        /certificate/i,
        /diploma/i,
        /degree/i,
        /qualification/i
      ],
      'photo': [
        /photo/i,
        /photograph/i,
        /image/i,
        /picture/i,
        /passport\s*size/i
      ],
      'signature': [
        /signature/i,
        /sign/i,
        /autograph/i
      ],
      'identity': [
        /aadhar|aadhaar/i,
        /pan\s*card/i,
        /voter\s*id/i,
        /passport/i,
        /driving\s*license/i,
        /identity\s*proof/i
      ],
      'category': [
        /caste\s*certificate/i,
        /category\s*certificate/i,
        /reservation\s*certificate/i,
        /obc|sc|st|ews/i,
        /income\s*certificate/i
      ]
    };
    
    const classPatterns = {
      '10th': [/10th|tenth|class\s*10|x\s*class|sslc/i],
      '12th': [/12th|twelfth|class\s*12|xii\s*class|hsc|intermediate/i],
      'graduation': [/graduation|bachelor|b\.?tech|b\.?sc|b\.?com|b\.?a|degree/i],
      'post_graduation': [/post\s*graduation|master|m\.?tech|m\.?sc|m\.?com|m\.?a|phd/i]
    };

    const filenameLower = filename.toLowerCase();
    const nameWithoutExt = filename.includes('.') ? filename.substring(0, filename.lastIndexOf('.')) : filename;
    const fileExt = filename.includes('.') ? filename.substring(filename.lastIndexOf('.') + 1) : '';
    
    // Detect document type
    let documentType = 'unknown';
    for (const [type, patterns] of Object.entries(documentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(filenameLower)) {
          documentType = type;
          break;
        }
      }
      if (documentType !== 'unknown') break;
    }
    
    // Detect education level
    let educationLevel = 'unknown';
    for (const [level, patterns] of Object.entries(classPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(filenameLower)) {
          educationLevel = level;
          break;
        }
      }
      if (educationLevel !== 'unknown') break;
    }
    
    // Generate suggested name
    const nameParts = [];
    
    if (educationLevel !== 'unknown') {
      const levelMap: Record<string, string> = {
        '10th': '10th',
        '12th': '12th',
        'graduation': 'Graduation',
        'post_graduation': 'PostGraduation'
      };
      nameParts.push(levelMap[educationLevel]);
    }
    
    if (documentType !== 'unknown') {
      const typeMap: Record<string, string> = {
        'marksheet': 'Marksheet',
        'certificate': 'Certificate',
        'photo': 'Photo',
        'signature': 'Signature',
        'identity': 'IdentityProof',
        'category': 'CategoryCertificate'
      };
      nameParts.push(typeMap[documentType]);
    }
    
    if (nameParts.length === 0) {
      nameParts.push('Document');
    }
    
    const suggestedName = nameParts.join('') + (fileExt ? `.${fileExt}` : '');
    
    // Calculate confidence
    let confidence = 0.5;
    if (documentType !== 'unknown') confidence += 0.3;
    if (educationLevel !== 'unknown') confidence += 0.2;
    
    return {
      suggestedName,
      confidence: Math.min(confidence, 1.0),
      documentType
    };
  }

  async convertDocuments(
    files: File[], 
    examType: string, 
    targetFormats: string[], 
    maxSizes: Record<string, number>
  ): Promise<ConversionResult> {
    if (!this.initialized) {
      throw new Error('Document service not initialized');
    }

    try {
      console.log(`🔄 Converting ${files.length} documents for ${examType}`);
      
      // Simulate conversion process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const convertedFiles = [];
      
      for (const file of files) {
        // Get the primary target format
        const primaryFormat = targetFormats[0];
        const maxSize = maxSizes[primaryFormat] || 5 * 1024 * 1024; // 5MB default
        
        // Check if file needs compression
        let processedFile = file;
        if (file.size > maxSize) {
          // For images, we can compress them
          if (file.type.startsWith('image/')) {
            processedFile = await this.compressImage(file, maxSize);
          } else {
            console.warn(`File ${file.name} is too large (${file.size} bytes > ${maxSize} bytes)`);
          }
        }
        
        // Create blob URL for download
        const blob = new Blob([await processedFile.arrayBuffer()], { 
          type: this.getMimeType(primaryFormat)
        });
        const url = URL.createObjectURL(blob);
        
        // Generate converted filename
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const extension = primaryFormat.toLowerCase();
        const convertedName = `${baseName}_${examType.toUpperCase()}.${extension}`;
        
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
    } catch (error) {
      console.error('Document conversion error:', error);
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Conversion failed'
      };
    }
  }

  private async compressImage(file: File, maxSize: number): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions to reduce file size
        const scaleFactor = Math.sqrt(maxSize / file.size);
        canvas.width = img.width * scaleFactor;
        canvas.height = img.height * scaleFactor;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Return original if compression fails
          }
        }, file.type, 0.8); // 80% quality
      };
      
      img.onerror = () => resolve(file); // Return original if image loading fails
      img.src = URL.createObjectURL(file);
    });
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

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const wasmService = new WasmService();