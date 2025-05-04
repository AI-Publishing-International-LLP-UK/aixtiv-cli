#!/usr/bin/env python3
"""
Google Agent Engine Deployment Script

This script deploys an agent to Google's Agent Engine in Vertex AI.
Run this from within the deployment directory after building the wheel file with:
    poetry build --format=wheel --output=deployment
"""

import os
import sys
import logging
import argparse
from pathlib import Path
import vertexai
from vertexai.preview.reasoning_engines import ReasoningEngine as AdkApp

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('agent-deployer')

# Default values
DEFAULT_PROJECT = "api-for-warp-drive"
DEFAULT_LOCATION = "us-west1"
DEFAULT_AGENT_NAME = "aixtiv-agent"

class Config:
    """Configuration for deployment"""
    def __init__(self, project=None, location=None, agent_name=None):
        self.project = project or os.environ.get("GOOGLE_CLOUD_PROJECT", DEFAULT_PROJECT)
        self.location = location or os.environ.get("GOOGLE_CLOUD_LOCATION", DEFAULT_LOCATION)
        self.agent_name = agent_name or os.environ.get("AGENT_NAME", DEFAULT_AGENT_NAME)
        self.wheel_file = self._find_wheel_file()
        
    def _find_wheel_file(self):
        """Find the wheel file in the current directory"""
        wheel_files = list(Path('.').glob('*.whl'))
        if not wheel_files:
            logger.error("No wheel files found in the current directory")
            sys.exit(1)
        if len(wheel_files) > 1:
            logger.warning(f"Multiple wheel files found, using the first one: {wheel_files[0]}")
        return str(wheel_files[0])
    
    def validate(self):
        """Validate the configuration"""
        if not self.project:
            logger.error("Project ID is required")
            return False
        if not self.location:
            logger.error("Location is required")
            return False
        if not self.agent_name:
            logger.error("Agent name is required")
            return False
        if not os.path.exists(self.wheel_file):
            logger.error(f"Wheel file not found: {self.wheel_file}")
            return False
        return True

def deploy_agent(config):
    """Deploy the agent to Google Agent Engine"""
    try:
        logger.info(f"Initializing Vertex AI with project={config.project}, location={config.location}")
        vertexai.init(
            project=config.project,
            location=config.location
        )
        
        # Get absolute path to wheel file
        wheel_path = os.path.abspath(config.wheel_file)
        logger.info(f"Deploying agent from wheel file: {wheel_path}")
        
        # Create and deploy the agent
        agent = AdkApp.create(
            display_name=config.agent_name,
            agent_path=wheel_path,
            cloud_logging=True
        )
        
        logger.info(f"Agent deployed successfully with resource name: {agent.resource_name}")
        return agent
    except Exception as e:
        logger.error(f"Error deploying agent: {e}")
        raise

def test_deployment(agent, config):
    """Test the deployed agent"""
    try:
        logger.info("Testing agent deployment with a simple query")
        
        # Generate unique session and user IDs
        session_id = f"test-session-{os.urandom(4).hex()}"
        user_id = f"test-user-{os.urandom(4).hex()}"
        
        # Test the agent with a simple query
        logger.info(f"Sending test query to agent (session={session_id}, user={user_id})")
        response_events = []
        
        for event in agent.stream_query(
            user_id=user_id,
            session_id=session_id,
            message="Hello!",
        ):
            response_events.append(event)
            logger.info(f"Received event: {event}")
        
        if response_events:
            logger.info("Test completed successfully - agent is responding")
            return True
        else:
            logger.warning("Test completed but no response events were received")
            return False
    except Exception as e:
        logger.error(f"Error testing agent deployment: {e}")
        return False

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Deploy an agent to Google Agent Engine")
    parser.add_argument("--project", help="Google Cloud project ID")
    parser.add_argument("--location", help="Google Cloud location")
    parser.add_argument("--agent-name", help="Name for the deployed agent")
    parser.add_argument("--skip-test", action="store_true", help="Skip testing the deployment")
    return parser.parse_args()

def main():
    """Main entry point"""
    # Parse command line arguments
    args = parse_arguments()
    
    # Create configuration
    config = Config(
        project=args.project,
        location=args.location,
        agent_name=args.agent_name
    )
    
    # Validate configuration
    if not config.validate():
        logger.error("Invalid configuration")
        sys.exit(1)
    
    try:
        # Deploy the agent
        logger.info(f"Deploying agent {config.agent_name} to project {config.project} in {config.location}")
        agent = deploy_agent(config)
        
        # Test the deployment if not skipped
        if not args.skip_test:
            if test_deployment(agent, config):
                logger.info("Deployment test passed")
            else:
                logger.warning("Deployment test failed")
        
        logger.info(f"Agent deployment completed successfully. Resource name: {agent.resource_name}")
        print(f"\nDeployment Resource Name: {agent.resource_name}")
        print(f"Use this resource name when connecting to your agent.")
        print(f"Example: agent_engine = vertexai.agent_engines.get('{agent.resource_name}')")
        
        return 0
    except Exception as e:
        logger.error(f"Deployment failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
