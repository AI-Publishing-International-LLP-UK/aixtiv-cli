resource "google_service_account" "lucy_auto" {
  account_id   = "lucy-auto"
  display_name = "Lucy Auto Service Account"
  project      = "api-for-warp-drive"
}

resource "google_project_iam_member" "lucy_auto_ai_platform" {
  project = "api-for-warp-drive"
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:lucy-auto@api-for-warp-drive.iam.gserviceaccount.com"
}

resource "google_service_account_iam_binding" "admin_account_iam" {
  service_account_id = google_service_account.lucy_auto.name
  role               = "roles/iam.serviceAccountUser"
  members = [
    "user:pr@coaching2100.com"
  ]
}