/**
 * Agent Tracking Infrastructure
 * Terraform configuration for the agent tracking system
 */

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Variables
variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "api-for-warp-drive"
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "The environment (prod, staging, dev)"
  type        = string
  default     = "prod"
}

# Firestore collection for agent actions
resource "google_firestore_document" "agent_actions_document" {
  collection  = "agentActions"
  document_id = "configuration"
  fields      = <<EOF
  {
    "description": {
      "stringValue": "Configuration for agent action tracking"
    },
    "created_at": {
      "timestampValue": "${timestamp()}"
    },
    "schema_version": {
      "integerValue": "1"
    },
    "retention_days": {
      "integerValue": "90"
    }
  }
  EOF
}

# Cloud Pub/Sub topic for agent events
resource "google_pubsub_topic" "agent_events" {
  name = "agent-tracking-events"
}

# Subscription for real-time monitoring
resource "google_pubsub_subscription" "agent_monitoring" {
  name  = "agent-monitoring-subscription"
  topic = google_pubsub_topic.agent_events.name

  ack_deadline_seconds = 20

  expiration_policy {
    ttl = "86400s" # 24 hours
  }
}

# Cloud Function to process agent events
resource "google_storage_bucket" "function_bucket" {
  name     = "${var.project_id}-agent-tracking-functions"
  location = var.region
}

# Agent tracking log sink to BigQuery
resource "google_logging_project_sink" "agent_logs_sink" {
  name        = "agent-tracking-logs-sink"
  destination = "bigquery.googleapis.com/projects/${var.project_id}/datasets/${google_bigquery_dataset.agent_logs.dataset_id}"
  filter      = "resource.type=\"cloud_function\" AND jsonPayload.performed_by=~\".*Agent.*\""

  unique_writer_identity = true
}

# BigQuery dataset for agent logs
resource "google_bigquery_dataset" "agent_logs" {
  dataset_id    = "agent_tracking_logs"
  friendly_name = "Agent Tracking Logs"
  description   = "Logs of all agent actions"
  location      = var.region

  default_table_expiration_ms = 7776000000 # 90 days

  labels = {
    environment = var.environment
  }
}

# BigQuery table for agent actions
resource "google_bigquery_table" "agent_actions" {
  dataset_id = google_bigquery_dataset.agent_logs.dataset_id
  table_id   = "agent_actions"

  schema = <<EOF
[
  {
    "name": "timestamp",
    "type": "TIMESTAMP",
    "mode": "REQUIRED",
    "description": "When the action occurred"
  },
  {
    "name": "performed_by",
    "type": "STRING",
    "mode": "REQUIRED",
    "description": "The agent ID that performed the action"
  },
  {
    "name": "action",
    "type": "STRING",
    "mode": "REQUIRED",
    "description": "The action that was performed"
  },
  {
    "name": "details",
    "type": "JSON",
    "mode": "NULLABLE",
    "description": "Additional details about the action"
  }
]
EOF

  time_partitioning {
    type  = "DAY"
    field = "timestamp"
  }
}

# Cloud Monitoring dashboard for agent activity
resource "google_monitoring_dashboard" "agent_dashboard" {
  dashboard_json = <<EOF
{
  "displayName": "Agent Activity Dashboard",
  "gridLayout": {
    "widgets": [
      {
        "title": "Actions by Agent",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_function\" AND jsonPayload.performed_by=~\".*Agent.*\"",
                  "aggregation": {
                    "perSeriesAligner": "ALIGN_COUNT",
                    "crossSeriesReducer": "REDUCE_SUM",
                    "groupByFields": [
                      "metadata.user_labels.performed_by"
                    ]
                  }
                }
              }
            }
          ]
        }
      },
      {
        "title": "Top Actions",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_function\" AND jsonPayload.performed_by=~\".*Agent.*\"",
                  "aggregation": {
                    "perSeriesAligner": "ALIGN_COUNT",
                    "crossSeriesReducer": "REDUCE_SUM",
                    "groupByFields": [
                      "metadata.user_labels.action"
                    ]
                  }
                }
              }
            }
          ]
        }
      },
      {
        "title": "Unattributed Actions",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_function\" AND jsonPayload.performed_by=\"UNSPECIFIED_AGENT\"",
                  "aggregation": {
                    "perSeriesAligner": "ALIGN_COUNT"
                  }
                }
              }
            }
          ]
        }
      }
    ]
  }
}
EOF
}

# Alerting policy for unattributed actions
resource "google_monitoring_alert_policy" "unattributed_actions" {
  display_name = "Unattributed Agent Actions"
  combiner     = "OR"
  conditions {
    display_name = "Unattributed actions detected"
    condition_threshold {
      filter     = "resource.type=\"cloud_function\" AND jsonPayload.performed_by=\"UNSPECIFIED_AGENT\""
      duration   = "60s"
      comparison = "COMPARISON_GT"
      threshold_value = 0
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_COUNT"
      }
    }
  }

  notification_channels = []  # Add notification channels as needed

  documentation {
    content   = "Detected actions without proper agent attribution. Check logs and enforce agent tracking policy."
    mime_type = "text/markdown"
  }
}

# Outputs
output "pubsub_topic" {
  value = google_pubsub_topic.agent_events.id
}

output "bigquery_dataset" {
  value = google_bigquery_dataset.agent_logs.id
}

output "monitoring_dashboard" {
  value = "https://console.cloud.google.com/monitoring/dashboards/custom/${replace(google_monitoring_dashboard.agent_dashboard.name, "projects/", "")}"
}