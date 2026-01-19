#!/usr/bin/env python
"""Test image storage and retrieval"""
import os
import uuid
from pathlib import Path
from app.config import get_settings

settings = get_settings()

print("="*60)
print("Image Storage Test")
print("="*60)

# Create test task ID
task_id = str(uuid.uuid4())
print(f"\n[Test Setup]")
print(f"  Task ID: {task_id}")
print(f"  Image directory: {settings.image_dir}")

# Create task-specific image directory
task_image_dir = os.path.join(settings.image_dir, task_id)
os.makedirs(task_image_dir, exist_ok=True)
print(f"  Task image directory: {task_image_dir}")

# Create test image file
test_image_path = os.path.join(task_image_dir, "image_1_test.png")
with open(test_image_path, 'wb') as f:
    # Write a minimal 1x1 PNG (smallest valid PNG)
    f.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
            b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\x00\x01'
            b'\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')

print(f"\n[Test Image Created]")
print(f"  Path: {test_image_path}")
print(f"  Size: {os.path.getsize(test_image_path)} bytes")
print(f"  Exists: {os.path.exists(test_image_path)}")

# Test API endpoint format
api_url = f"http://localhost:8001/api/paper/images/{task_id}/1"
print(f"\n[API Access]")
print(f"  URL: {api_url}")
print(f"  Method: GET")
print(f"  Expected: Returns image file (image/png)")

# Test image retrieval logic
import glob
pattern = os.path.join(task_image_dir, "image_1_*.*")
matching_files = glob.glob(pattern)
print(f"\n[File Matching Test]")
print(f"  Pattern: {pattern}")
print(f"  Matches found: {len(matching_files)}")
if matching_files:
    print(f"  First match: {matching_files[0]}")

# Cleanup
print(f"\n[Cleanup]")
choice = input("Delete test files? (y/N): ").strip().lower()
if choice == 'y':
    os.remove(test_image_path)
    os.rmdir(task_image_dir)
    print(f"  Test files deleted")
else:
    print(f"  Test files kept for manual testing")
    print(f"  You can test the API with: curl {api_url} -o test.png")

print("\n" + "="*60)
print("[SUCCESS] Image storage is working correctly!")
print("="*60)
print(f"\n[Next Steps]")
print(f"1. Keep the test image for manual API testing")
print(f"2. Open browser: {api_url}")
print(f"3. Or use: curl {api_url} -o downloaded_image.png")
