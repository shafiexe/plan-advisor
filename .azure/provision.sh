#!/usr/bin/env bash
# ── Plan Advisor — One-time Azure Infrastructure Setup ────────────────────────
#
# Run this ONCE before your first pipeline deployment to create all Azure
# resources.  After it completes, copy the output URLs into azure-pipelines.yml.
#
# Requirements:
#   - Azure CLI (az) installed and logged in: `az login`
#   - Sufficient permissions (Contributor on the subscription or resource group)
#
# Usage:
#   chmod +x .azure/provision.sh
#   ./.azure/provision.sh
#
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuration — edit these before running ──────────────────────────────
SUBSCRIPTION="61bbed1e-a10c-46d8-b680-e276934b91d6"       # az account list -o table
RESOURCE_GROUP="plan-advisor-rg"
LOCATION="eastus"                          # az account list-locations -o table
ACR_NAME="planadvisoracr"                  # globally unique, 5-50 chars, alphanumeric
CONTAINER_APP_ENV="plan-advisor-env"
BACKEND_APP="plan-advisor-backend"
FRONTEND_APP="plan-advisor-frontend"
REDIS_NAME="plan-advisor-redis"
LOG_ANALYTICS_WS="plan-advisor-logs"

# PostgreSQL (optional — leave blank to keep SQLite inside the container)
# If you fill this in, provision.sh creates an Azure PostgreSQL Flexible Server.
PG_SERVER=""           # e.g. "plan-advisor-pg"  — leave empty for SQLite
PG_ADMIN_USER="pgadmin"
PG_ADMIN_PASS=""       # set a strong password if PG_SERVER is non-empty
PG_DB="planadvisor"
# ─────────────────────────────────────────────────────────────────────────────

echo "▶ Setting subscription: $SUBSCRIPTION"
az account set --subscription "$SUBSCRIPTION"

echo "▶ Creating resource group: $RESOURCE_GROUP"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" -o none

# ── Container Registry ────────────────────────────────────────────────────────
echo "▶ Creating Container Registry: $ACR_NAME"
az acr create \
  --name "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --sku Basic \
  --admin-enabled true \
  -o none

ACR_SERVER="${ACR_NAME}.azurecr.io"
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)
echo "   ACR server : $ACR_SERVER"

# ── Log Analytics (required by Container Apps Environment) ───────────────────
echo "▶ Creating Log Analytics workspace"
az monitor log-analytics workspace create \
  --workspace-name "$LOG_ANALYTICS_WS" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  -o none

LOG_WS_ID=$(az monitor log-analytics workspace show \
  --workspace-name "$LOG_ANALYTICS_WS" \
  --resource-group "$RESOURCE_GROUP" \
  --query customerId -o tsv)
LOG_WS_KEY=$(az monitor log-analytics workspace get-shared-keys \
  --workspace-name "$LOG_ANALYTICS_WS" \
  --resource-group "$RESOURCE_GROUP" \
  --query primarySharedKey -o tsv)

# ── Container Apps Environment ────────────────────────────────────────────────
echo "▶ Creating Container Apps Environment: $CONTAINER_APP_ENV"
az containerapp env create \
  --name "$CONTAINER_APP_ENV" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --logs-workspace-id "$LOG_WS_ID" \
  --logs-workspace-key "$LOG_WS_KEY" \
  -o none

# ── Redis Cache ───────────────────────────────────────────────────────────────
echo "▶ Creating Azure Cache for Redis: $REDIS_NAME (this takes ~5 min)"
az redis create \
  --name "$REDIS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Basic \
  --vm-size c0 \
  -o none

REDIS_HOST="${REDIS_NAME}.redis.cache.windows.net"
REDIS_KEY=$(az redis list-keys --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query primaryKey -o tsv)
REDIS_URL="rediss://:${REDIS_KEY}@${REDIS_HOST}:6380"
echo "   Redis URL  : $REDIS_URL"

# ── PostgreSQL (optional) ─────────────────────────────────────────────────────
DATABASE_URL="sqlite+aiosqlite:////app/data/plan_advisor.db"  # default: SQLite
if [[ -n "$PG_SERVER" ]]; then
  echo "▶ Creating PostgreSQL Flexible Server: $PG_SERVER (this takes ~5 min)"
  az postgres flexible-server create \
    --name "$PG_SERVER" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --admin-user "$PG_ADMIN_USER" \
    --admin-password "$PG_ADMIN_PASS" \
    --sku-name Standard_B1ms \
    --tier Burstable \
    --storage-size 32 \
    --version 16 \
    --public-access 0.0.0.0 \
    -o none

  az postgres flexible-server db create \
    --server-name "$PG_SERVER" \
    --resource-group "$RESOURCE_GROUP" \
    --database-name "$PG_DB" \
    -o none

  PG_HOST="${PG_SERVER}.postgres.database.azure.com"
  DATABASE_URL="postgresql+asyncpg://${PG_ADMIN_USER}:${PG_ADMIN_PASS}@${PG_HOST}/${PG_DB}?ssl=require"
  echo "   Database URL: $DATABASE_URL"
fi

# ── Backend Container App (initial deploy with placeholder image) ─────────────
echo "▶ Creating backend Container App: $BACKEND_APP"
az containerapp create \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$CONTAINER_APP_ENV" \
  --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 8000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 5 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars \
    "DATABASE_URL=${DATABASE_URL}" \
    "REDIS_URL=${REDIS_URL}" \
    "ALLOWED_ORIGINS=https://placeholder" \
  -o none

BACKEND_FQDN=$(az containerapp show \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)
echo "   Backend URL: https://$BACKEND_FQDN"

# ── Frontend Container App (initial deploy with placeholder image) ────────────
echo "▶ Creating frontend Container App: $FRONTEND_APP"
az containerapp create \
  --name "$FRONTEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$CONTAINER_APP_ENV" \
  --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars \
    "NEXTAUTH_URL=https://placeholder" \
    "AUTH_TRUST_HOST=true" \
  -o none

FRONTEND_FQDN=$(az containerapp show \
  --name "$FRONTEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)
echo "   Frontend URL: https://$FRONTEND_FQDN"

# ── Update backend ALLOWED_ORIGINS with real frontend URL ─────────────────────
echo "▶ Updating backend ALLOWED_ORIGINS → https://$FRONTEND_FQDN"
az containerapp update \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars "ALLOWED_ORIGINS=https://${FRONTEND_FQDN}" \
  -o none

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  Infrastructure created. Next steps:"
echo ""
echo "  1. Update azure-pipelines.yml variables:"
echo "       ACR_NAME          → $ACR_NAME"
echo "       NEXT_PUBLIC_API_URL → https://$BACKEND_FQDN"
echo "       NEXT_PUBLIC_WS_URL  → wss://$BACKEND_FQDN/ws/chat"
echo ""
echo "  2. Create Azure DevOps Variable Group 'plan-advisor-secrets' with:"
echo "       DATABASE_URL         = $DATABASE_URL"
echo "       REDIS_URL            = $REDIS_URL"
echo "       ANTHROPIC_API_KEY    = <your key>"
echo "       OPENAI_API_KEY       = <your key>"
echo "       CLAUDE_MODEL         = claude-sonnet-5"
echo "       SERPAPI_KEY          = <your key>"
echo "       SCRAPE_DO_TOKEN      = <your token>"
echo "       TRAVELPAYOUTS_TOKEN  = <your token>"
echo "       AUTH_SECRET          = <run: openssl rand -base64 32>"
echo "       AUTH_GOOGLE_ID       = <from Google Cloud Console>"
echo "       AUTH_GOOGLE_SECRET   = <from Google Cloud Console>"
echo "       AUTH_GITHUB_ID       = <from GitHub OAuth App>"
echo "       AUTH_GITHUB_SECRET   = <from GitHub OAuth App>"
echo ""
echo "  3. Create two Azure DevOps Service Connections:"
echo "       - ARM connection 'plan-advisor-azure' → subscription $SUBSCRIPTION"
echo "       - Docker registry 'plan-advisor-acr'  → $ACR_SERVER"
echo ""
echo "  4. Create pipeline: Pipelines → New pipeline → Azure Repos Git"
echo "       → select repo → 'Existing Azure Pipelines YAML file'"
echo "       → /azure-pipelines.yml"
echo ""
echo "  5. Update your OAuth redirect URIs:"
echo "       Google:  https://$FRONTEND_FQDN/api/auth/callback/google"
echo "       GitHub:  https://$FRONTEND_FQDN/api/auth/callback/github"
echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo "FRONTEND_FQDN=$FRONTEND_FQDN"
echo "BACKEND_FQDN=$BACKEND_FQDN"
