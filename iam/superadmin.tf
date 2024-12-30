resource "google_project_iam_binding" "superadmin" {
  project = "api-for-warp-drive"
  role    = "roles/owner"

  members = [
    "user:pr@coaching2100.com",
  ]
}

resource "google_project_iam_binding" "service_account_admin" {
  project = "api-for-warp-drive"
  role    = "roles/iam.serviceAccountAdmin"
  
  members = [
    "user:pr@coaching2100.com",
  ]
}

resource "google_project_iam_binding" "workload_identity_admin" {
  project = "api-for-warp-drive" 
  role    = "roles/iam.workloadIdentityPoolAdmin"

  members = [
    "user:pr@coaching2100.com",
  ]
}

resource "google_project_iam_binding" "security_admin" {
  project = "api-for-warp-drive"
  role    = "roles/iam.securityAdmin"

  members = [
    "user:pr@coaching2100.com",
  ]
}