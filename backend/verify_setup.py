#!/usr/bin/env python
"""Verify Alibaba Cloud PostgreSQL setup"""
import psycopg2
from app.config import get_settings

settings = get_settings()

# Parse connection info from DATABASE_URL
# Format: postgresql://user:password@host:port/database?options=...
import re
url_pattern = r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^\?]+)'
match = re.match(url_pattern, settings.database_url)

if not match:
    print("[ERROR] Cannot parse DATABASE_URL")
    exit(1)

user, password, host, port, database = match.groups()

print(f"Connecting to {host}:{port}/{database}...")
print(f"User: {user}, Schema: tiku\n")

try:
    conn = psycopg2.connect(
        host=host,
        port=int(port),
        user=user,
        password=password,
        database=database,
        connect_timeout=10
    )

    cur = conn.cursor()

    # Check tiku schema
    cur.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'tiku'")
    if cur.fetchone():
        print("[OK] Schema 'tiku' exists")
    else:
        print("[ERROR] Schema 'tiku' not found")
        exit(1)

    # Check tables in tiku schema
    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'tiku'
        ORDER BY table_name
    """)
    tables = [row[0] for row in cur.fetchall()]

    expected_tables = [
        'alembic_version',
        'images',
        'papers',
        'question_contents',
        'question_groups',
        'questions'
    ]

    print("\n[Tables in tiku schema]")
    for table in tables:
        status = "[OK]" if table in expected_tables else "[WARNING]"
        print(f"  {status} {table}")

    missing = set(expected_tables) - set(tables)
    if missing:
        print(f"\n[ERROR] Missing tables: {', '.join(missing)}")
    else:
        print(f"\n[OK] All {len(expected_tables)} expected tables exist")

    # Check alembic version
    cur.execute("SELECT version_num FROM tiku.alembic_version")
    version = cur.fetchone()
    if version:
        print(f"[OK] Current migration version: {version[0]}")
    else:
        print("[WARNING] No migration version recorded")

    # Check table row counts
    print("\n[Table row counts]")
    for table in tables:
        if table == 'alembic_version':
            continue
        cur.execute(f"SELECT COUNT(*) FROM tiku.{table}")
        count = cur.fetchone()[0]
        print(f"  {table}: {count} rows")

    # Display file storage configuration
    print("\n[File Storage Configuration]")
    print(f"  UPLOAD_DIR: {settings.upload_dir}")
    print(f"  IMAGE_DIR: {settings.image_dir}")
    print("\n  [NOTE] These are Linux paths. Ensure they exist on the server.")
    print("  [NOTE] Current Windows environment cannot access these paths.")

    cur.close()
    conn.close()

    print("\n" + "="*60)
    print("[SUCCESS] Database setup verified successfully!")
    print("="*60)

except Exception as e:
    print(f"\n[ERROR] Verification failed: {e}")
    exit(1)
