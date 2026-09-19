#!/usr/bin/env bash
# Provision an Azure Database for PostgreSQL Flexible Server for Plan Advisor.
# Run this ONCE from your local machine (requires `az` CLI logged in).
# After running, copy the DATABASE_URL printed at the end into Azure DevOps
# Library → plan-advisor-secrets → DATABASE_URL.

set -euo pipefail

# ── Configuration — edit these if needed ────────────────────────────────────
RESOURCE_GROUP="plan-advisor-rg"
# eastus is restricted for PostgreSQL in this subscription; eastus2 is in
# the same metro area as the Container App (eastus) with no extra latency.
LOCATION="eastus2"
SERVER_NAME="plan-advisor-pg"          # must be globally unique on Azure
DB_NAME="planadvisor"
ADMIN_USER="planadmin"
# Generate a strong password or set your own:
ADMIN_PASSWORD="${POSTGRES_ADMIN_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=')}"
SKU="Standard_B1ms"                    # cheapest Burstable tier (~$15/mo)
STORAGE_GB="32"
PG_VERSION="16"
BACKEND_APP_NAME="plan-advisor-backend"
# ────────────────────────────────────────────────────────────────────────────

echo "==> Creating PostgreSQL Flexible Server: $SERVER_NAME"
az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$SERVER_NAME" \
  --location "$LOCATION" \
  --admin-user "$ADMIN_USER" \
  --admin-password "$ADMIN_PASSWORD" \
  --sku-name "$SKU" \
  --tier "Burstable" \
  --storage-size "$STORAGE_GB" \
  --version "$PG_VERSION" \
  --public-access "None" \
  --yes

echo "==> Creating database: $DB_NAME"
az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$SERVER_NAME" \
  --name "$DB_NAME"

echo "==> Allowing access from Azure Container Apps (Azure services)"
az postgres flexible-server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$SERVER_NAME" \
  --rule-name "AllowAllAzureServices" \
  --start-ip-address "0.0.0.0" \
  --end-ip-address "0.0.0.0"

FQDN="${SERVER_NAME}.postgres.database.azure.com"
DATABASE_URL="postgresql+asyncpg://${ADMIN_USER}:${ADMIN_PASSWORD}@${FQDN}:5432/${DB_NAME}?ssl=require"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PostgreSQL provisioned successfully."
echo ""
echo "DATABASE_URL (add this to Azure DevOps Library → plan-advisor-secrets):"
echo "$DATABASE_URL"
echo ""
echo "ADMIN_PASSWORD: $ADMIN_PASSWORD"
echo "(Save this password — it won't be shown again)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Add DATABASE_URL to Azure DevOps Library → plan-advisor-secrets"
echo "  2. Trigger the backend pipeline — init_db() will create tables on first startup"
echo "  3. (Optional) Migrate data from SQLite: see backend/scripts/migrate_sqlite_to_pg.py"
