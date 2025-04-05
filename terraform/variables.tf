variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "api-for-warp-drive"
}

variable "agents" {
  description = "Agent configurations"
  type = map(object({
    name   = string
    region = string
    zone   = string
  }))
  default = {
    lucy_auto = {
      name   = "lucy-auto"
      region = "us-west1"
      zone   = null
    }
    super_claude_1 = {
      name   = "super-claude-1"
      region = "us-west4"
      zone   = "us-west4-c"
    }
  }
}