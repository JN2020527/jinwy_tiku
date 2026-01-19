#!/usr/bin/env python
"""Check which database is currently being used"""
import re
from app.config import get_settings

settings = get_settings()

print("="*60)
print("Current Database Configuration Check")
print("="*60)

# Parse database URL
url = settings.database_url
match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^\?]+)', url)

if match:
    user, password, host, port, database = match.groups()

    print(f"\n[Database Connection]")
    print(f"  Host: {host}")
    print(f"  Port: {port}")
    print(f"  Database: {database}")
    print(f"  User: {user}")

    # Determine if local or remote
    is_local = host in ['localhost', '127.0.0.1', 'local_postgres']

    print(f"\n[Data Storage Location]")
    if is_local:
        print(f"  [OK] Using LOCAL database")
        print(f"  [OK] Test data will NOT affect production")
        print(f"  [OK] Safe to test and delete data")
    else:
        print(f"  [WARNING] Using REMOTE database: {host}")
        print(f"  [WARNING] All data will be saved to PRODUCTION database")
        print(f"  [WARNING] Test data will mix with production data")
        print(f"\n[Recommendation]")
        print(f"  For development/testing, switch to local database:")
        print(f"  1. Run: bash setup_local_db.sh")
        print(f"  2. Or manually edit DATABASE_URL in .env.local")

print(f"\n[File Storage]")
print(f"  Upload directory: {settings.upload_dir}")
print(f"  Image directory: {settings.image_dir}")

# Check if paths are local
files_local = not settings.upload_dir.startswith('/home/')
if files_local:
    print(f"  [OK] Files stored on local disk")
else:
    print(f"  [WARNING] File paths point to remote server")

print(f"\n[Summary]")
if is_local and files_local:
    print(f"  [OK] Fully local development - Safe for testing")
elif not is_local and files_local:
    print(f"  [WARNING] Mixed environment - DB remote, files local")
    print(f"  [WARNING] Test data will be saved to PRODUCTION database!")
elif not is_local and not files_local:
    print(f"  [WARNING] Fully remote - Operating on PRODUCTION environment")

print("\n" + "="*60)
