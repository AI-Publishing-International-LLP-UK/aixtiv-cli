from google.cloud import aiplatform
from google.cloud import compute_v1
from google.cloud import storage
from google.cloud import notebooks_v1
import yaml
import logging
import os
from pathlib import Path

class InfrastructureDeployer:
    def __init__(self, project_id="api-for-warp-drive"):
        self.project_id = project_id
        self.region = "us-west1"
        self._init_clients()
        self._setup_logging()
        
    def _init_clients(self):
        """Initialize GCP clients"""
        self.vpc_client = compute_v1.VpcsClient()
        self.subnet_client = compute_v1.SubnetworksClient()
        self.notebook_client = notebooks_v1.NotebookServiceClient()
        self.instance_client = compute_v1.InstancesClient()
        
    def _setup_logging(self):
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger('InfrastructureDeployer')
        
    def deploy_infrastructure(self):
        """Deploy complete infrastructure"""
        try:
            # Load configurations
            vpc_config = self._load_config('vpc_config.yaml')
            vertex_config = self._load_config('vertex_config.yaml')
            
            # Deploy in order
            self._deploy_networking(vpc_config)
            self._deploy_vertex_ai(vertex_config)
            self._deploy_notebooks(vertex_config)
            self._setup_monitoring(vertex_config)
            
            self.logger.info("Infrastructure deployment complete")
            return True
            
        except Exception as e:
            self.logger.error(f"Deployment failed: {str(e)}")
            raise
            
    def _load_config(self, config_file):
        """Load configuration file"""
        config_path = Path(__file__).parent / config_file
        with open(config_path) as f:
            return yaml.safe_load(f)
            
    def _deploy_networking(self, config):
        """Deploy VPC and networking"""
        self.logger.info("Deploying networking infrastructure")
        
        # Create VPC
        network = compute_v1.Network()
        network.name = config['network']['name']
        network.auto_create_subnetworks = False
        network.routing_config = compute_v1.NetworkRoutingConfig()
        network.routing_config.routing_mode = config['network']['routing_mode']
        
        operation = self.vpc_client.insert(
            project=self.project_id,
            network_resource=network
        )
        operation.result()
        
        # Create subnets
        for subnet_name, subnet_config in config['subnets'].items():
            self._create_subnet(subnet_name, subnet_config)
            
        # Setup NAT
        self._setup_cloud_nat(config['nat'])
        
        # Create firewall rules
        self._create_firewall_rules(config['firewall']['rules'])
        
    def _deploy_vertex_ai(self, config):
        """Deploy Vertex AI infrastructure"""
        self.logger.info("Deploying Vertex AI infrastructure")
        
        # Initialize Vertex AI
        aiplatform.init(
            project=self.project_id,
            location=self.region
        )
        
        # Deploy endpoints
        for endpoint_name, endpoint_config in config['vertex_ai']['endpoints'].items():
            self._deploy_endpoint(endpoint_name, endpoint_config)
            
    def _deploy_endpoint(self, name, config):
        """Deploy Vertex AI endpoint"""
        self.logger.info(f"Deploying endpoint: {name}")
        
        endpoint = aiplatform.Endpoint.create(
            display_name=config['display_name'],
            project=self.project_id,
            location=self.region
        )
        
        model = aiplatform.Model.upload(
            display_name=config['display_name'],
            artifact_uri=f"gs://{self.project_id}-models/{name}",
            serving_container_image_uri=f"gcr.io/anthology-ai/{name}:latest"
        )
        
        endpoint.deploy(
            model=model,
            machine_type=config['machine_type'],
            min_replica_count=config['min_replica_count'],
            max_replica_count=config['max_replica_count'],
            accelerator_type=config['accelerator_type'],
            accelerator_count=config['accelerator_count']
        )
        
    def _deploy_notebooks(self, config):
        """Deploy Vertex AI notebooks"""
        self.logger.info("Deploying notebook instances")
        
        for notebook_name, notebook_config in config['notebooks'].items():
            self._deploy_notebook(notebook_name, notebook_config)
            
    def _deploy_notebook(self, name, config):
        """Deploy notebook instance"""
        parent = f"projects/{self.project_id}/locations/{self.region}"
        
        instance = notebooks_v1.Instance()
        instance.machine_type = config['machine_type']
        instance.display_name = config['display_name']
        instance.container_image = config['container_image']
        instance.boot_disk_type = config['boot_disk_type']
        instance.boot_disk_size_gb = config['boot_disk_size_gb']
        
        operation = self.notebook_client.create_instance(
            parent=parent,
            instance_id=name,
            instance=instance
        )
        operation.result()
        
    def _setup_monitoring(self, config):
        """Setup monitoring and alerts"""
        self.logger.info("Setting up monitoring")
        
        # Create custom metrics
        for metric in config['monitoring']['metrics']:
            self._create_custom_metric(metric)
            
        # Create alerts
        for alert in config['monitoring']['alerts']:
            self._create_alert_policy(alert)

def main():
    deployer = InfrastructureDeployer()
    deployer.deploy_infrastructure()

if __name__ == "__main__":
    main()
