#!/bin/bash
# Script to deploy collections to Digital Ocean Spaces (or other CDN)

# Install AWS CLI (works with DO Spaces)
if ! command -v aws &> /dev/null; then
  echo "Installing AWS CLI..."
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
  unzip awscliv2.zip
  sudo ./aws/install
fi

# Configure AWS CLI for Digital Ocean Spaces
aws configure set aws_access_key_id $DO_SPACES_KEY
aws configure set aws_secret_access_key $DO_SPACES_SECRET
aws configure set default.region us-east-1

# Sync collection data to Digital Ocean Spaces
echo "Deploying collections to CDN..."
aws s3 sync SvelteKit/BackSpace/static/data s3://$DO_SPACES_BUCKET/data --endpoint=$DO_SPACES_ENDPOINT

echo "Collections deployed successfully!" 