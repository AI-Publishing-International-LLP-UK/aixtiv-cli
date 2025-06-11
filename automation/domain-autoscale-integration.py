#!/usr/bin/env python3
"""
Coaching2100 GoDaddy Domain Autoscale Integration
Integrated with CI/CD CTTT Pipeline

This script automatically manages domains for the Coaching2100 organization:
1. Fetches domains from GoDaddy specifically for Coaching2100
2. Categorizes them into domain families (character, brand, aixtiv, etc.)
3. Assigns them to appropriate Firebase projects
4. Handles verification and connection
5. Updates status in tracking systems

Organization: Coaching2100
Author: Coaching2100 Automation Team
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
        logging.FileHandler(f"domain-autoscale-{datetime.now().strftime('%Y%m%d-%H%M%S')}.log")
    ]
)
logger = logging.getLogger("DOMAIN-AUTOSCALE")

# Agent tracking integration
sys.path.append(str(Path(__file__).parent.parent))
try:
    from lib.agent_tracking import log_agent_action
except ImportError:
    # Fallback if agent tracking is not available
    def log_agent_action(action_type: str, description: str) -> None:
        logger.info(f"AGENT_ACTION [{action_type}]: {description}")

class DomainAutoscaleManager:
    """
    Domain Autoscale Manager for Coaching2100 Organization GoDaddy Domain Integration
    """
    
    def __init__(self, project_id: str = "api-for-warp-drive", agent_id: str = "COACHING2100_AUTOMATION"):
        """Initialize the Domain Autoscale Manager for Coaching2100"""
        self.project_id = project_id
        self.agent_id = agent_id
        self.start_time = time.time()
        self.root_dir = Path(__file__).parent.parent

        # Load configuration
        self.config_path = self.root_dir / "config" / "domain" / "coaching2100-domain-config.json"
        self.config = {}
        if self.config_path.exists():
            with open(self.config_path, "r") as f:
                self.config = json.load(f)

        self.results = {
            "organization": "Coaching2100",
            "domains_fetched": 0,
            "domains_categorized": 0,
            "domains_assigned": 0,
            "domains_verified": 0,
            "families_identified": 0,
            "success": False,
            "errors": []
        }

        # Firebase project mapping for domain families - from config or default
        self.project_mapping = {}
        if "domainFamilies" in self.config:
            for family, family_info in self.config["domainFamilies"].items():
                self.project_mapping[family] = family_info.get("project", "api-for-warp-drive")
        else:
            # Default mapping if config not found
            self.project_mapping = {
                'character': 'api-for-warp-drive',
                'command': 'api-for-warp-drive',
                'wing': 'api-for-warp-drive',
                'squadron': 'api-for-warp-drive',
                'brand': 'coaching2100-com',
                'aixtiv': 'aixtiv-symphony',
                'learning': 'academy2100-com',
                'flight': 'flight-school',
                'commerce': 'giftshop2100-com',
                'governance': 'api-for-warp-drive'
            }
        
        # Set environment variables
        os.environ["AGENT_ID"] = self.agent_id
        os.environ["PROJECT_ID"] = self.project_id
        os.environ["ORGANIZATION"] = "Coaching2100"

        # Log initialization
        log_agent_action("domain_autoscale_init", f"Initializing Domain Autoscale Manager for Coaching2100 organization (project: {self.project_id})")
        logger.info(f"Coaching2100 Domain Autoscale Manager initialized for project {self.project_id}")
    
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
            self.results["errors"].append(f"Command failed: {e.stderr}")
            raise
    
    def fetch_domains(self) -> Dict[str, Any]:
        """Fetch domains from GoDaddy account for Coaching2100 organization"""
        log_agent_action("fetch_domains_start", "Starting domain fetch from GoDaddy for Coaching2100")
        fetch_results = {
            "start_time": datetime.now().isoformat(),
            "success": False,
            "domains_count": 0,
            "duration_seconds": 0
        }

        try:
            # Run the domain:godaddy:list command to fetch domains
            result = self.run_command(
                ["node", "bin/aixtiv.js", "domain:godaddy:list", "--refresh", "--organization", "Coaching2100", "--json"],
                "Fetching domains from GoDaddy API for Coaching2100"
            )

            # Parse the JSON output
            domains_data = json.loads(result.stdout)

            # Filter for Coaching2100 organization domains if not already filtered
            if "domainAccountId" in self.config:
                account_id = self.config["domainAccountId"]
                domains_data = [domain for domain in domains_data if account_id.lower() in domain.lower()]
                logger.info(f"Filtered {len(domains_data)} domains for account {account_id}")

            # Apply additional organization-specific filtering
            if "organizationDisplayName" in self.config:
                org_name = self.config["organizationDisplayName"]
                logger.info(f"Associating domains with organization: {org_name}")

            fetch_results["domains"] = domains_data
            fetch_results["domains_count"] = len(domains_data)
            self.results["domains_fetched"] = len(domains_data)

            # Save to a temporary file for processing
            domains_file = self.root_dir / "temp" / "coaching2100-domains.json"
            domains_file.parent.mkdir(parents=True, exist_ok=True)

            with open(domains_file, "w") as f:
                json.dump(domains_data, f, indent=2)

            fetch_results["domains_file"] = str(domains_file)
            fetch_results["success"] = True

            log_agent_action("fetch_domains_complete", f"Successfully fetched {fetch_results['domains_count']} domains for Coaching2100 from GoDaddy")
            
        except Exception as e:
            logger.error(f"Domain fetch failed: {str(e)}")
            log_agent_action("fetch_domains_error", f"Domain fetch failed: {str(e)}")
            fetch_results["error"] = str(e)
            self.results["errors"].append(f"Domain fetch failed: {str(e)}")
        
        fetch_results["end_time"] = datetime.now().isoformat()
        fetch_results["duration_seconds"] = time.time() - self.start_time
        return fetch_results
    
    def categorize_domains(self) -> Dict[str, Any]:
        """Categorize domains into families"""
        log_agent_action("categorize_domains_start", "Starting domain categorization")
        categorize_results = {
            "start_time": datetime.now().isoformat(),
            "success": False,
            "families_count": 0,
            "duration_seconds": 0
        }
        
        try:
            # Run the domain:godaddy:organize command in dry-run mode to categorize domains
            result = self.run_command(
                ["node", "bin/aixtiv.js", "domain:godaddy:organize", "--dry-run", "--output", 
                 str(self.root_dir / "temp" / "domain-organization.json")],
                "Categorizing domains into families"
            )
            
            # Load the organization map
            org_file = self.root_dir / "temp" / "domain-organization.json"
            if org_file.exists():
                with open(org_file, "r") as f:
                    organization = json.load(f)
                
                categorize_results["families"] = organization.get("families", {})
                categorize_results["families_count"] = len(organization.get("families", {}))
                self.results["families_identified"] = len(organization.get("families", {}))
                self.results["domains_categorized"] = sum(len(domains) for domains in organization.get("families", {}).values())
                
                categorize_results["success"] = True
                log_agent_action("categorize_domains_complete", 
                                f"Successfully categorized domains into {categorize_results['families_count']} families")
            else:
                raise FileNotFoundError(f"Domain organization file not found: {org_file}")
            
        except Exception as e:
            logger.error(f"Domain categorization failed: {str(e)}")
            log_agent_action("categorize_domains_error", f"Domain categorization failed: {str(e)}")
            categorize_results["error"] = str(e)
            self.results["errors"].append(f"Domain categorization failed: {str(e)}")
        
        categorize_results["end_time"] = datetime.now().isoformat()
        categorize_results["duration_seconds"] = time.time() - self.start_time
        return categorize_results
    
    def assign_to_projects(self) -> Dict[str, Any]:
        """Assign domains to Firebase projects"""
        log_agent_action("assign_projects_start", "Starting domain assignment to Firebase projects")
        assign_results = {
            "start_time": datetime.now().isoformat(),
            "success": False,
            "assignments_count": 0,
            "duration_seconds": 0
        }
        
        try:
            # Run the domain:godaddy:organize command to actually assign domains
            result = self.run_command(
                ["node", "bin/aixtiv.js", "domain:godaddy:organize"],
                "Assigning domains to Firebase projects"
            )
            
            # Extract assignment information from output
            assignments = {}
            for project in self.project_mapping.values():
                if project not in assignments:
                    assignments[project] = []
            
            # Parse the output to extract assignment information
            # This is simplified; in a real implementation, you would capture this from JSON output
            lines = result.stdout.splitlines()
            current_project = None
            for line in lines:
                if "Firebase Project" in line and ":" in line:
                    current_project = line.split(":", 1)[1].strip()
                elif current_project and line.strip().startswith("-"):
                    domain = line.strip()[2:].strip()  # Remove leading "- "
                    if current_project in assignments:
                        assignments[current_project].append(domain)
            
            assign_results["assignments"] = assignments
            assign_results["assignments_count"] = sum(len(domains) for domains in assignments.values())
            self.results["domains_assigned"] = assign_results["assignments_count"]
            
            assign_results["success"] = True
            log_agent_action("assign_projects_complete", 
                            f"Successfully assigned {assign_results['assignments_count']} domains to projects")
            
        except Exception as e:
            logger.error(f"Domain assignment failed: {str(e)}")
            log_agent_action("assign_projects_error", f"Domain assignment failed: {str(e)}")
            assign_results["error"] = str(e)
            self.results["errors"].append(f"Domain assignment failed: {str(e)}")
        
        assign_results["end_time"] = datetime.now().isoformat()
        assign_results["duration_seconds"] = time.time() - self.start_time
        return assign_results
    
    def verify_domains(self) -> Dict[str, Any]:
        """Verify domain connections with Firebase"""
        log_agent_action("verify_domains_start", "Starting domain verification with Firebase")
        verify_results = {
            "start_time": datetime.now().isoformat(),
            "success": False,
            "verified_count": 0,
            "duration_seconds": 0
        }
        
        try:
            # Run the autoscale verification script
            result = self.run_command(
                ["node", "scripts/autoscale-verify-firebase-domains.js"],
                "Verifying domains with Firebase"
            )
            
            # Parse the verification results
            verified_domains = []
            failed_domains = []
            
            # This is simplified; in a real implementation, you would capture this from JSON output
            lines = result.stdout.splitlines()
            for line in lines:
                if "[SUCCESS]" in line and " - " in line:
                    domain = line.split(" - ")[0].split("[SUCCESS]")[1].strip()
                    verified_domains.append(domain)
                elif "[FAILED]" in line and " - " in line:
                    domain = line.split(" - ")[0].split("[FAILED]")[1].strip()
                    failed_domains.append(domain)
            
            verify_results["verified_domains"] = verified_domains
            verify_results["failed_domains"] = failed_domains
            verify_results["verified_count"] = len(verified_domains)
            verify_results["failed_count"] = len(failed_domains)
            
            self.results["domains_verified"] = verify_results["verified_count"]
            
            verify_results["success"] = True
            log_agent_action("verify_domains_complete", 
                            f"Verification completed: {verify_results['verified_count']} verified, {verify_results['failed_count']} failed")
            
        except Exception as e:
            logger.error(f"Domain verification failed: {str(e)}")
            log_agent_action("verify_domains_error", f"Domain verification failed: {str(e)}")
            verify_results["error"] = str(e)
            self.results["errors"].append(f"Domain verification failed: {str(e)}")
        
        verify_results["end_time"] = datetime.now().isoformat()
        verify_results["duration_seconds"] = time.time() - self.start_time
        return verify_results
    
    def run_full_pipeline(self) -> Dict[str, Any]:
        """Run the complete domain autoscale pipeline"""
        log_agent_action("autoscale_pipeline_start", "Starting full domain autoscale pipeline")
        
        try:
            # Run all pipeline phases
            fetch_results = self.fetch_domains()
            
            # Only proceed if fetch was successful
            if fetch_results.get("success", False):
                categorize_results = self.categorize_domains()
                
                # Only proceed if categorization was successful
                if categorize_results.get("success", False):
                    assign_results = self.assign_to_projects()
                    
                    # Only proceed if assignment was successful
                    if assign_results.get("success", False):
                        verify_results = self.verify_domains()
            
            # Save combined results
            self._save_results()
            
            # Set overall success
            self.results["success"] = len(self.results["errors"]) == 0
            
            # Notify completion
            self._notify_completion()
            
            log_agent_action("autoscale_pipeline_complete", 
                            f"Domain autoscale pipeline completed successfully: {self.results['domains_verified']} domains verified")
            
        except Exception as e:
            logger.error(f"Pipeline execution failed: {str(e)}")
            log_agent_action("autoscale_pipeline_error", f"Pipeline failed: {str(e)}")
            self.results["errors"].append(f"Pipeline execution failed: {str(e)}")
            self.results["success"] = False
            
            # Save results even if pipeline fails
            self._save_results()
        
        return self.results
    
    def _save_results(self) -> None:
        """Save pipeline results to file"""
        results_dir = self.root_dir / "reports" / "domain-autoscale"
        results_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        results_file = results_dir / f"autoscale-results-{timestamp}.json"
        
        with open(results_file, "w") as f:
            json.dump(self.results, f, indent=2)
        
        logger.info(f"Domain autoscale results saved to {results_file}")
    
    def _notify_completion(self) -> None:
        """Notify relevant systems of pipeline completion"""
        logger.info("Domain autoscale completion notification sent")
        
        # Update Firestore with results
        try:
            result = self.run_command(
                [
                    "gcloud", "firestore", "documents", "create",
                    f"projects/{self.project_id}/databases/(default)/documents/domain-autoscale/{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    f"--fields=status={'SUCCESS' if self.results['success'] else 'FAILURE'},timestamp={int(time.time())},agent={self.agent_id},verified={self.results['domains_verified']}"
                ],
                "Updating Firestore with domain autoscale results"
            )
            logger.info("Firestore updated with domain autoscale results")
        except Exception as e:
            logger.error(f"Failed to update Firestore: {str(e)}")
            self.results["errors"].append(f"Failed to update Firestore: {str(e)}")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="GoDaddy Domain Autoscale Integration for Aixtiv Symphony")
    parser.add_argument("--project-id", default="api-for-warp-drive", help="GCP Project ID")
    parser.add_argument("--agent-id", default="DR_CLAUDE_AUTOMATION", help="Agent ID for tracking")
    parser.add_argument("--phase", choices=["fetch", "categorize", "assign", "verify", "full"], default="full",
                       help="Pipeline phase to run (default: full)")
    
    args = parser.parse_args()
    
    # Initialize domain autoscale manager
    manager = DomainAutoscaleManager(project_id=args.project_id, agent_id=args.agent_id)
    
    # Run requested phase
    if args.phase == "fetch":
        results = manager.fetch_domains()
    elif args.phase == "categorize":
        results = manager.categorize_domains()
    elif args.phase == "assign":
        results = manager.assign_to_projects()
    elif args.phase == "verify":
        results = manager.verify_domains()
    else:  # full pipeline
        results = manager.run_full_pipeline()
    
    # Print summary
    success = results.get("success", False)
    domains_verified = manager.results.get("domains_verified", 0)
    print(f"\n{'✅' if success else '❌'} Domain Autoscale Pipeline {'Completed Successfully' if success else 'Completed with Errors'}")
    print(f"Domains verified: {domains_verified}")
    
    # Return success code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())