#!/usr/bin/env python3

import sys
import yaml

def validate_yaml(file_path):
    try:
        with open(file_path, 'r') as f:
            yaml_content = f.read()
        
        # Try to parse the YAML
        yaml.safe_load(yaml_content)
        print("YAML is valid!")
        return True
    except yaml.YAMLError as e:
        print(f"YAML validation error: {e}")
        return False
    except Exception as e:
        print(f"Error reading or parsing file: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python validate_yaml.py <yaml_file>")
        sys.exit(1)
    
    valid = validate_yaml(sys.argv[1])
    sys.exit(0 if valid else 1)
