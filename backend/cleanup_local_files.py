#!/usr/bin/env python
"""Clean up local storage files"""
import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from app.config import get_settings

settings = get_settings()

print("="*60)
print("Local File Storage Cleanup Tool")
print("="*60)

# Get directory info
upload_dir = Path(settings.upload_dir)
image_dir = Path(settings.image_dir)

print(f"\n[Storage Locations]")
print(f"  Upload directory: {upload_dir}")
print(f"  Image directory:  {image_dir}")

# Calculate sizes
def get_dir_size(path):
    total = 0
    if path.exists():
        for entry in path.rglob('*'):
            if entry.is_file():
                total += entry.stat().st_size
    return total

def format_size(size_bytes):
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"

# Count files
upload_count = len(list(upload_dir.glob('*.docx'))) if upload_dir.exists() else 0
image_dirs = len([d for d in image_dir.iterdir() if d.is_dir()]) if image_dir.exists() else 0
image_count = len(list(image_dir.rglob('*.*'))) if image_dir.exists() else 0

upload_size = get_dir_size(upload_dir)
image_size = get_dir_size(image_dir)
total_size = upload_size + image_size

print(f"\n[Current Usage]")
print(f"  Upload files:  {upload_count:5d} files  ({format_size(upload_size)})")
print(f"  Image folders: {image_dirs:5d} folders")
print(f"  Image files:   {image_count:5d} files  ({format_size(image_size)})")
print(f"  Total size:    {format_size(total_size)}")

# Find old files
def find_old_files(path, days):
    cutoff = datetime.now() - timedelta(days=days)
    old_files = []
    if path.exists():
        for entry in path.rglob('*'):
            if entry.is_file():
                mtime = datetime.fromtimestamp(entry.stat().st_mtime)
                if mtime < cutoff:
                    old_files.append((entry, mtime))
    return old_files

print("\n" + "="*60)
print("Cleanup Options:")
print("  1. Delete files older than N days")
print("  2. Delete all upload files (keep images)")
print("  3. Delete all image files (keep uploads)")
print("  4. Delete everything (uploads + images)")
print("  5. Delete a specific task folder")
print("  6. View file list only (no deletion)")
print("  0. Cancel")
print("="*60)

choice = input("\nEnter your choice (0-6): ").strip()

if choice == '0':
    print("[INFO] Cancelled")
    exit(0)

elif choice == '1':
    days = input("\nDelete files older than how many days? ")
    try:
        days = int(days)
        old_uploads = find_old_files(upload_dir, days)
        old_images = find_old_files(image_dir, days)

        total_old = len(old_uploads) + len(old_images)

        if total_old == 0:
            print(f"\n[INFO] No files older than {days} days")
        else:
            print(f"\n[Found]")
            print(f"  Old upload files: {len(old_uploads)}")
            print(f"  Old image files:  {len(old_images)}")
            print(f"  Total: {total_old}")

            confirm = input(f"\n[WARNING] Delete these {total_old} old files? (yes/no): ")
            if confirm.lower() == 'yes':
                count = 0
                for file, _ in old_uploads:
                    file.unlink()
                    count += 1
                for file, _ in old_images:
                    file.unlink()
                    count += 1

                # Remove empty directories
                for d in image_dir.iterdir() if image_dir.exists() else []:
                    if d.is_dir() and not any(d.iterdir()):
                        d.rmdir()

                print(f"[SUCCESS] Deleted {count} files")
            else:
                print("[INFO] Cancelled")
    except ValueError:
        print("[ERROR] Invalid number")

elif choice == '2':
    if upload_count == 0:
        print("\n[INFO] No upload files to delete")
    else:
        confirm = input(f"\n[WARNING] Delete {upload_count} upload files ({format_size(upload_size)})? (yes/no): ")
        if confirm.lower() == 'yes':
            for file in upload_dir.glob('*.docx'):
                file.unlink()
            print(f"[SUCCESS] Deleted {upload_count} upload files")
        else:
            print("[INFO] Cancelled")

elif choice == '3':
    if image_count == 0:
        print("\n[INFO] No image files to delete")
    else:
        confirm = input(f"\n[WARNING] Delete {image_count} image files ({format_size(image_size)})? (yes/no): ")
        if confirm.lower() == 'yes':
            if image_dir.exists():
                shutil.rmtree(image_dir)
                image_dir.mkdir(exist_ok=True)
            print(f"[SUCCESS] Deleted all image files")
        else:
            print("[INFO] Cancelled")

elif choice == '4':
    if total_size == 0:
        print("\n[INFO] No files to delete")
    else:
        print(f"\n[WARNING] This will delete:")
        print(f"  - {upload_count} upload files")
        print(f"  - {image_count} image files")
        print(f"  - Total size: {format_size(total_size)}")
        confirm = input("\nAre you sure? (yes/no): ")
        if confirm.lower() == 'yes':
            if upload_dir.exists():
                shutil.rmtree(upload_dir)
                upload_dir.mkdir(exist_ok=True)
            if image_dir.exists():
                shutil.rmtree(image_dir)
                image_dir.mkdir(exist_ok=True)
            print("[SUCCESS] Deleted all files")
        else:
            print("[INFO] Cancelled")

elif choice == '5':
    if not image_dir.exists() or not any(image_dir.iterdir()):
        print("\n[INFO] No task folders found")
    else:
        print("\n[Task Folders]")
        folders = [d for d in image_dir.iterdir() if d.is_dir()]
        for idx, folder in enumerate(folders, 1):
            file_count = len(list(folder.glob('*')))
            size = get_dir_size(folder)
            print(f"{idx}. {folder.name} ({file_count} files, {format_size(size)})")

        task_num = input("\nEnter task number to delete (0 to cancel): ").strip()
        try:
            task_idx = int(task_num) - 1
            if 0 <= task_idx < len(folders):
                folder = folders[task_idx]
                # Also delete corresponding upload file
                upload_file = upload_dir / f"{folder.name}.docx"

                confirm = input(f"\n[WARNING] Delete task folder '{folder.name}'? (yes/no): ")
                if confirm.lower() == 'yes':
                    shutil.rmtree(folder)
                    if upload_file.exists():
                        upload_file.unlink()
                    print(f"[SUCCESS] Deleted task: {folder.name}")
                else:
                    print("[INFO] Cancelled")
            elif task_num != '0':
                print("[ERROR] Invalid task number")
        except ValueError:
            print("[ERROR] Invalid input")

elif choice == '6':
    print("\n" + "="*60)
    print("[File List]")
    print("="*60)

    print("\n[Upload Files]")
    if upload_dir.exists():
        for file in sorted(upload_dir.glob('*.docx'), key=lambda f: f.stat().st_mtime, reverse=True):
            size = file.stat().st_size
            mtime = datetime.fromtimestamp(file.stat().st_mtime)
            print(f"  {file.name[:40]:40s} {format_size(size):>10s} {mtime.strftime('%Y-%m-%d %H:%M')}")

    print("\n[Image Folders]")
    if image_dir.exists():
        for folder in sorted(image_dir.iterdir(), key=lambda f: f.stat().st_mtime, reverse=True):
            if folder.is_dir():
                file_count = len(list(folder.glob('*')))
                size = get_dir_size(folder)
                mtime = datetime.fromtimestamp(folder.stat().st_mtime)
                print(f"  {folder.name[:40]:40s} {file_count:3d} files {format_size(size):>10s} {mtime.strftime('%Y-%m-%d')}")

else:
    print("[ERROR] Invalid choice")

print("\n" + "="*60)
