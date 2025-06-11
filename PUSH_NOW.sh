#!/bin/bash
git push origin main && \
gcloud builds submit --config=infrastructure/cloudbuild-ci-cttt.yaml
