#!/bin/bash

echo "🔐 Step 1: Bitwarden Password Rotator for Current SSH User"

# Prompt for Bitwarden credentials
read -p "📧 Enter your Bitwarden email: " BW_EMAIL
read -s -p "🔑 Enter your Bitwarden master password: " BW_MASTER
echo

# Always logout to avoid conflicts
bw logout --quiet

# Login and unlock in one step using --raw (no second password needed)
echo "🔓 Logging in and unlocking..."
export BW_SESSION=$(bw login "$BW_EMAIL" "$BW_MASTER" --raw 2>/dev/null)
unset BW_MASTER

if [ -z "$BW_SESSION" ]; then
  echo "❌ Login failed. Check email or password."
  exit 1
fi

# Prompt for SSH username (must already exist on target machine)
read -p "👤 Enter the existing SSH username to rotate password for: " SSH_USERNAME

# Generate strong password
SSH_PASSWORD=$(bw generate --length 20 --special --uppercase --number --session "$BW_SESSION")

echo "💾 Saving to Bitwarden..."

# Try to find existing item by name
ITEM_NAME="$SSH_USERNAME"
EXISTING_ITEM_ID=$(bw list items --search "$ITEM_NAME" --session "$BW_SESSION" | jq -r '.[0].id // empty')

if [ -n "$EXISTING_ITEM_ID" ]; then
  echo "🔄 Updating existing Bitwarden item..."
  bw get item "$EXISTING_ITEM_ID" --session "$BW_SESSION" \
    | jq --arg user "$SSH_USERNAME" --arg pass "$SSH_PASSWORD" \
        '.login.username = $user | .login.password = $pass' \
    | bw encode \
    | bw edit item "$EXISTING_ITEM_ID" --session "$BW_SESSION" >/dev/null || {
        echo "❌ Failed to update Bitwarden item."
        exit 1
      }
else
  echo "➕ Creating new Bitwarden item..."
  bw get template item \
    | jq --arg user "$SSH_USERNAME" --arg pass "$SSH_PASSWORD" \
        '.type = 1 | .name = $user | .login.username = $user | .login.password = $pass' \
    | bw encode \
    | bw create item --session "$BW_SESSION" >/dev/null || {
        echo "❌ Failed to create Bitwarden item."
        exit 1
      }
fi


# Save for Ansible
mkdir -p .bw_temp
echo "$SSH_USERNAME" > .bw_temp/username.txt
echo "$SSH_PASSWORD" > .bw_temp/password.txt
chmod 600 .bw_temp/password.txt

echo -e "\n✅ Bitwarden entry created and credentials saved locally:"
echo "📁 Username: .bw_temp/username.txt"
echo "🔒 Password: .bw_temp/password.txt"

# Lock Bitwarden session for safety
bw lock --session "$BW_SESSION" >/dev/null 2>&1
unset BW_SESSION

echo "🔒 Bitwarden vault has been locked."
echo "➡️ You can now run your Ansible playbook to rotate the password."
