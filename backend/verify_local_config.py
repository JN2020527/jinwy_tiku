#!/usr/bin/env python
"""Verify local development configuration"""
import os
from app.config import get_settings

settings = get_settings()

print("="*60)
print("Local Development Configuration")
print("="*60)

print(f"\n[Environment]")
print(f"  Environment: {settings.environment}")
print(f"  Config file: {'.env.local' if os.path.exists('.env.local') else '.env'}")

print(f"\n[Database]")
# Mask password in output
db_url = settings.database_url
if '@' in db_url:
    parts = db_url.split('@')
    user_pass = parts[0].split('://')[-1]
    if ':' in user_pass:
        user = user_pass.split(':')[0]
        masked_url = db_url.replace(user_pass, f"{user}:****")
        print(f"  Database URL: {masked_url}")
    else:
        print(f"  Database URL: {db_url}")
else:
    print(f"  Database URL: {db_url}")

print(f"\n[File Storage]")
print(f"  Upload directory: {settings.upload_dir}")
print(f"  Image directory: {settings.image_dir}")

# Check if directories exist
upload_exists = os.path.exists(settings.upload_dir)
image_exists = os.path.exists(settings.image_dir)

print(f"\n[Directory Status]")
print(f"  Upload directory exists: {'[OK]' if upload_exists else '[MISSING]'}")
print(f"  Image directory exists: {'[OK]' if image_exists else '[MISSING]'}")

# Check if paths are accessible (local paths)
is_local = not settings.upload_dir.startswith('/home/')
print(f"\n[Path Type]")
print(f"  Using local paths: {'[YES]' if is_local else '[NO - Remote Linux paths]'}")

if is_local:
    # Test write access
    test_file = os.path.join(settings.upload_dir, '.test_write')
    try:
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        print(f"  Write access: [OK]")
    except Exception as e:
        print(f"  Write access: [FAILED] {e}")
else:
    print(f"  Write access: [SKIP - Remote paths cannot be tested on Windows]")

print(f"\n[Server]")
print(f"  Host: {settings.host}")
print(f"  Port: {settings.port}")
print(f"  Max file size: {settings.max_file_size / 1024 / 1024:.1f} MB")

print("\n" + "="*60)
if settings.environment == 'development' and is_local:
    print("[SUCCESS] Local development configuration is correct!")
elif settings.environment == 'production' and not is_local:
    print("[SUCCESS] Production configuration is correct!")
else:
    print("[WARNING] Configuration mismatch - check environment settings")
print("="*60)
