from code_runner import CodeRunner
import yaml
import logging
from agent_tracking import log_agent_action, agent_action, get_agent_id

class WorkflowRunner:
    def __init__(self, agent_id=None):
        self.runner = CodeRunner()
        self.logger = logging.getLogger('workflow')
        self.agent_id = agent_id
        
    @agent_action("load_workflow")
    def load_workflow(self, path):
        with open(path) as f:
            return yaml.safe_load(f)
            
    def execute_workflow(self, workflow):
        agent_id = get_agent_id()
        log_agent_action("workflow_execution_started", {
            "workflow_name": workflow.get('name', 'unnamed'),
            "task_count": len(workflow['automation']['tasks'])
        })
        
        results = {}
        for task in workflow['automation']['tasks']:
            try:
                log_agent_action("task_execution_started", {
                    "task_name": task['name'],
                    "language": task['language']
                })
                
                result = self.runner.execute(
                    task['code'],
                    task['language']
                )
                results[task['name']] = result
                
                log_agent_action("task_execution_completed", {
                    "task_name": task['name'],
                    "success": True
                })
            except Exception as e:
                error_msg = f"Task {task['name']} failed: {str(e)}"
                self.logger.error(error_msg)
                log_agent_action("task_execution_failed", {
                    "task_name": task['name'],
                    "error": str(e)
                })
                
        log_agent_action("workflow_execution_completed", {
            "workflow_name": workflow.get('name', 'unnamed'),
            "success": True,
            "tasks_completed": len(results)
        })
        
        return results
        
    @agent_action("run_workflow")
    def run(self, workflow_path):
        workflow = self.load_workflow(workflow_path)
        return self.execute_workflow(workflow)