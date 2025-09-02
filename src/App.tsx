import React, { useState, useCallback, useEffect } from 'react';
import './App.css';
import DragAndDropFile from './components/DragAndDropFile';
import ExamSelector from './components/ExamSelector';
import ExamRequirements from './components/ExamRequirements';
import ConversionProgress from './components/ConversionProgress';
import { wasmService } from './services/wasmService';
import { examConfigs } from './config/examConfigs';
import { Download, Zap, AlertCircle } from 'lucide-react';
import { FileItem } from './types';

function App() {
  const [selectedExam, setSelectedExam] = useState("upsc");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [wasmError, setWasmError] = useState<string | null>(null);
  const [initializationProgress, setInitializationProgress] = useState('Initializing...');

  // Initialize WASM modules on component mount
  useEffect(() => {
    const initializeWasm = async () => {
      try {
        setInitializationProgress('Initializing document service...');
        await wasmService.initialize();
        setInitializationProgress('Document service ready!');
        setWasmLoaded(true);
      } catch (error) {
        console.error('Failed to initialize document service:', error);
        setWasmError(error instanceof Error ? error.message : 'Failed to load document service');
      }
    };

    initializeWasm();
  }, []);

  const handleFilesSelected = useCallback((newFiles: FileItem[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleConvert = async () => {
    if (files.length === 0 || !wasmLoaded) return;
    
    setIsConverting(true);
    const config = examConfigs[selectedExam];
    
    try {
      // Step 1: Analyze documents with Python WASM
      for (const fileItem of files) {
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'analyzing', progress: 20 }
            : f
        ));
        
        try {
          const analysis = await wasmService.analyzeDocument(fileItem.file);
          
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id 
              ? { 
                  ...f, 
                  name: analysis.suggestedName,
                  status: 'converting',
                  progress: 50 
                }
              : f
          ));
        } catch (analysisError) {
          console.warn('Analysis failed, using original name:', analysisError);
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id 
              ? { 
                  ...f, 
                  status: 'converting',
                  progress: 50 
                }
              : f
          ));
        }
      }
      
      // Step 2: Convert documents with Rust WASM
      const filesToConvert = files.map(f => f.file);
      const result = await wasmService.convertDocuments(
        filesToConvert,
        selectedExam,
        config.formats,
        config.maxSizes
      );
      
      if (result.success) {
        setFiles(prev => prev.map((f, index) => ({
          ...f,
          status: 'success',
          progress: 100,
          convertedUrl: result.files[index]?.downloadUrl
        })));
      } else {
        setFiles(prev => prev.map(f => ({
          ...f,
          status: 'error',
          error: result.error || 'Conversion failed'
        })));
      }
    } catch (error) {
      setFiles(prev => prev.map(f => ({
        ...f,
        status: 'error',
        error: error instanceof Error ? error.message : 'Conversion failed'
      })));
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownloadAll = () => {
    const successfulFiles = files.filter(f => f.status === 'success' && f.convertedUrl);
    successfulFiles.forEach(file => {
      const link = document.createElement('a');
      link.href = file.convertedUrl!;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const successfulFiles = files.filter(f => f.status === 'success');

  if (wasmError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Service Loading Error</h2>
          <p className="text-gray-600 mb-4">{wasmError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!wasmLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Loading Document Service</h2>
          <p className="text-gray-600">{initializationProgress}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full bg-white rounded-2xl shadow-xl p-8 max-w-6xl">
        <div className="flex items-start space-x-8">
          {/* Left side - Exam badges */}
          <div className="w-1/4">
            <ExamSelector 
              selectedExam={selectedExam}
              onExamChange={setSelectedExam}
            />
          </div>

          {/* Right side - Main content */}
          <div className="flex-1">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-4 leading-tight">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  getConvertedExams.io
                </span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Your all-in-one
                <strong className="text-gray-800"> Competitive Exams </strong>
                Document Converter
              </p>
              <div className="mt-4 inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>100% Client-Side Processing</span>
              </div>
            </div>

            <ExamRequirements selectedExam={selectedExam} />
            
            <DragAndDropFile onFilesSelected={handleFilesSelected} />
            
            {/* Action Buttons */}
            {files.length > 0 && (
              <div className="mt-6 flex justify-center space-x-4">
                <button
                  onClick={handleConvert}
                  disabled={isConverting || files.some(f => f.status === 'analyzing' || f.status === 'converting')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold flex items-center space-x-2 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                >
                  <Zap className="w-5 h-5" />
                  <span>{isConverting ? 'Converting...' : 'Convert Documents'}</span>
                </button>
                
                {successfulFiles.length > 0 && (
                  <button
                    onClick={handleDownloadAll}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold flex items-center space-x-2 hover:bg-green-700 transition-all duration-200 transform hover:scale-105"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download All ({successfulFiles.length})</span>
                  </button>
                )}
              </div>
            )}
            
            <ConversionProgress files={files} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;