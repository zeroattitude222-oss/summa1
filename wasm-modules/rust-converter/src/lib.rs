use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Import the `console.log` function from the `console` module
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// Define a macro for easier console logging
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[derive(Serialize, Deserialize)]
pub struct FileData {
    name: String,
    content: Vec<u8>,
    mime_type: String,
    size: u64,
}

#[derive(Serialize, Deserialize)]
pub struct ConvertRequest {
    files: Vec<FileData>,
    exam_type: String,
    target_formats: Vec<String>,
    max_sizes: HashMap<String, u64>,
}

#[derive(Serialize, Deserialize)]
pub struct ConvertedFile {
    original_name: String,
    converted_name: String,
    download_url: String,
    format: String,
    size: u64,
}

#[derive(Serialize, Deserialize)]
pub struct ConvertResponse {
    success: bool,
    files: Vec<ConvertedFile>,
    error: Option<String>,
}

pub struct DocumentConverter {
    temp_storage: HashMap<String, Vec<u8>>,
}

impl DocumentConverter {
    pub fn new() -> Self {
        Self {
            temp_storage: HashMap::new(),
        }
    }

    pub fn convert_documents(&mut self, request: &ConvertRequest) -> Result<ConvertResponse, String> {
        console_log!("🦀 Starting document conversion for {} files", request.files.len());
        
        let mut converted_files = Vec::new();

        for file_data in &request.files {
            console_log!("Processing file: {}", file_data.name);
            
            // Convert to each target format
            for format in &request.target_formats {
                let max_size = request.max_sizes.get(format).copied().unwrap_or(u64::MAX);
                
                match self.convert_to_format(file_data, format, max_size) {
                    Ok(converted) => {
                        converted_files.push(converted);
                        console_log!("✅ Converted {} to {}", file_data.name, format);
                    }
                    Err(e) => {
                        console_log!("❌ Failed to convert {} to {}: {}", file_data.name, format, e);
                        return Ok(ConvertResponse {
                            success: false,
                            files: vec![],
                            error: Some(e),
                        });
                    }
                }
            }
        }

        Ok(ConvertResponse {
            success: true,
            files: converted_files,
            error: None,
        })
    }

    fn convert_to_format(
        &mut self,
        file_data: &FileData,
        target_format: &str,
        max_size: u64,
    ) -> Result<ConvertedFile, String> {
        let converted_content = match target_format.to_uppercase().as_str() {
            "PDF" => self.convert_to_pdf(file_data)?,
            "JPEG" | "JPG" => self.convert_to_jpeg(file_data, max_size)?,
            "PNG" => self.convert_to_png(file_data, max_size)?,
            "DOCX" => self.convert_to_docx(file_data)?,
            _ => return Err(format!("Unsupported format: {}", target_format)),
        };

        // Check size constraint
        if converted_content.len() as u64 > max_size {
            return Err(format!(
                "Converted file size ({} bytes) exceeds maximum allowed size ({} bytes)",
                converted_content.len(),
                max_size
            ));
        }

        // Generate unique filename and create blob URL
        let file_id = uuid::Uuid::new_v4().to_string();
        let extension = target_format.to_lowercase();
        let base_name = file_data.name.rsplit('.').nth(1).unwrap_or(&file_data.name);
        let converted_name = format!("{}.{}", base_name, extension);

        // Store in temporary storage (in real implementation, create blob URL)
        self.temp_storage.insert(file_id.clone(), converted_content.clone());
        let download_url = format!("blob:{}", file_id);

        Ok(ConvertedFile {
            original_name: file_data.name.clone(),
            converted_name,
            download_url,
            format: target_format.to_string(),
            size: converted_content.len() as u64,
        })
    }

    fn convert_to_pdf(&self, file_data: &FileData) -> Result<Vec<u8>, String> {
        match file_data.mime_type.as_str() {
            "application/pdf" => Ok(file_data.content.clone()),
            "image/jpeg" | "image/jpg" | "image/png" => {
                self.create_pdf_with_image(&file_data.content)
            }
            _ => Err("Cannot convert this file type to PDF".to_string()),
        }
    }

    fn convert_to_jpeg(&self, file_data: &FileData, max_size: u64) -> Result<Vec<u8>, String> {
        match file_data.mime_type.as_str() {
            "image/jpeg" | "image/jpg" => {
                self.compress_image(&file_data.content, "jpeg", max_size)
            }
            "image/png" => {
                self.convert_png_to_jpeg(&file_data.content, max_size)
            }
            "application/pdf" => {
                self.pdf_to_jpeg(&file_data.content, max_size)
            }
            _ => Err("Cannot convert this file type to JPEG".to_string()),
        }
    }

    fn convert_to_png(&self, file_data: &FileData, max_size: u64) -> Result<Vec<u8>, String> {
        match file_data.mime_type.as_str() {
            "image/png" => {
                self.compress_image(&file_data.content, "png", max_size)
            }
            "image/jpeg" | "image/jpg" => {
                self.convert_jpeg_to_png(&file_data.content, max_size)
            }
            _ => Err("Cannot convert this file type to PNG".to_string()),
        }
    }

    fn convert_to_docx(&self, file_data: &FileData) -> Result<Vec<u8>, String> {
        match file_data.mime_type.as_str() {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => {
                Ok(file_data.content.clone())
            }
            _ => Err("Cannot convert this file type to DOCX".to_string()),
        }
    }

    // Helper methods (mock implementations for WASM)
    fn create_pdf_with_image(&self, _image_content: &[u8]) -> Result<Vec<u8>, String> {
        // In a real implementation, you would use a PDF library like pdf-writer
        console_log!("📄 Creating PDF with embedded image");
        Ok(b"Mock PDF content with embedded image".to_vec())
    }

    fn compress_image(&self, content: &[u8], format: &str, max_size: u64) -> Result<Vec<u8>, String> {
        console_log!("🖼️ Compressing {} image to max {} bytes", format, max_size);
        
        if content.len() as u64 <= max_size {
            Ok(content.to_vec())
        } else {
            // Simulate compression by reducing size
            let compression_ratio = max_size as f64 / content.len() as f64;
            let compressed_size = (content.len() as f64 * compression_ratio) as usize;
            Ok(content[..compressed_size.min(content.len())].to_vec())
        }
    }

    fn convert_png_to_jpeg(&self, content: &[u8], max_size: u64) -> Result<Vec<u8>, String> {
        console_log!("🔄 Converting PNG to JPEG");
        self.compress_image(content, "jpeg", max_size)
    }

    fn convert_jpeg_to_png(&self, content: &[u8], max_size: u64) -> Result<Vec<u8>, String> {
        console_log!("🔄 Converting JPEG to PNG");
        self.compress_image(content, "png", max_size)
    }

    fn pdf_to_jpeg(&self, _content: &[u8], max_size: u64) -> Result<Vec<u8>, String> {
        console_log!("📄➡️🖼️ Converting PDF to JPEG");
        let mock_jpeg = b"Mock JPEG content from PDF";
        if mock_jpeg.len() as u64 <= max_size {
            Ok(mock_jpeg.to_vec())
        } else {
            Err("PDF to JPEG conversion resulted in file too large".to_string())
        }
    }
}

// WASM exports
#[wasm_bindgen]
pub struct WasmDocumentConverter {
    converter: DocumentConverter,
}

#[wasm_bindgen]
impl WasmDocumentConverter {
    #[wasm_bindgen(constructor)]
    pub fn new() -> WasmDocumentConverter {
        console_log!("🦀 Initializing Rust WASM Document Converter");
        WasmDocumentConverter {
            converter: DocumentConverter::new(),
        }
    }

    #[wasm_bindgen]
    pub fn convert_documents(&mut self, request_json: &str) -> String {
        match serde_json::from_str::<ConvertRequest>(request_json) {
            Ok(request) => {
                match self.converter.convert_documents(&request) {
                    Ok(response) => serde_json::to_string(&response).unwrap_or_else(|e| {
                        format!(r#"{{"success": false, "files": [], "error": "Serialization error: {}"}}"#, e)
                    }),
                    Err(e) => {
                        format!(r#"{{"success": false, "files": [], "error": "{}"}}"#, e)
                    }
                }
            }
            Err(e) => {
                format!(r#"{{"success": false, "files": [], "error": "Invalid request format: {}"}}"#, e)
            }
        }
    }
}

// Initialize WASM module
#[wasm_bindgen(start)]
pub fn main() {
    console_log!("🚀 Rust WASM Document Converter initialized");
}