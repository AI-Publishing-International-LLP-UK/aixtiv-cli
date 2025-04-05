resource "google_project_iam_binding" "vertex_ai_admin" {
  project = "api-for-warp-drive"
  role    = "roles/aiplatform.admin"
  members = [
    "user:pr@coaching2100.com"
  ]
}

resource "google_project_iam_binding" "service_account_admin" {
  project = "api-for-warp-drive"
  role    = "roles/iam.serviceAccountAdmin"
  members = [
    "user:pr@coaching2100.com"
  ]
}

resource "google_project_iam_binding" "storage_admin" {
  project = "api-for-warp-drive"
  role    = "roles/storage.admin"
  members = [
    "user:pr@coaching2100.com"
  ]
}