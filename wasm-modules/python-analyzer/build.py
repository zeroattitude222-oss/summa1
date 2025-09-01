#!/usr/bin/env python3
"""
Build script for Python WASM module
Compiles Python code to WebAssembly using Pyodide
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def build_python_wasm():
    """Build Python code to WASM using Pyodide"""
    
    print("🐍 Building Python WASM module...")
    
    # Create build directory
    build_dir = Path("build")
    build_dir.mkdir(exist_ok=True)
    
    # Copy source files
    src_files = ["analyzer.py"]
    for file in src_files:
        if Path(file).exists():
            shutil.copy2(file, build_dir / file)
            print(f"   ✅ Copied {file}")
    
    # Create WASM wrapper
    wrapper_content = '''
import sys
import json
from analyzer import analyze_document_wasm

# Export function for JavaScript
def analyze_document(filename):
    try:
        result = analyze_document_wasm(filename)
        return result
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "original_name": filename,
            "suggested_name": filename,
            "confidence": 0.0,
            "document_type": "unknown"
        })

# Make function available globally
globals()['analyze_document'] = analyze_document
'''
    
    with open(build_dir / "wasm_wrapper.py", "w") as f:
        f.write(wrapper_content)
    
    print("   ✅ Created WASM wrapper")
    
    # Create package info
    package_info = {
        "name": "python-analyzer",
        "version": "1.0.0",
        "main": "wasm_wrapper.py",
        "exports": ["analyze_document"]
    }
    
    with open(build_dir / "package.json", "w") as f:
        json.dump(package_info, f, indent=2)
    
    print("   ✅ Created package.json")
    print("🎉 Python WASM build complete!")
    
    return True

if __name__ == "__main__":
    try:
        success = build_python_wasm()
        if success:
            print("\n✅ Build successful! WASM module ready for integration.")
            sys.exit(0)
        else:
            print("\n❌ Build failed!")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Build error: {e}")
        sys.exit(1)