# Authentication Troubleshooting Guide

## Issue: "Invalid authentication token" when accessing /auth/me

### Changes Made

1. **Improved HTTPBearer handling**: Changed `HTTPBearer(auto_error=False)` to handle errors manually
2. **Better error logging**: Added detailed logging throughout the authentication flow
3. **Manual header extraction**: Added fallback to manually extract token from Authorization header

### Debugging Steps

1. **Check if token is being stored after login:**
   - Open browser DevTools → Application → Local Storage
   - Look for `auth_token` key
   - Verify the token exists and is not empty

2. **Check if token is being sent in requests:**
   - Open browser DevTools → Network tab
   - Make a request to `/auth/me`
   - Check the Request Headers
   - Look for `Authorization: Bearer <token>`
   - Verify the token is present

3. **Check backend logs:**
   - Look for log messages like:
     - "Attempting to decode token"
     - "Token decoded successfully"
     - "Failed to decode token"
   - These will help identify where the issue occurs

4. **Verify SECRET_KEY:**
   - Ensure the same `SECRET_KEY` is used for both token creation and validation
   - Check your `.env` file or environment variables
   - Default is: `"your-secret-key-change-in-production"`

5. **Check token expiration:**
   - Tokens expire after 30 minutes by default
   - Try logging in again to get a fresh token

### Common Issues and Solutions

#### Issue: Token not in localStorage
**Solution**: Clear localStorage and login again
```javascript
localStorage.clear()
```

#### Issue: Token format incorrect
**Solution**: Token should be sent as `Bearer <token>` in Authorization header
- Check axios client is adding the header correctly
- Verify token doesn't have extra spaces or characters

#### Issue: SECRET_KEY mismatch
**Solution**: Ensure SECRET_KEY is the same in:
- `.env` file
- Environment variables
- Backend configuration

#### Issue: Token expired
**Solution**: Login again to get a new token

### Testing the Token Manually

You can test the token using curl:

```bash
# 1. Login and get token
TOKEN=$(curl -X POST "http://127.0.0.1:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | jq -r '.access_token')

# 2. Use token to access /auth/me
curl -X GET "http://127.0.0.1:8000/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

### Expected Behavior

After successful login:
1. Token is stored in `localStorage` as `auth_token`
2. Token is automatically added to all API requests via axios interceptor
3. `/auth/me` endpoint should return user information
4. All protected routes should work

### If Issue Persists

1. Check browser console for errors
2. Check backend logs for detailed error messages
3. Verify database migration was run (role column exists)
4. Ensure user exists in database with correct role
5. Try creating a new user and logging in again
