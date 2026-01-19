#!/bin/bash
# Setup local PostgreSQL for development

echo "=================================================="
echo "Setting up local PostgreSQL database for development"
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo ""
echo "[1/4] Stopping existing local_postgres container (if any)..."
docker stop local_postgres 2>/dev/null || true
docker rm local_postgres 2>/dev/null || true

echo ""
echo "[2/4] Starting new PostgreSQL container..."
docker run -d \
  --name local_postgres \
  -p 5433:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=paper_db \
  postgres:14

# Wait for PostgreSQL to be ready
echo ""
echo "[3/4] Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec local_postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "[OK] PostgreSQL is ready!"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "[4/4] Creating tiku schema and running migrations..."

# Update .env.local to use local database
cat > .env.local <<EOF
# Local Development Configuration with Local Database
# This configuration uses a local PostgreSQL container on port 5433

# Database Configuration - Local PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/paper_db

# File Storage - Local paths
UPLOAD_DIR=./storage/uploads
IMAGE_DIR=./storage/images

# File Upload Limits
MAX_FILE_SIZE=10485760

# Server Configuration
HOST=0.0.0.0
PORT=8001

# Environment
ENVIRONMENT=development
EOF

echo "[OK] .env.local updated to use local database"

# Run migrations
echo ""
echo "Running database migrations..."
source venv/Scripts/activate 2>/dev/null || source venv/bin/activate
alembic upgrade head

echo ""
echo "=================================================="
echo "[SUCCESS] Local PostgreSQL database is ready!"
echo "=================================================="
echo ""
echo "Database connection info:"
echo "  Host: localhost"
echo "  Port: 5433"
echo "  Database: paper_db"
echo "  Username: postgres"
echo "  Password: postgres"
echo "  Schema: tiku"
echo ""
echo "To connect with psql:"
echo "  docker exec -it local_postgres psql -U postgres -d paper_db"
echo ""
echo "To stop the database:"
echo "  docker stop local_postgres"
echo ""
echo "To start it again:"
echo "  docker start local_postgres"
echo ""
echo "To remove it completely:"
echo "  docker stop local_postgres && docker rm local_postgres"
echo ""
