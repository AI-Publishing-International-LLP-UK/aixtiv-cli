from code_runner import CodeRunner
import yaml
import logging

class WorkflowRunner:
    def __init__(self):
        self.runner = CodeRunner()
        self.logger = logging.getLogger('workflow')
        
    def load_workflow(self, path):
        with open(path) as f:
            return yaml.safe_load(f)
            
    def execute_workflow(self, workflow):
        results = {}
        for task in workflow['automation']['tasks']:
            try:
                result = self.runner.execute(
                    task['code'],
                    task['language']
                )
                results[task['name']] = result
            except Exception as e:
                self.logger.error(f"Task {task['name']} failed: {str(e)}")
                
        return results
        
    def run(self, workflow_path):
        workflow = self.load_workflow(workflow_path)
        return self.execute_workflow(workflow)