"""
Create or update User Management accounts for SmartKidz students (tenant 21).

Uses parent email from students.email (not @student.local).
Password = parent mobile on student record.

Run from fastapi/:
    python scripts/create_smartkidz_student_users.py
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pyodbc
from dotenv import load_dotenv

from app.utils.security import hash_password
from app.utils.student_login_email import normalize_email, resolve_student_login_email

load_dotenv()

TENANT_ID = 21


def connect():
    driver = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")
    return pyodbc.connect(
        f"DRIVER={{{driver}}};SERVER={os.getenv('DB_SERVER')};DATABASE={os.getenv('DB_NAME')};"
        f"UID={os.getenv('DB_USER')};PWD={os.getenv('DB_PASSWORD')};TrustServerCertificate=yes",
        timeout=30,
        autocommit=False,
    )


def ensure_student_role(cur) -> int:
    cur.execute(
        """
        SELECT TOP 1 id FROM dbo.roles
        WHERE tenant_id = ? AND code = N'STUDENT' AND is_deleted = 0
        ORDER BY id
        """,
        TENANT_ID,
    )
    row = cur.fetchone()
    if row:
        return int(row[0])

    cur.execute(
        """
        INSERT INTO dbo.roles (code, name, scope_type, tenant_id, is_system, is_active, created_at, is_deleted)
        OUTPUT INSERTED.id
        VALUES (N'STUDENT', N'Student', N'Tenant', ?, 0, 1, GETUTCDATE(), 0)
        """,
        TENANT_ID,
    )
    role_id = int(cur.fetchone()[0])
    print(f"Created STUDENT role id={role_id}")
    return role_id


def legacy_student_email(admission_no: str) -> str:
    return f"{admission_no.strip().lower()}@student.local"


def load_taken_emails(cur) -> set[str]:
    cur.execute("SELECT email FROM dbo.users WHERE is_deleted = 0")
    return {normalize_email(row[0]) for row in cur.fetchall() if row[0]}


def find_student_user(cur, name: str, mobile, legacy_email: str):
    cur.execute(
        """
        SELECT id, email FROM dbo.users
        WHERE tenant_id = ? AND role = N'STUDENT' AND is_deleted = 0
          AND (
            email = ?
            OR (full_name = ? AND (phone_number = ? OR (phone_number IS NULL AND ? IS NULL)))
          )
        """,
        TENANT_ID,
        legacy_email,
        name,
        mobile,
        mobile,
    )
    return cur.fetchone()


def main() -> None:
    conn = connect()
    cur = conn.cursor()
    role_id = ensure_student_role(cur)

    cur.execute(
        """
        SELECT id, student_name, admission_no, mobile_number, email
        FROM dbo.students
        WHERE tenant_id = ?
        ORDER BY admission_no
        """,
        TENANT_ID,
    )
    students = cur.fetchall()

    taken = load_taken_emails(cur)
    created = 0
    updated = 0
    skipped = 0
    errors = 0

    for student_id, name, admission_no, mobile, parent_email in students:
        if not admission_no:
            print(f"SKIP student id={student_id}: no admission_no")
            errors += 1
            continue

        password = (mobile or "student@123").strip() or "student@123"
        legacy_email = legacy_student_email(admission_no)

        if legacy_email in taken:
            taken.discard(legacy_email)

        target_email = resolve_student_login_email(parent_email, admission_no, taken)
        existing = find_student_user(cur, name, mobile, legacy_email)

        cur.execute(
            "SELECT id FROM dbo.users WHERE email = ? AND is_deleted = 0",
            target_email,
        )
        existing_target = cur.fetchone()

        if existing:
            user_id = int(existing[0])
            current_email = normalize_email(existing[1])
            if current_email == target_email:
                skipped += 1
            elif existing_target and int(existing_target[0]) != user_id:
                print(f"SKIP {admission_no}: target email taken by another user ({target_email})")
                skipped += 1
            else:
                cur.execute(
                    """
                    UPDATE dbo.users
                    SET email = ?, full_name = ?, phone_number = ?, updated_at = GETUTCDATE()
                    WHERE id = ?
                    """,
                    target_email,
                    name,
                    mobile,
                    user_id,
                )
                updated += 1
        elif existing_target:
            skipped += 1
            continue
        else:
            hashed = hash_password(password)
            cur.execute(
                """
                INSERT INTO dbo.users (
                    tenant_id, email, full_name, hashed_password, phone_number,
                    role, is_active, created_at, is_deleted
                )
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, ?, ?, N'STUDENT', 1, GETUTCDATE(), 0)
                """,
                TENANT_ID,
                target_email,
                name,
                hashed,
                mobile,
            )
            user_id = int(cur.fetchone()[0])
            created += 1

        cur.execute(
            """
            IF NOT EXISTS (SELECT 1 FROM dbo.user_roles WHERE user_id = ? AND role_id = ?)
                INSERT INTO dbo.user_roles (user_id, role_id, assigned_at, assigned_by)
                VALUES (?, ?, GETUTCDATE(), NULL)
            """,
            user_id,
            role_id,
            user_id,
            role_id,
        )

    conn.commit()
    conn.close()

    print(
        f"Done: created={created}, updated={updated}, skipped={skipped}, "
        f"errors={errors}, total_students={len(students)}"
    )


if __name__ == "__main__":
    main()
