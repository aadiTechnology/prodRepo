"""
Check: tenant-admin homework sidebar unread count must change by class/division.

Bug (confirmed on ShantiNiketan tenant 20, admin user 77):
  - Unfiltered unread = 25 (matches sticky sidebar badge)
  - Nursery (class_id=56) unread = 13
  - Standard 1 (class_id=54) unread = 12
  Frontend was calling GET /api/homework/unread-count with NO class/division
  filters, so the badge stayed at 25 when admin changed list filters.

Usage (from apps/fastapi):
    python scripts/check_homework_admin_filter_count.py

Exit 0 = counts differ by class (filter is meaningful; UI must pass class_id).
Exit 1 = cannot prove filter effect (no data / same counts).
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
import pyodbc

load_dotenv(os.getenv("ENV_FILE", ".env"))

TENANT_NAME_LIKE = "%Shanti%"
ADMIN_EMAIL_LIKE = "%shant%"


def connect():
    driver = os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server")
    return pyodbc.connect(
        f"DRIVER={{{driver}}};SERVER={os.getenv('DB_SERVER')};DATABASE={os.getenv('DB_NAME')};"
        f"UID={os.getenv('DB_USER')};PWD={os.getenv('DB_PASSWORD')};TrustServerCertificate=yes",
        timeout=30,
    )


def unread_count(cur, *, tenant_id: int, user_id: int, class_id=None, division_id=None) -> int:
    sql = """
        SELECT COUNT(*)
        FROM dbo.homework h
        LEFT JOIN dbo.homework_views v
          ON v.homework_id = h.id
         AND v.tenant_id = h.tenant_id
         AND v.user_id = ?
        WHERE h.tenant_id = ?
          AND (h.is_deleted = 0 OR h.is_deleted IS NULL)
          AND LOWER(h.status) IN (N'published', N'active')
          AND v.id IS NULL
    """
    params: list = [user_id, tenant_id]
    if class_id is not None:
        sql += " AND h.class_id = ?"
        params.append(class_id)
    if division_id is not None:
        sql += " AND h.class_division_id = ?"
        params.append(division_id)
    cur.execute(sql, *params)
    return int(cur.fetchone()[0])


def main() -> int:
    with connect() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT TOP 1 id, name FROM dbo.tenants
            WHERE name LIKE ? ORDER BY id
            """,
            TENANT_NAME_LIKE,
        )
        tenant = cur.fetchone()
        if not tenant:
            print("FAIL: ShantiNiketan tenant not found")
            return 1
        tenant_id = int(tenant[0])
        print(f"tenant: {tenant[1]} (id={tenant_id})")

        cur.execute(
            """
            SELECT TOP 1 id, email FROM dbo.users
            WHERE tenant_id = ?
              AND (is_deleted = 0 OR is_deleted IS NULL)
              AND email LIKE ?
            ORDER BY id
            """,
            tenant_id,
            ADMIN_EMAIL_LIKE,
        )
        admin = cur.fetchone()
        if not admin:
            print("FAIL: tenant admin user not found")
            return 1
        user_id = int(admin[0])
        print(f"admin: {admin[1]} (id={user_id})")

        cur.execute(
            """
            SELECT c.id, c.name, COUNT(h.id) AS live_hw
            FROM dbo.classes c
            INNER JOIN dbo.homework h
              ON h.class_id = c.id AND h.tenant_id = c.tenant_id
             AND (h.is_deleted = 0 OR h.is_deleted IS NULL)
             AND LOWER(h.status) IN (N'published', N'active')
            WHERE c.tenant_id = ?
              AND (c.is_deleted = 0 OR c.is_deleted IS NULL)
            GROUP BY c.id, c.name
            HAVING COUNT(h.id) > 0
            ORDER BY COUNT(h.id) DESC
            """,
            tenant_id,
        )
        classes = cur.fetchall()
        if len(classes) < 2:
            print("FAIL: need >=2 classes with published homework to prove filter")
            return 1

        total = unread_count(cur, tenant_id=tenant_id, user_id=user_id)
        print(f"unread TOTAL (no class filter): {total}")

        per_class = []
        for cid, cname, _live in classes[:4]:
            n = unread_count(cur, tenant_id=tenant_id, user_id=user_id, class_id=int(cid))
            per_class.append((int(cid), str(cname), n))
            print(f"unread class={cname!r} (id={cid}): {n}")

        distinct = {n for _, _, n in per_class}
        if total > 0 and len(distinct) >= 2:
            print(
                "RESULT: BUG surface confirmed — class filter changes unread count; "
                "sidebar must pass class_id/class_division_id (and treat Draft status as 0)."
            )
            print(
                f"EXPECTED UX: badge {total} with no class; "
                f"badge {per_class[0][2]} when Class={per_class[0][1]!r}; "
                f"badge {per_class[1][2]} when Class={per_class[1][1]!r}."
            )
            return 0

        print("RESULT: cannot confirm filter effect (counts identical or empty)")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
