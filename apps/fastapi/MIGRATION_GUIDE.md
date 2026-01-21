# Database Migration and User Setup Guide

## 1. Run Database Migration

The database schema needs to be updated to include the `role` field for users.

### Option A: Using Alembic (Recommended)

```bash
cd apps/fastapi
alembic upgrade head
```

This will apply the migration that adds the `role` column to the `users` table.

### Option B: Manual SQL (If Alembic is not available)

If you prefer to run the migration manually, execute this SQL:

```sql
ALTER TABLE users ADD role VARCHAR(20) NOT NULL DEFAULT 'user';
```

## 2. Create Your First User

You have **three options** to create your first user:

### Option A: Using Registration Endpoint (Recommended)

The registration endpoint automatically creates the first user as an admin:

**Using curl:**
```bash
curl -X POST "http://127.0.0.1:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "full_name": "Admin User",
    "password": "your-secure-password"
  }'
```

**Using the API docs:**
1. Start the FastAPI server: `uvicorn app.main:app --reload`
2. Open http://127.0.0.1:8000/docs
3. Navigate to `POST /auth/register`
4. Fill in the form and click "Execute"

**Note:** The first user registered will automatically be assigned the `admin` role. All subsequent registrations will be regular `user` role.

### Option B: Using Seed Script

Run the seed script to create an admin user interactively:

```bash
cd apps/fastapi
python scripts/seed_admin.py
```

The script will prompt you for:
- Email
- Full Name
- Password (with confirmation)

### Option C: Direct Database Insert (Advanced)

If you need to create a user directly in the database:

```sql
-- Note: Replace 'hashed_password_here' with a bcrypt hash of your password
-- You can generate one using Python:
-- from passlib.context import CryptContext
-- pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
-- print(pwd_context.hash("your-password"))

INSERT INTO users (email, full_name, hashed_password, role, created_at)
VALUES ('admin@example.com', 'Admin User', 'hashed_password_here', 'admin', GETDATE());
```

## 3. Login to the Application

Once you have created a user, you can login:

**Using the Frontend:**
1. Navigate to http://localhost:5173/login (or your frontend URL)
2. Enter your email and password
3. Click "Sign In"

**Using the API:**
```bash
curl -X POST "http://127.0.0.1:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'
```

This will return a JWT token that you can use for authenticated requests.

## 4. Verify Migration

To verify the migration was successful, check the users table:

```sql
SELECT id, email, full_name, role, created_at FROM users;
```

You should see the `role` column with values 'user' or 'admin'.

## Troubleshooting

### Migration Issues

If the migration fails:
1. Check that your database connection is working
2. Verify the previous migration (36aa8dce1f55) was applied
3. Check for any existing `role` column (it may have been added manually)

### User Creation Issues

If user creation fails:
1. Check that the migration has been applied (role column exists)
2. Verify email is unique (no duplicate emails)
3. Check server logs for detailed error messages

### Login Issues

If login fails:
1. Verify the user exists in the database
2. Check that the password is correct
3. Ensure the JWT_SECRET_KEY is set in your .env file
4. Check server logs for authentication errors
