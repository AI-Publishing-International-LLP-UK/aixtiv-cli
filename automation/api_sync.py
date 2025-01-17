from google.cloud import run_v2
from google.cloud import monitoring_v2
from jira import JIRA
import yaml
import os

class WarpDriveAPISynchronizer:
    def __init__(self):
        self.project_id = "api-for-warp-drive"
        self.region = "us-west1"
        self._init_clients()
        
    def _init_clients(self):
        """Initialize API clients"""
        self.jira = JIRA(
            server='https://c2100pcr.atlassian.net',
            token_auth=os.environ.get('JIRA_API_TOKEN')
        )
        self.run_client = run_v2.ServicesClient()
        self.monitoring_client = monitoring_v2.MetricServiceClient()
        
    def load_config(self):
        """Load API configuration"""
        with open('automation/jira-sync.yaml', 'r') as f:
            return yaml.safe_load(f)
            
    def sync_api_status(self, api_name, status, details=None):
        """Sync API deployment status with Jira"""
        config = self.load_config()
        project_key = config['jira']['project_key']
        
        # Find API config
        api_config = None
        for api in config['jira']['apis']:
            if api['name'] == api_name:
                api_config = api
                break
                
        if not api_config:
            raise ValueError(f"API {api_name} not found in configuration")
            
        # Search for existing issue
        jql = f'project = {project_key} AND labels = {api_name} AND type = Deployment ORDER BY created DESC'
        issues = self.jira.search_issues(jql, maxResults=1)
        
        if issues:
            issue = issues[0]
            self._update_issue_status(issue, status, details)
        else:
            self._create_deployment_issue(project_key, api_config, status, details)
            
    def _update_issue_status(self, issue, status, details):
        """Update existing Jira issue"""
        comment = f"Deployment Status: {status}"
        if details:
            comment += f"\nDetails: {details}"
            
        self.jira.add_comment(issue.key, comment)
        
        # Update status based on deployment state
        if status == "deployed":
            self.jira.transition_issue(issue, 'Done')
        elif status == "failed":
            self.jira.transition_issue(issue, 'Failed')
            
    def _create_deployment_issue(self, project_key, api_config, status, details):
        """Create new deployment issue"""
        issue_data = {
            'project': {'key': project_key},
            'summary': f"Deploy {api_config['name']}",
            'description': f"Automated deployment for {api_config['name']}",
            'issuetype': {'name': 'Deployment'},
            'components': [{'name': api_config['component']}],
            'labels': api_config['labels']
        }
        
        issue = self.jira.create_issue(fields=issue_data)
        self._update_issue_status(issue, status, details)
        
    def verify_all_apis(self):
        """Verify status of all APIs"""
        config = self.load_config()
        
        for api in config['jira']['apis']:
            try:
                request = run_v2.GetServiceRequest(
                    name=f"projects/{self.project_id}/locations/{self.region}/services/{api['name']}"
                )
                service = self.run_client.get_service(request=request)
                
                if service.latest_ready_revision:
                    self.sync_api_status(api['name'], "deployed")
                else:
                    self.sync_api_status(api['name'], "failed", "No ready revision found")
                    
            except Exception as e:
                self.sync_api_status(api['name'], "failed", str(e))

def main():
    synchronizer = WarpDriveAPISynchronizer()
    synchronizer.verify_all_apis()

if __name__ == '__main__':
    main()