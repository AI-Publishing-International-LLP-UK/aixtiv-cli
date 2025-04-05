#!/usr/bin/env python3

import subprocess
import json
import requests
import time

# List of repositories to secure
REPOS = [
    'api-for-warp-drive',
    'cloud-operations',
    'gcp-config-2024',
    'pab-policies',
    'gke-repair'
]

def get_gcloud_token():
    """Get access token from gcloud"""
    result = subprocess.run(
        ['gcloud', 'auth', 'print-access-token'],
        capture_output=True,
        text=True
    )
    return result.stdout.strip()

def secure_repository(repo_name, token):
    """Secure a single repository"""
    print(f'\nSecuring {repo_name}...')
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    # Make repository private
    repo_url = f'https://api.github.com/repos/C2100-PR/{repo_name}'
    private_data = {
        'private': True,
        'has_issues': True,
        'has_projects': True,
        'has_wiki': True
    }
    
    response = requests.patch(repo_url, headers=headers, json=private_data)
    if response.status_code == 200:
        print(f'{repo_name} is now private')
    else:
        print(f'Failed to make {repo_name} private: {response.status_code}')
    
    # Add branch protection
    protection_url = f'{repo_url}/branches/main/protection'
    protection_data = {
        'required_status_checks': None,
        'enforce_admins': True,
        'required_pull_request_reviews': {
            'dismiss_stale_reviews': True,
            'require_code_owner_reviews': True,
            'required_approving_review_count': 2
        },
        'restrictions': None
    }
    
    response = requests.put(
        protection_url,
        headers=headers,
        json=protection_data
    )
    if response.status_code == 200:
        print(f'Branch protection added to {repo_name}')
    else:
        print(f'Failed to add branch protection to {repo_name}: {response.status_code}')

def main():
    print('Starting security implementation...')
    
    # Configure gcloud
    subprocess.run(['gcloud', 'config', 'set', 'project', 'your-project-id'])
    
    # Get token
    token = get_gcloud_token()
    
    # Secure each repository
    for repo in REPOS:
        secure_repository(repo, token)
        print(f'Completed securing {repo}')
        print('-' * 20)
        time.sleep(1)  # Rate limiting
    
    print('\nAll repositories secured')

if __name__ == '__main__':
    main()