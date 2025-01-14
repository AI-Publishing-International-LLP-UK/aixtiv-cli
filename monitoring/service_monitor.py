from google.cloud import monitoring_v3
from google.cloud import compute_v1
from datetime import datetime, timedelta
import pandas as pd
import logging
import json
import yaml

class AlertConfig:
    def __init__(self):
        self.CRITICAL_THRESHOLD = 0.90
        self.WARNING_THRESHOLD = 0.95
        self.ALERT_CHANNELS = {
            'slack': 'webhook_url',
            'email': ['pr@coaching2100.com', 'dk@coaching2100.com'],
            'pagerduty': 'service_key'
        }
        self.ALERT_COOLDOWN = 300

class ContentServiceMonitor:
    def __init__(self, project_id, region="us-west1"):
        self.project_id = project_id
        self.region = region
        self.client = monitoring_v3.MetricServiceClient()
        self.compute_client = compute_v1.BackendServicesClient()
        self.project_name = f"projects/{project_id}"
        self.alert_config = AlertConfig()
        self.setup_logging()