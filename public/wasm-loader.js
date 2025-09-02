/**
 * WASM Module Loader
 * Handles loading and initialization of Python and Rust WASM modules
 */

class WasmLoader {
  constructor() {
    this.pythonModule = null;
    this.rustModule = null;
    this.pyodide = null;
    this.isInitialized = false;
  }

  async loadPython() {
    try {
      console.log('🐍 Loading Python WASM module...');
      
      // Load Pyodide from CDN
      if (!window.loadPyodide) {
        await this.loadPyodideScript();
      }
      
      // Initialize Pyodide
      this.pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
      });
      
      // Load our Python analyzer code
      const analyzerCode = `
import re
import json
from typing import Dict, List

class DocumentAnalyzer:
    def __init__(self):
        self.document_patterns = {
            'marksheet': [
                r'marksheet|mark\\s*sheet',
                r'grade\\s*report',
                r'academic\\s*record',
                r'transcript',
                r'result'
            ],
            'certificate': [
                r'certificate',
                r'diploma',
                r'degree',
                r'qualification'
            ],
            'photo': [
                r'photo',
                r'photograph',
                r'image',
                r'picture',
                r'passport\\s*size'
            ],
            'signature': [
                r'signature',
                r'sign',
                r'autograph'
            ],
            'identity': [
                r'aadhar|aadhaar',
                r'pan\\s*card',
                r'voter\\s*id',
                r'passport',
                r'driving\\s*license',
                r'identity\\s*proof'
            ],
            'category': [
                r'caste\\s*certificate',
                r'category\\s*certificate',
                r'reservation\\s*certificate',
                r'obc|sc|st|ews',
                r'income\\s*certificate'
            ]
        }
        
        self.class_patterns = {
            '10th': [r'10th|tenth|class\\s*10|x\\s*class|sslc'],
            '12th': [r'12th|twelfth|class\\s*12|xii\\s*class|hsc|intermediate'],
            'graduation': [r'graduation|bachelor|b\\.?tech|b\\.?sc|b\\.?com|b\\.?a|degree'],
            'post_graduation': [r'post\\s*graduation|master|m\\.?tech|m\\.?sc|m\\.?com|m\\.?a|phd']
        }

    def analyze_filename(self, filename):
        filename_lower = filename.lower()
        name_without_ext = filename_lower.rsplit('.', 1)[0] if '.' in filename_lower else filename_lower
        file_ext = filename.rsplit('.', 1)[1] if '.' in filename else ''
        
        document_type = self._detect_document_type(name_without_ext)
        education_level = self._detect_education_level(name_without_ext)
        suggested_name = self._generate_suggested_name(document_type, education_level, file_ext)
        confidence = self._calculate_confidence(name_without_ext, document_type, education_level)
        
        return {
            'original_name': filename,
            'suggested_name': suggested_name,
            'document_type': document_type,
            'education_level': education_level,
            'confidence': confidence
        }

    def _detect_document_type(self, text):
        for doc_type, patterns in self.document_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    return doc_type
        return 'unknown'

    def _detect_education_level(self, text):
        for level, patterns in self.class_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    return level
        return 'unknown'

    def _generate_suggested_name(self, doc_type, edu_level, file_ext):
        name_parts = []
        
        if edu_level != 'unknown':
            level_map = {
                '10th': '10th',
                '12th': '12th', 
                'graduation': 'Graduation',
                'post_graduation': 'PostGraduation'
            }
            name_parts.append(level_map.get(edu_level, edu_level))
        
        if doc_type != 'unknown':
            type_map = {
                'marksheet': 'Marksheet',
                'certificate': 'Certificate',
                'photo': 'Photo',
                'signature': 'Signature',
                'identity': 'IdentityProof',
                'category': 'CategoryCertificate'
            }
            name_parts.append(type_map.get(doc_type, doc_type))
        
        if not name_parts:
            name_parts.append('Document')
        
        suggested_name = ''.join(name_parts)
        return f"{suggested_name}.{file_ext}" if file_ext else suggested_name

    def _calculate_confidence(self, text, doc_type, edu_level):
        confidence = 0.0
        
        if doc_type != 'unknown':
            confidence += 0.5
        if edu_level != 'unknown':
            confidence += 0.3
            
        total_matches = 0
        for patterns in list(self.document_patterns.values()) + list(self.class_patterns.values()):
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    total_matches += 1
        
        if total_matches > 1:
            confidence += 0.2
        
        return min(confidence, 1.0)

# Global analyzer instance
_analyzer = DocumentAnalyzer()

def analyze_document_wasm(filename):
    try:
        result = _analyzer.analyze_filename(filename)
        return json.dumps(result)
    except Exception as e:
        return json.dumps({
            'original_name': filename,
            'suggested_name': filename,
            'document_type': 'unknown',
            'education_level': 'unknown',
            'confidence': 0.0,
            'error': str(e)
        })

print("🐍 Python WASM Document Analyzer loaded successfully!")
`;
      
      // Run the Python code in Pyodide
      await this.pyodide.runPython(analyzerCode);
      
      this.pythonModule = {
        analyzeDocument: (filename) => {
          try {
            const result = this.pyodide.runPython(`analyze_document_wasm("${filename}")`);
            return JSON.parse(result);
          } catch (error) {
            console.error('Python analysis error:', error);
            return {
              originalName: filename,
              suggestedName: filename,
              confidence: 0.0,
              documentType: 'unknown',
              error: error.message
            };
          }
        }
      };
      
      console.log('✅ Python WASM module loaded successfully');
      return this.pythonModule;
    } catch (error) {
      console.error('❌ Failed to load Python WASM:', error);
      throw new Error(`Python WASM loading failed: ${error.message}`);
    }
  }

  async loadPyodideScript() {
    return new Promise((resolve, reject) => {
      if (window.loadPyodide) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
      script.onload = () => {
        console.log('✅ Pyodide script loaded');
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Pyodide script'));
      document.head.appendChild(script);
    });
  }

  async loadRust() {
    try {
      console.log('🦀 Loading Rust WASM module...');
      
      // Mock Rust module for now since we don't have the actual WASM file
      this.rustModule = {
        WasmDocumentConverter: class {
          convert_documents(requestJson) {
            const request = JSON.parse(requestJson);
            console.log('🦀 Mock Rust conversion for', request.files.length, 'files');
            
            // Mock successful conversion
            const files = request.files.map((file, index) => ({
              original_name: file.name,
              converted_name: `converted_${file.name}`,
              download_url: `blob:mock-${index}`,
              format: request.target_formats[0],
              size: file.size
            }));
            
            return JSON.stringify({
              success: true,
              files: files,
              error: null
            });
          }
        }
      };
      
      console.log('✅ Rust WASM module loaded successfully (mock)');
      return this.rustModule;
    } catch (error) {
      console.error('❌ Failed to load Rust WASM:', error);
      throw new Error(`Rust WASM loading failed: ${error.message}`);
    }
  }

  async loadAll() {
    try {
      console.log('🚀 Loading all WASM modules...');
      
      await Promise.all([
        this.loadPython(),
        this.loadRust()
      ]);
      
      this.isInitialized = true;
      console.log('🎉 All WASM modules loaded successfully!');
      return {
        python: this.pythonModule,
        rust: this.rustModule
      };
    } catch (error) {
      console.error('❌ Failed to load WASM modules:', error);
      throw error;
    }
  }

  getPythonModule() {
    return this.pythonModule;
  }

  getRustModule() {
    return this.rustModule;
  }

  isReady() {
    return this.isInitialized && this.pythonModule && this.rustModule;
  }
}

// Export for use in other modules
window.WasmLoader = WasmLoader;