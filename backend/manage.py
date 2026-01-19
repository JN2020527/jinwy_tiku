#!/usr/bin/env python
"""
Jinwenyuan Paper Management System - Management Tool
Unified tool for managing database and local files
"""
import sys
import os

def print_banner():
    print("="*60)
    print("晋文源试卷管理系统 - 管理工具")
    print("Jinwenyuan Paper Management System")
    print("="*60)

def main_menu():
    print_banner()
    print("\n[Main Menu]")
    print("  1. Check current configuration")
    print("  2. Test database connection")
    print("  3. View database statistics")
    print("  4. Clean up database test data")
    print("  5. Clean up local storage files")
    print("  6. Test image storage")
    print("  7. Verify database setup")
    print("  0. Exit")
    print("="*60)

    choice = input("\nEnter your choice (0-7): ").strip()
    return choice

def run_script(script_name):
    """Run a Python script in the same environment"""
    os.system(f'python {script_name}')

def main():
    while True:
        choice = main_menu()

        if choice == '0':
            print("\n[INFO] Goodbye!")
            sys.exit(0)

        elif choice == '1':
            print("\n" + "="*60)
            run_script('check_db_location.py')
            input("\nPress Enter to continue...")

        elif choice == '2':
            print("\n" + "="*60)
            run_script('test_connection.py')
            input("\nPress Enter to continue...")

        elif choice == '3':
            print("\n" + "="*60)
            from sqlalchemy import create_engine, text
            from app.config import get_settings

            settings = get_settings()
            engine = create_engine(settings.database_url)

            try:
                with engine.connect() as conn:
                    print("\n[Database Statistics]")
                    print("-" * 60)

                    tables = ['papers', 'questions', 'question_groups',
                             'question_contents', 'images']

                    for table in tables:
                        count = conn.execute(
                            text(f"SELECT COUNT(*) FROM tiku.{table}")
                        ).scalar()
                        print(f"  {table:20s}: {count:5d} rows")

                    # Test papers
                    test_count = conn.execute(text("""
                        SELECT COUNT(*) FROM tiku.papers
                        WHERE paper_metadata->>'name' LIKE '%测试%'
                           OR paper_metadata->>'name' LIKE '%test%'
                    """)).scalar()
                    print(f"\n  Test papers: {test_count}")

                    # Recent papers
                    result = conn.execute(text("""
                        SELECT
                            paper_metadata->>'name' as name,
                            created_at
                        FROM tiku.papers
                        ORDER BY created_at DESC
                        LIMIT 5
                    """))

                    print("\n[Recent Papers]")
                    print("-" * 60)
                    for row in result:
                        created = row.created_at.strftime('%Y-%m-%d %H:%M')
                        print(f"  - {row.name} ({created})")

            except Exception as e:
                print(f"[ERROR] {e}")

            input("\nPress Enter to continue...")

        elif choice == '4':
            print("\n" + "="*60)
            run_script('cleanup_test_data.py')
            input("\nPress Enter to continue...")

        elif choice == '5':
            print("\n" + "="*60)
            run_script('cleanup_local_files.py')
            input("\nPress Enter to continue...")

        elif choice == '6':
            print("\n" + "="*60)
            run_script('test_image_storage.py')
            input("\nPress Enter to continue...")

        elif choice == '7':
            print("\n" + "="*60)
            run_script('verify_setup.py')
            input("\nPress Enter to continue...")

        else:
            print("[ERROR] Invalid choice")
            input("\nPress Enter to continue...")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[INFO] Interrupted by user")
        sys.exit(0)
