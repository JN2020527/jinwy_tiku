#!/usr/bin/env python
"""Clean up test data from database"""
from sqlalchemy import create_engine, text
from app.config import get_settings
import sys

settings = get_settings()

print("="*60)
print("Database Test Data Cleanup Tool")
print("="*60)

engine = create_engine(settings.database_url)

try:
    with engine.connect() as conn:
        # List all papers
        result = conn.execute(text("""
            SELECT
                task_id,
                paper_metadata->>'name' as name,
                paper_metadata->>'subject' as subject,
                created_at
            FROM tiku.papers
            ORDER BY created_at DESC
        """))

        papers = result.fetchall()

        if not papers:
            print("\n[INFO] No papers found in database")
            sys.exit(0)

        print(f"\n[Current Papers] Total: {len(papers)}")
        print("-" * 60)
        for idx, paper in enumerate(papers, 1):
            task_id_short = paper.task_id[:8]
            created = paper.created_at.strftime('%Y-%m-%d %H:%M')
            print(f"{idx}. {paper.name} ({paper.subject})")
            print(f"   ID: {task_id_short}... | Created: {created}")

        print("\n" + "="*60)
        print("Cleanup Options:")
        print("  1. Delete papers containing '测试' in name")
        print("  2. Delete a specific paper by number")
        print("  3. Delete papers older than N days")
        print("  4. View statistics only (no deletion)")
        print("  0. Cancel")
        print("="*60)

        choice = input("\nEnter your choice (0-4): ").strip()

        if choice == '0':
            print("[INFO] Cancelled")
            sys.exit(0)

        elif choice == '1':
            # Delete test papers
            result = conn.execute(text("""
                SELECT COUNT(*) FROM tiku.papers
                WHERE paper_metadata->>'name' LIKE '%测试%'
                   OR paper_metadata->>'name' LIKE '%test%'
                   OR paper_metadata->>'name' LIKE '%Test%'
            """))
            count = result.scalar()

            if count == 0:
                print("\n[INFO] No test papers found")
            else:
                confirm = input(f"\n[WARNING] This will delete {count} test papers. Continue? (yes/no): ")
                if confirm.lower() == 'yes':
                    conn.execute(text("""
                        DELETE FROM tiku.papers
                        WHERE paper_metadata->>'name' LIKE '%测试%'
                           OR paper_metadata->>'name' LIKE '%test%'
                           OR paper_metadata->>'name' LIKE '%Test%'
                    """))
                    conn.commit()
                    print(f"[SUCCESS] Deleted {count} test papers")
                else:
                    print("[INFO] Cancelled")

        elif choice == '2':
            # Delete specific paper
            paper_num = input("\nEnter paper number to delete: ").strip()
            try:
                paper_idx = int(paper_num) - 1
                if 0 <= paper_idx < len(papers):
                    paper = papers[paper_idx]
                    confirm = input(f"\n[WARNING] Delete '{paper.name}'? (yes/no): ")
                    if confirm.lower() == 'yes':
                        conn.execute(text("""
                            DELETE FROM tiku.papers
                            WHERE task_id = :task_id
                        """), {"task_id": paper.task_id})
                        conn.commit()
                        print(f"[SUCCESS] Deleted paper: {paper.name}")
                    else:
                        print("[INFO] Cancelled")
                else:
                    print("[ERROR] Invalid paper number")
            except ValueError:
                print("[ERROR] Invalid input")

        elif choice == '3':
            # Delete old papers
            days = input("\nDelete papers older than how many days? ")
            try:
                days = int(days)
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM tiku.papers
                    WHERE created_at < NOW() - INTERVAL ':days days'
                """), {"days": days})
                count = result.scalar()

                if count == 0:
                    print(f"\n[INFO] No papers older than {days} days")
                else:
                    confirm = input(f"\n[WARNING] Delete {count} papers older than {days} days? (yes/no): ")
                    if confirm.lower() == 'yes':
                        conn.execute(text("""
                            DELETE FROM tiku.papers
                            WHERE created_at < NOW() - INTERVAL ':days days'
                        """), {"days": days})
                        conn.commit()
                        print(f"[SUCCESS] Deleted {count} papers")
                    else:
                        print("[INFO] Cancelled")
            except ValueError:
                print("[ERROR] Invalid number of days")

        elif choice == '4':
            # View statistics
            print("\n" + "="*60)
            print("[Database Statistics]")
            print("="*60)

            stats = {}
            stats['papers'] = conn.execute(text("SELECT COUNT(*) FROM tiku.papers")).scalar()
            stats['questions'] = conn.execute(text("SELECT COUNT(*) FROM tiku.questions")).scalar()
            stats['question_groups'] = conn.execute(text("SELECT COUNT(*) FROM tiku.question_groups")).scalar()
            stats['question_contents'] = conn.execute(text("SELECT COUNT(*) FROM tiku.question_contents")).scalar()
            stats['images'] = conn.execute(text("SELECT COUNT(*) FROM tiku.images")).scalar()

            for table, count in stats.items():
                print(f"  {table:20s}: {count:5d} rows")

            # Test papers count
            test_count = conn.execute(text("""
                SELECT COUNT(*) FROM tiku.papers
                WHERE paper_metadata->>'name' LIKE '%测试%'
                   OR paper_metadata->>'name' LIKE '%test%'
            """)).scalar()
            print(f"\n  Test papers: {test_count}")

        else:
            print("[ERROR] Invalid choice")

except Exception as e:
    print(f"\n[ERROR] Operation failed: {e}")
    sys.exit(1)

print("\n" + "="*60)
