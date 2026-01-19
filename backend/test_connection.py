#!/usr/bin/env python
"""Test connection to Alibaba Cloud PostgreSQL"""
import psycopg2

# Connection parameters
host = '39.97.193.79'
port = 5432
user = 'postgres'
password = 'Wax135!!!'
database = 'postgres'

try:
    print(f"Attempting to connect to {host}:{port}...")
    print(f"Database: {database}, User: {user}")

    conn = psycopg2.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        connect_timeout=10
    )

    print("[OK] Connection successful!")

    # Test query
    cur = conn.cursor()
    cur.execute('SELECT version()')
    version = cur.fetchone()[0]
    print(f"[OK] PostgreSQL version: {version[:50]}...")

    # Check for tiku schema
    cur.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'tiku'")
    result = cur.fetchone()
    if result:
        print("[OK] Schema 'tiku' exists")
    else:
        print("[INFO] Schema 'tiku' does not exist (will create)")

    # List databases
    cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false")
    databases = cur.fetchall()
    print(f"[OK] Available databases: {[db[0] for db in databases]}")

    cur.close()
    conn.close()
    print("\n[OK] All tests passed!")

except psycopg2.OperationalError as e:
    print(f"[ERROR] Connection failed: {e}")
    print("\nPossible reasons:")
    print("1. Password is incorrect")
    print("2. Firewall blocking port 5432")
    print("3. PostgreSQL not configured to accept remote connections")
    print("4. pg_hba.conf not allowing this IP address")
except Exception as e:
    print(f"[ERROR] Unexpected error: {e}")
