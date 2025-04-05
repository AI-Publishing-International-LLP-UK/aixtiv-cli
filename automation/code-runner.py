import subprocess
import logging
from pathlib import Path

class CodeRunner:
    def __init__(self):
        self.env_setup = True
        self.logging = True
        
    def execute(self, code, language):
        if language == "python":
            return self._run_python(code)
        elif language == "javascript":
            return self._run_js(code)
        elif language == "shell":
            return self._run_shell(code)
            
    def _run_python(self, code):
        try:
            result = exec(code)
            return {"status": "success", "output": result}
        except Exception as e:
            return {"status": "error", "message": str(e)}
            
    def _run_js(self, code):
        try:
            subprocess.run(["node", "-e", code], check=True)
            return {"status": "success"}
        except subprocess.CalledProcessError as e:
            return {"status": "error", "message": str(e)}