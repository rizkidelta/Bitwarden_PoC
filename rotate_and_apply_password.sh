#!/bin/bash

echo "🚀 Starting full SSH password rotation workflow..."

# Step 1: Run Bitwarden password rotation
if ! ./rotate_user_password.sh; then
  echo "❌ rotate_user_password.sh failed. Aborting."
  exit 1
fi

# Step 2: Run the Ansible playbook to change the password on the target machine
echo -e "\n📡 Running Ansible playbook to update password on target machine...\n"

if ansible-playbook -i hosts.ini rotate_password.yml; then
  echo -e "\n🧹 Cleaning up temporary password files..."
  rm -rf .bw_temp
  echo "✅ Cleanup complete."
else
  echo "⚠️ Ansible playbook failed. Temporary files retained in .bw_temp for inspection."
  exit 1
fi
