import re
import json
from typing import Dict, List, Optional

class DocumentAnalyzer:
    """
    Document analyzer for competitive exam documents.
    Analyzes filenames and suggests standardized names based on content patterns.
    """
    
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
            ],
            'experience': [
                r'experience\s*certificate',
                r'work\s*experience',
                r'employment\s*certificate',
                r'service\s*certificate'
            ]
        }
        
        self.class_patterns = {
            '10th': [r'10th|tenth|class\s*10|x\s*class|sslc'],
            '12th': [r'12th|twelfth|class\s*12|xii\s*class|hsc|intermediate'],
            'graduation': [r'graduation|bachelor|b\.?tech|b\.?sc|b\.?com|b\.?a|degree'],
            'post_graduation': [r'post\s*graduation|master|m\.?tech|m\.?sc|m\.?com|m\.?a|phd']
        }

    def analyze_filename(self, filename: str) -> Dict:
        """Analyze filename and suggest a better name based on content patterns"""
        filename_lower = filename.lower()
        
        # Remove file extension for analysis
        name_without_ext = filename_lower.rsplit('.', 1)[0] if '.' in filename_lower else filename_lower
        file_ext = filename.rsplit('.', 1)[1] if '.' in filename else ''
        
        # Detect document type
        document_type = self._detect_document_type(name_without_ext)
        
        # Detect class/education level
        education_level = self._detect_education_level(name_without_ext)
        
        # Generate suggested name
        suggested_name = self._generate_suggested_name(
            document_type, education_level, file_ext
        )
        
        # Calculate confidence score
        confidence = self._calculate_confidence(name_without_ext, document_type, education_level)
        
        return {
            'original_name': filename,
            'suggested_name': suggested_name,
            'document_type': document_type,
            'education_level': education_level,
            'confidence': confidence,
            'analysis_details': {
                'detected_patterns': self._get_detected_patterns(name_without_ext),
                'standardization_applied': suggested_name != filename
            }
        }

    def _detect_document_type(self, text: str) -> str:
        """Detect the type of document based on filename patterns"""
        for doc_type, patterns in self.document_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    return doc_type
        return 'unknown'

    def _detect_education_level(self, text: str) -> str:
        """Detect education level from filename"""
        for level, patterns in self.class_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    return level
        return 'unknown'

    def _generate_suggested_name(self, doc_type: str, edu_level: str, file_ext: str) -> str:
        """Generate a standardized filename"""
        name_parts = []
        
        # Add education level prefix
        if edu_level != 'unknown':
            if edu_level == '10th':
                name_parts.append('10th')
            elif edu_level == '12th':
                name_parts.append('12th')
            elif edu_level == 'graduation':
                name_parts.append('Graduation')
            elif edu_level == 'post_graduation':
                name_parts.append('PostGraduation')
        
        # Add document type
        if doc_type != 'unknown':
            if doc_type == 'marksheet':
                name_parts.append('Marksheet')
            elif doc_type == 'certificate':
                name_parts.append('Certificate')
            elif doc_type == 'photo':
                name_parts.append('Photo')
            elif doc_type == 'signature':
                name_parts.append('Signature')
            elif doc_type == 'identity':
                name_parts.append('IdentityProof')
            elif doc_type == 'category':
                name_parts.append('CategoryCertificate')
            elif doc_type == 'experience':
                name_parts.append('ExperienceCertificate')
        
        # Default fallback
        if not name_parts:
            name_parts.append('Document')
        
        suggested_name = ''.join(name_parts)
        return f"{suggested_name}.{file_ext}" if file_ext else suggested_name

    def _calculate_confidence(self, text: str, doc_type: str, edu_level: str) -> float:
        """Calculate confidence score for the analysis"""
        confidence = 0.0
        
        # Base confidence for document type detection
        if doc_type != 'unknown':
            confidence += 0.5
        
        # Additional confidence for education level detection
        if edu_level != 'unknown':
            confidence += 0.3
        
        # Bonus for multiple pattern matches
        total_matches = 0
        for patterns in self.document_patterns.values():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    total_matches += 1
        
        for patterns in self.class_patterns.values():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    total_matches += 1
        
        if total_matches > 1:
            confidence += 0.2
        
        return min(confidence, 1.0)

    def _get_detected_patterns(self, text: str) -> List[str]:
        """Get list of detected patterns for debugging"""
        detected = []
        
        for doc_type, patterns in self.document_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    detected.append(f"{doc_type}:{pattern}")
        
        for level, patterns in self.class_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    detected.append(f"{level}:{pattern}")
        
        return detected

# WASM export function
def analyze_document_wasm(filename: str) -> str:
    """Main entry point for WASM integration"""
    analyzer = DocumentAnalyzer()
    result = analyzer.analyze_filename(filename)
    return json.dumps(result)

# Test function for development
if __name__ == "__main__":
    analyzer = DocumentAnalyzer()
    
    test_files = [
        "10marksheet.pdf",
        "12th_certificate.jpg", 
        "graduation_degree.pdf",
        "passport_photo.jpeg",
        "signature.png",
        "caste_certificate.pdf",
        "aadhar_card.pdf",
        "experience_letter.pdf"
    ]
    
    print("🔍 Document Analysis Test Results:")
    print("=" * 60)
    
    for filename in test_files:
        result = analyzer.analyze_filename(filename)
        print(f"\n📄 File: {filename}")
        print(f"   Suggested: {result['suggested_name']}")
        print(f"   Type: {result['document_type']}")
        print(f"   Level: {result['education_level']}")
        print(f"   Confidence: {result['confidence']:.2f}")
        
    print("\n" + "=" * 60)