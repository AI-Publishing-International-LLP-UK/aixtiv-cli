#!/usr/bin/env python3
"""
Continuous Testing, Training, and Tuning (CTTT) Pipeline for the Aixtiv Platform

This script orchestrates the CTTT pipeline, including:
1. Test execution and reporting
2. Model training and evaluation
3. System performance monitoring and tuning
4. Automated documentation generation

Author: Dr. Claude Automation
"""

import os
import sys
import json
import time
import argparse
import subprocess
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Union, Optional, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(f"cttt-pipeline-{datetime.now().strftime('%Y%m%d-%H%M%S')}.log")
    ]
)
logger = logging.getLogger("CTTT")

# Agent tracking integration
sys.path.append(str(Path(__file__).parent.parent))
try:
    from lib.agent_tracking import log_agent_action
except ImportError:
    # Fallback if agent tracking is not available
    def log_agent_action(action_type: str, description: str) -> None:
        logger.info(f"AGENT_ACTION [{action_type}]: {description}")

class CTTTPipeline:
    """
    Continuous Testing, Training, and Tuning Pipeline Manager
    """
    
    def __init__(self, project_id: str = "api-for-warp-drive", agent_id: str = "DR_CLAUDE_AUTOMATION"):
        """Initialize the CTTT Pipeline"""
        self.project_id = project_id
        self.agent_id = agent_id
        self.start_time = time.time()
        self.root_dir = Path(__file__).parent.parent
        self.results = {
            "testing": {},
            "training": {},
            "tuning": {},
            "documentation": {}
        }
        
        # Set environment variables
        os.environ["AGENT_ID"] = self.agent_id
        os.environ["PROJECT_ID"] = self.project_id
        
        # Log initialization
        log_agent_action("cttt_init", f"Initializing CTTT pipeline for project {self.project_id}")
        logger.info(f"CTTT Pipeline initialized for project {self.project_id}")
    
    def run_command(self, command: List[str], description: str) -> subprocess.CompletedProcess:
        """Run a shell command and log results"""
        logger.info(f"Running: {' '.join(command)}")
        log_agent_action("run_command", description)
        
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=True
            )
            logger.info(f"Command succeeded: {result.stdout.strip()}")
            return result
        except subprocess.CalledProcessError as e:
            logger.error(f"Command failed with exit code {e.returncode}: {e.stderr.strip()}")
            log_agent_action("command_error", f"Command failed: {e.stderr}")
            raise
    
    def run_tests(self, test_type: str = "all") -> Dict[str, Any]:
        """Execute the testing phase"""
        log_agent_action("testing_start", f"Starting {test_type} tests")
        test_results = {
            "start_time": datetime.now().isoformat(),
            "success": False,
            "coverage": 0,
            "tests_run": 0,
            "tests_passed": 0,
            "duration_seconds": 0
        }
        
        try:
            # Run appropriate tests based on test_type
            if test_type == "unit" or test_type == "all":
                logger.info("Running unit tests")
                result = self.run_command(
                    ["npm", "test", "--", "--testPathPattern=unit"],
                    "Running unit tests"
                )
                test_results["unit_tests"] = self._parse_test_results(result.stdout)
            
            if test_type == "integration" or test_type == "all":
                logger.info("Running integration tests")
                result = self.run_command(
                    ["npm", "test", "--", "--testPathPattern=integration"],
                    "Running integration tests"
                )
                test_results["integration_tests"] = self._parse_test_results(result.stdout)
            
            if test_type == "e2e" or test_type == "all":
                logger.info("Running end-to-end tests")
                result = self.run_command(
                    ["npm", "test", "--", "--testPathPattern=e2e"],
                    "Running end-to-end tests"
                )
                test_results["e2e_tests"] = self._parse_test_results(result.stdout)
            
            # Generate test coverage report
            logger.info("Generating test coverage report")
            coverage_result = self.run_command(
                ["npm", "test", "--", "--coverage"],
                "Generating test coverage report"
            )
            test_results["coverage"] = self._parse_coverage_report(coverage_result.stdout)
            
            # Aggregate results
            test_results["success"] = True
            test_results["end_time"] = datetime.now().isoformat()
            test_results["duration_seconds"] = time.time() - self.start_time
            
            log_agent_action("testing_complete", f"Testing completed successfully: {test_results['tests_passed']}/{test_results['tests_run']} tests passed")
            
        except Exception as e:
            logger.error(f"Testing phase failed: {str(e)}")
            log_agent_action("testing_error", f"Testing failed: {str(e)}")
            test_results["error"] = str(e)
            test_results["end_time"] = datetime.now().isoformat()
            test_results["duration_seconds"] = time.time() - self.start_time
        
        self.results["testing"] = test_results
        return test_results
    
    def _parse_test_results(self, output: str) -> Dict[str, Any]:
        """Parse test output to extract metrics"""
        # Simplified parsing logic - actual implementation would be more robust
        results = {
            "tests_run": 0,
            "tests_passed": 0,
            "tests_failed": 0
        }
        
        # Example parsing logic
        if "PASS" in output:
            results["success"] = True
        else:
            results["success"] = False
        
        for line in output.splitlines():
            if "Tests:" in line:
                parts = line.split("Tests:")[1].strip().split(" ")
                for part in parts:
                    if "passed" in part:
                        results["tests_passed"] = int(part.split(" ")[0])
                    if "failed" in part:
                        results["tests_failed"] = int(part.split(" ")[0])
        
        results["tests_run"] = results["tests_passed"] + results["tests_failed"]
        return results
    
    def _parse_coverage_report(self, output: str) -> Dict[str, Any]:
        """Parse test coverage output"""
        coverage = {
            "overall": 0,
            "statements": 0,
            "branches": 0,
            "functions": 0,
            "lines": 0
        }
        
        # Example parsing logic
        for line in output.splitlines():
            if "All files" in line:
                parts = line.split("|")
                if len(parts) >= 5:
                    coverage["statements"] = float(parts[1].strip().replace("%", ""))
                    coverage["branches"] = float(parts[2].strip().replace("%", ""))
                    coverage["functions"] = float(parts[3].strip().replace("%", ""))
                    coverage["lines"] = float(parts[4].strip().replace("%", ""))
                    coverage["overall"] = (coverage["statements"] + coverage["branches"] + 
                                          coverage["functions"] + coverage["lines"]) / 4
        
        return coverage
    
    def run_training(self) -> Dict[str, Any]:
        """Execute the model training phase"""
        log_agent_action("training_start", "Starting model training phase")
        training_results = {
            "start_time": datetime.now().isoformat(),
            "success": False,
            "models_trained": 0,
            "duration_seconds": 0
        }
        
        try:
            # Check if models directory exists
            models_dir = self.root_dir / "src" / "models"
            if not models_dir.exists():
                logger.info("No models directory found, skipping training phase")
                training_results["success"] = True
                training_results["skipped"] = True
                return training_results
            
            # Identify models to train
            models = list(models_dir.glob("**/*.py"))
            training_results["models_found"] = len(models)
            
            # Run training for each model
            for model_file in models:
                model_name = model_file.stem
                logger.info(f"Training model: {model_name}")
                
                # Execute model training (example)
                result = self.run_command(
                    ["python", "-m", f"src.models.{model_name}.train"],
                    f"Training model {model_name}"
                )
                
                # Record model training results
                training_results[model_name] = {
                    "success": result.returncode == 0,
                    "output": result.stdout,
                    "metrics": self._parse_training_metrics(result.stdout)
                }
                
                training_results["models_trained"] += 1
            
            # Evaluate models
            logger.info("Evaluating trained models")
            eval_result = self.run_command(
                ["python", "-m", "src.models.evaluate"],
                "Evaluating all trained models"
            )
            training_results["evaluation"] = self._parse_evaluation_metrics(eval_result.stdout)
            
            # Aggregate results
            training_results["success"] = True
            training_results["end_time"] = datetime.now().isoformat()
            training_results["duration_seconds"] = time.time() - self.start_time
            
            log_agent_action("training_complete", f"Training completed successfully: {training_results['models_trained']} models trained")
            
        except Exception as e:
            logger.error(f"Training phase failed: {str(e)}")
            log_agent_action("training_error", f"Training failed: {str(e)}")
            training_results["error"] = str(e)
            training_results["end_time"] = datetime.now().isoformat()
            training_results["duration_seconds"] = time.time() - self.start_time
        
        self.results["training"] = training_results
        return training_results
    
    def _parse_training_metrics(self, output: str) -> Dict[str, float]:
        """Parse training output to extract metrics"""
        # Simplified parsing logic - actual implementation would be more robust
        metrics = {
            "accuracy": 0.0,
            "loss": 0.0,
            "precision": 0.0,
            "recall": 0.0,
            "f1_score": 0.0
        }
        
        # Example parsing logic
        for line in output.splitlines():
            for metric in metrics.keys():
                if metric in line.lower():
                    try:
                        # Extract numeric value following the metric name
                        value = float(line.split(":")[1].strip())
                        metrics[metric] = value
                    except (IndexError, ValueError):
                        pass
        
        return metrics
    
    def _parse_evaluation_metrics(self, output: str) -> Dict[str, Any]:
        """Parse model evaluation output"""
        # Simplified parsing logic
        return self._parse_training_metrics(output)
    
    def run_tuning(self) -> Dict[str, Any]:
        """Execute system performance tuning phase"""
        log_agent_action("tuning_start", "Starting system performance tuning")
        tuning_results = {
            "start_time": datetime.now().isoformat(),
            "success": False,
            "optimizations_applied": 0,
            "duration_seconds": 0
        }
        
        try:
            # Analyze system performance
            logger.info("Analyzing system performance")
            analysis_result = self.run_command(
                ["python", "-m", "automation.performance_analysis"],
                "Analyzing system performance metrics"
            )
            tuning_results["analysis"] = self._parse_performance_analysis(analysis_result.stdout)
            
            # Apply recommended optimizations
            optimizations = tuning_results["analysis"].get("recommended_optimizations", [])
            for opt in optimizations:
                logger.info(f"Applying optimization: {opt}")
                result = self.run_command(
                    ["python", "-m", f"automation.optimizations.{opt}"],
                    f"Applying optimization: {opt}"
                )
                tuning_results[f"optimization_{opt}"] = {
                    "success": result.returncode == 0,
                    "output": result.stdout
                }
                tuning_results["optimizations_applied"] += 1
            
            # Update system configuration
            if tuning_results["optimizations_applied"] > 0:
                logger.info("Updating system configuration")
                config_result = self.run_command(
                    ["python", "-m", "automation.update_config"],
                    "Updating system configuration with optimizations"
                )
                tuning_results["config_update"] = {
                    "success": config_result.returncode == 0,
                    "output": config_result.stdout
                }
            
            # Aggregate results
            tuning_results["success"] = True
            tuning_results["end_time"] = datetime.now().isoformat()
            tuning_results["duration_seconds"] = time.time() - self.start_time
            
            log_agent_action("tuning_complete", f"Tuning completed successfully: {tuning_results['optimizations_applied']} optimizations applied")
            
        except Exception as e:
            logger.error(f"Tuning phase failed: {str(e)}")
            log_agent_action("tuning_error", f"Tuning failed: {str(e)}")
            tuning_results["error"] = str(e)
            tuning_results["end_time"] = datetime.now().isoformat()
            tuning_results["duration_seconds"] = time.time() - self.start_time
        
        self.results["tuning"] = tuning_results
        return tuning_results
    
    def _parse_performance_analysis(self, output: str) -> Dict[str, Any]:
        """Parse performance analysis output"""
        # Simplified parsing logic - actual implementation would be more complex
        analysis = {
            "metrics": {},
            "bottlenecks": [],
            "recommended_optimizations": []
        }
        
        try:
            # Try to parse JSON output from the performance analysis tool
            data = json.loads(output)
            return data
        except json.JSONDecodeError:
            # Fallback to simple text parsing if not JSON
            # Example parsing logic
            current_section = None
            for line in output.splitlines():
                if line.startswith("METRICS:"):
                    current_section = "metrics"
                    continue
                elif line.startswith("BOTTLENECKS:"):
                    current_section = "bottlenecks"
                    continue
                elif line.startswith("RECOMMENDATIONS:"):
                    current_section = "recommended_optimizations"
                    continue
                
                if current_section == "metrics" and ":" in line:
                    key, value = line.split(":", 1)
                    try:
                        analysis["metrics"][key.strip()] = float(value.strip())
                    except ValueError:
                        analysis["metrics"][key.strip()] = value.strip()
                elif current_section == "bottlenecks" and line.strip():
                    analysis["bottlenecks"].append(line.strip())
                elif current_section == "recommended_optimizations" and line.strip():
                    analysis["recommended_optimizations"].append(line.strip())
        
        return analysis
    
    def generate_documentation(self) -> Dict[str, Any]:
        """Generate updated documentation"""
        log_agent_action("documentation_start", "Starting documentation generation")
        doc_results = {
            "start_time": datetime.now().isoformat(),
            "success": False,
            "files_generated": 0,
            "duration_seconds": 0
        }
        
        try:
            # Generate API documentation
            logger.info("Generating API documentation")
            api_result = self.run_command(
                ["npm", "run", "docs:api"],
                "Generating API documentation"
            )
            doc_results["api_docs"] = {
                "success": api_result.returncode == 0,
                "output": api_result.stdout
            }
            
            # Generate performance report
            logger.info("Generating performance report")
            perf_result = self.run_command(
                ["python", "-m", "automation.generate_perf_report"],
                "Generating performance report"
            )
            doc_results["perf_report"] = {
                "success": perf_result.returncode == 0,
                "output": perf_result.stdout
            }
            
            # Update README with latest pipeline metrics
            logger.info("Updating README with pipeline metrics")
            readme_result = self.run_command(
                ["python", "-m", "automation.update_readme", "--with-metrics"],
                "Updating README with pipeline metrics"
            )
            doc_results["readme_update"] = {
                "success": readme_result.returncode == 0,
                "output": readme_result.stdout
            }
            
            # Generate deployment documentation
            logger.info("Generating deployment documentation")
            deploy_result = self.run_command(
                ["python", "-m", "automation.generate_deploy_docs"],
                "Generating deployment documentation"
            )
            doc_results["deploy_docs"] = {
                "success": deploy_result.returncode == 0,
                "output": deploy_result.stdout
            }
            
            # Count generated files
            doc_dir = self.root_dir / "docs"
            doc_results["files_generated"] = len(list(doc_dir.glob("**/*")))
            
            # Aggregate results
            doc_results["success"] = True
            doc_results["end_time"] = datetime.now().isoformat()
            doc_results["duration_seconds"] = time.time() - self.start_time
            
            log_agent_action("documentation_complete", f"Documentation generation completed: {doc_results['files_generated']} files generated")
            
        except Exception as e:
            logger.error(f"Documentation generation failed: {str(e)}")
            log_agent_action("documentation_error", f"Documentation failed: {str(e)}")
            doc_results["error"] = str(e)
            doc_results["end_time"] = datetime.now().isoformat()
            doc_results["duration_seconds"] = time.time() - self.start_time
        
        self.results["documentation"] = doc_results
        return doc_results
    
    def run_full_pipeline(self) -> Dict[str, Any]:
        """Run the complete CTTT pipeline"""
        log_agent_action("pipeline_start", "Starting full CTTT pipeline")
        
        try:
            # Run all pipeline phases
            self.run_tests()
            
            # Only proceed with training if tests passed
            if self.results["testing"].get("success", False):
                self.run_training()
                
                # Only proceed with tuning if training was successful or skipped
                if self.results["training"].get("success", False):
                    self.run_tuning()
            
            # Always generate documentation
            self.generate_documentation()
            
            # Save results
            self._save_results()
            
            # Notify completion
            self._notify_completion()
            
            log_agent_action("pipeline_complete", "Full CTTT pipeline completed successfully")
            
        except Exception as e:
            logger.error(f"Pipeline execution failed: {str(e)}")
            log_agent_action("pipeline_error", f"Pipeline failed: {str(e)}")
            
            # Save results even if pipeline fails
            self._save_results()
        
        return self.results
    
    def _save_results(self) -> None:
        """Save pipeline results to file"""
        results_dir = self.root_dir / "reports" / "cttt"
        results_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        results_file = results_dir / f"pipeline-results-{timestamp}.json"
        
        with open(results_file, "w") as f:
            json.dump(self.results, f, indent=2)
        
        logger.info(f"Pipeline results saved to {results_file}")
    
    def _notify_completion(self) -> None:
        """Notify relevant systems of pipeline completion"""
        # Add notification logic here (e.g., Slack, email, etc.)
        logger.info("Pipeline completion notification sent")
        
        # Update Firestore with results
        try:
            result = self.run_command(
                [
                    "gcloud", "firestore", "documents", "create",
                    f"projects/{self.project_id}/databases/(default)/documents/cttt/{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    f"--fields=status={'SUCCESS' if all(phase.get('success', False) for phase in self.results.values()) else 'PARTIAL'},timestamp={int(time.time())},agent={self.agent_id}"
                ],
                "Updating Firestore with pipeline results"
            )
            logger.info("Firestore updated with pipeline results")
        except Exception as e:
            logger.error(f"Failed to update Firestore: {str(e)}")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="CTTT Pipeline for Aixtiv Platform")
    parser.add_argument("--project-id", default="api-for-warp-drive", help="GCP Project ID")
    parser.add_argument("--agent-id", default="DR_CLAUDE_AUTOMATION", help="Agent ID for tracking")
    parser.add_argument("--phase", choices=["test", "train", "tune", "docs", "full"], default="full",
                       help="Pipeline phase to run (default: full)")
    parser.add_argument("--test-type", choices=["unit", "integration", "e2e", "all"], default="all",
                       help="Type of tests to run (default: all)")
    
    args = parser.parse_args()
    
    # Initialize pipeline
    pipeline = CTTTPipeline(project_id=args.project_id, agent_id=args.agent_id)
    
    # Run requested phase
    if args.phase == "test":
        results = pipeline.run_tests(test_type=args.test_type)
    elif args.phase == "train":
        results = pipeline.run_training()
    elif args.phase == "tune":
        results = pipeline.run_tuning()
    elif args.phase == "docs":
        results = pipeline.generate_documentation()
    else:  # full pipeline
        results = pipeline.run_full_pipeline()
    
    # Print summary
    success = all(phase.get("success", False) for phase in results.values() if isinstance(phase, dict))
    print(f"\n{'✅' if success else '❌'} CTTT Pipeline {'Completed Successfully' if success else 'Completed with Errors'}")
    
    # Return success code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())