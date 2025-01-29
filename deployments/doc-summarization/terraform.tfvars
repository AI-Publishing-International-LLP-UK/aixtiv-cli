project_id                   = "api-for-warp-drive"
region                      = "us-central1"
deployment_name            = "generative-ai-document-summarization"
delete_contents_on_destroy = true

labels = {
  environment = "production"
  goog-solutions-console-deployment-name = "generative-ai-document-summarization"
  goog-solutions-console-solution-id = "generative-ai-document-summarization"
}

# Service Account Configuration
service_account_roles = [
  "roles/aiplatform.user",
  "roles/bigquery.dataEditor",
  "roles/storage.objectViewer",
  "roles/documentai.apiUser"
]

# Storage Configuration
storage_class     = "STANDARD"
bucket_location   = "us-central1"
force_destroy     = true

# Document AI Configuration
processor_location = "us-central1"
processor_type     = "document-ocr"
processor_display_name = "doc-summarization-processor"

# BigQuery Configuration
dataset_id        = "doc_summarization"
table_id          = "document_metadata"
dataset_location  = "us-central1"

# Vertex AI Configuration
vertex_location   = "us-central1"
machine_type      = "n1-standard-4"
min_replica_count = 1
max_replica_count = 2

# Network Configuration
network_name      = "default"
subnet_name       = "default"