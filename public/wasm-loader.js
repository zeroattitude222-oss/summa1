/**
 * WASM Module Loader
 * Handles loading and initialization of Python and Rust WASM modules
 */

class WasmLoader {
  constructor() {
    this.pythonModule = null;
    this.rustModule = null;
    this.pyodide = null;
  }

  async loadPython() {
    try {
      console.log('🐍 Loading Python WASM module...');
      
      // Load Pyodide
      const pyodideScript = document.createElement('script');
      pyodideScript.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
      document.head.appendChild(pyodideScript);
      
      await new Promise((resolve, reject) => {
        pyodideScript.onload = resolve;
        pyodideScript.onerror = reject;
      });

      // Initialize Pyodide
      this.pyodide = await loadPyodide();
      
      // Load our Python analyzer module
      const analyzerCode = await fetch('/wasm/python-analyzer.py').then(r => r.text());
      await this.pyodide.runPython(analyzerCode);
      
      this.pythonModule = {
        analyzeDocument: (filename) => {
          return this.pyodide.runPython(`analyze_document_wasm("${filename}")`);
        }
      };
      
      console.log('✅ Python WASM module loaded successfully');
      return this.pythonModule;
    } catch (error) {
      console.error('❌ Failed to load Python WASM:', error);
      throw new Error(`Python WASM loading failed: ${error.message}`);
    }
  }

  async loadRust() {
    try {
      console.log('🦀 Loading Rust WASM module...');
      
      // Load Rust WASM module
      const wasmModule = await import('/wasm/rust-converter.js');
      await wasmModule.default();
      
      this.rustModule = wasmModule;
      
      console.log('✅ Rust WASM module loaded successfully');
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
}

// Export for use in other modules
window.WasmLoader = WasmLoader;