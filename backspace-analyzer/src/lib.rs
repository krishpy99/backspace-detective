// Rust Lesson 1: Importing External Crates and Setting Up WASM
// -----------------------------------------------------------------------
// wasm-bindgen - Allows Rust code to be called from JavaScript
// serde - Provides serialization/deserialization functionality
// serde_json - Handles JSON serialization/deserialization

use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

// Rust Lesson 2: Creating Custom Types
// -----------------------------------------------------------------------
// We use #[derive] to automatically implement traits for our structs
// Serialize and Deserialize allow conversion to/from JSON
// Clone lets us make copies of the struct

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EditingStats {
    pub total_keystrokes: u32,
    pub backspace_count: u32,
    pub delete_count: u32,
    pub characters_typed: u32,
    pub edit_duration_ms: u64,
}

// Rust Lesson 3: Implementing Methods on Structs
// -----------------------------------------------------------------------
// We use impl to define methods that belong to a struct
// &self refers to the instance the method is called on

impl EditingStats {
    pub fn new() -> Self {
        EditingStats {
            total_keystrokes: 0,
            backspace_count: 0,
            delete_count: 0,
            characters_typed: 0,
            edit_duration_ms: 0,
        }
    }

    pub fn backspace_ratio(&self) -> f64 {
        if self.total_keystrokes == 0 {
            return 0.0;
        }
        self.backspace_count as f64 / self.total_keystrokes as f64
    }

    pub fn delete_ratio(&self) -> f64 {
        if self.total_keystrokes == 0 {
            return 0.0;
        }
        self.delete_count as f64 / self.total_keystrokes as f64
    }

    pub fn correction_ratio(&self) -> f64 {
        if self.total_keystrokes == 0 {
            return 0.0;
        }
        (self.backspace_count + self.delete_count) as f64 / self.total_keystrokes as f64
    }

    pub fn typing_speed(&self) -> f64 {
        if self.edit_duration_ms == 0 {
            return 0.0;
        }
        // Characters per minute
        self.characters_typed as f64 / (self.edit_duration_ms as f64 / 1000.0 / 60.0)
    }
}

// Rust Lesson 4: Creating WASM-Compatible Functions
// -----------------------------------------------------------------------
// #[wasm_bindgen] exposes functions to JavaScript
// Using JsValue to pass complex data between JS and Rust

#[wasm_bindgen]
pub fn analyze_editing_pattern(stats_json: &str) -> String {
    // Parse the JSON string into our EditingStats struct
    let stats: EditingStats = match serde_json::from_str(stats_json) {
        Ok(stats) => stats,
        Err(_) => return json_error("Failed to parse editing stats"),
    };
    
    let analysis = perform_analysis(&stats);
    
    // Convert the analysis result back to JSON
    match serde_json::to_string(&analysis) {
        Ok(json) => json,
        Err(_) => json_error("Failed to serialize analysis results"),
    }
}

// Rust Lesson 5: Error Handling and JSON Utilities
// -----------------------------------------------------------------------
// Creating helper functions to handle errors gracefully

fn json_error(message: &str) -> String {
    let error = serde_json::json!({
        "error": message,
        "is_error": true
    });
    serde_json::to_string(&error).unwrap_or_else(|_| r#"{"error":"JSON error"}"#.to_string())
}

// Rust Lesson 6: Analysis Logic and Algorithms
// -----------------------------------------------------------------------
// Implementing the core analysis functionality with custom types

#[derive(Serialize, Deserialize)]
struct AnalysisResult {
    prediction: String,
    confidence: f64,
    backspace_ratio: f64,
    typing_speed: f64,
    metrics: EditingMetrics,
}

#[derive(Serialize, Deserialize)]
struct EditingMetrics {
    correction_frequency: f64,
    character_efficiency: f64, 
    correction_patterns: Vec<String>,
}

fn perform_analysis(stats: &EditingStats) -> AnalysisResult {
    // Calculate metrics
    let backspace_ratio = stats.backspace_ratio();
    let typing_speed = stats.typing_speed();
    
    // Some basic heuristics for AI vs human detection:
    // - AI typically has a much lower backspace ratio (under 0.05)
    // - Humans usually have backspace ratios between 0.08 and 0.25
    // - Very high typing speeds with low backspace ratio strongly indicate AI
    
    let mut confidence: f64 = 0.5; // Start with neutral confidence
    let mut prediction = "Unknown";
    
    // Make adjustments based on backspace ratio
    if backspace_ratio < 0.05 {
        confidence += 0.3;
        if typing_speed > 400.0 {
            confidence += 0.2;
        }
        prediction = "AI";
    } else if backspace_ratio > 0.08 {
        confidence += 0.2;
        if backspace_ratio > 0.15 {
            confidence += 0.1;
        }
        prediction = "Human";
    }
    
    // Adjust confidence based on typing speed
    if typing_speed > 600.0 && backspace_ratio < 0.07 {
        confidence = f64::max(confidence, 0.8);
        prediction = "AI";
    } else if typing_speed < 300.0 && backspace_ratio > 0.1 {
        confidence = f64::max(confidence, 0.7);
        prediction = "Human";
    }
    
    // Cap confidence between 0.5 and 0.95
    confidence = f64::min(confidence, 0.95).max(0.5);
    
    // Calculate additional metrics
    let character_efficiency = if stats.characters_typed > 0 {
        (stats.characters_typed - stats.backspace_count - stats.delete_count) as f64 
            / stats.characters_typed as f64
    } else {
        0.0
    };
    
    // Determine patterns (simplified)
    let mut patterns = Vec::new();
    if backspace_ratio > 0.2 {
        patterns.push("Frequent corrections".to_string());
    }
    if typing_speed > 500.0 {
        patterns.push("Very fast typing".to_string());
    }
    if character_efficiency < 0.7 {
        patterns.push("Low efficiency".to_string());
    }
    
    AnalysisResult {
        prediction: prediction.to_string(),
        confidence,
        backspace_ratio,
        typing_speed,
        metrics: EditingMetrics {
            correction_frequency: stats.correction_ratio(),
            character_efficiency,
            correction_patterns: patterns,
        }
    }
}

// Rust Lesson 7: Unit Tests
// -----------------------------------------------------------------------
// Unit tests ensure our code works as expected
// Tests run with `cargo test`

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_editing_stats() {
        let stats = EditingStats::new();
        assert_eq!(stats.total_keystrokes, 0);
        assert_eq!(stats.backspace_count, 0);
    }

    #[test]
    fn test_backspace_ratio() {
        let mut stats = EditingStats::new();
        stats.total_keystrokes = 100;
        stats.backspace_count = 10;
        
        assert_eq!(stats.backspace_ratio(), 0.1);
    }

    #[test]
    fn test_analyze_editing_pattern() {
        let stats = EditingStats {
            total_keystrokes: 1000,
            backspace_count: 5,
            delete_count: 2,
            characters_typed: 993,
            edit_duration_ms: 60000, // 1 minute
        };
        
        let stats_json = serde_json::to_string(&stats).unwrap();
        let result = analyze_editing_pattern(&stats_json);
        
        let analysis: AnalysisResult = serde_json::from_str(&result).unwrap();
        assert_eq!(analysis.prediction, "AI");
        assert!(analysis.confidence > 0.7);
    }
}
