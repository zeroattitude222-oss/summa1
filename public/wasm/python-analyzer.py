# Python WASM Module for Document Analysis
# This file is loaded by Pyodide in the browser

import re
import json
from typing import Dict, List

class DocumentAnalyzer:
    """Client-side document analyzer running in WebAssembly"""
    
    def __init__(self):
        self.document_patterns = {
            'marksheet': [
                r'marksheet|mark\s*sheet',
                r'grade\s*report',
                r'academic\s*record',
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
                r'passport\s*size'
            ],
            'signature': [
                r'signature',
                r'sign',
                r'autograph'
            ],
            'identity': [
                r'aadhar|aadhaar',
                r'pan\s*card',
                r'voter\s*id',
                r'passport',
                r'driving\s*license',
                r'identity\s*proof'
            ],
            'category': [
                r'caste\s*certificate',
                r'category\s*certificate',
                r'reservation\s*certificate',
                r'obc|sc|st|ews',
                r'income\s*certificate'
            ]
        }
        
        self.class_patterns = {
            '10th': [r'10th|tenth|class\s*10|x\s*class|sslc'],
            '12th': [r'12th|twelfth|class\s*12|xii\s*class|hsc|intermediate'],
            'graduation': [r'graduation|bachelor|b\.?tech|b\.?sc|b\.?com|b\.?a|degree'],
            'post_graduation': [r'post\s*graduation|master|m\.?tech|m\.?sc|m\.?com|m\.?a|phd']
        }

    def analyze_filename(self, filename: str) -> Dict:
        """Analyze filename and suggest standardized name"""
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

    def _detect_document_type(self, text: str) -> str:
        for doc_type, patterns in self.document_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    return doc_type
        return 'unknown'

    def _detect_education_level(self, text: str) -> str:
        for level, patterns in self.class_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    return level
        return 'unknown'

    def _generate_suggested_name(self, doc_type: str, edu_level: str, file_ext: str) -> str:
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

    def _calculate_confidence(self, text: str, doc_type: str, edu_level: str) -> float:
        confidence = 0.0
        
        if doc_type != 'unknown':
            confidence += 0.5
        if edu_level != 'unknown':
            confidence += 0.3
            
        # Count pattern matches
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

# WASM export function
def analyze_document_wasm(filename: str) -> str:
    """Main entry point for WASM integration"""
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

# Make function available globally for JavaScript
globals()['analyze_document_wasm'] = analyze_document_wasm

print("🐍 Python WASM Document Analyzer loaded successfully!")