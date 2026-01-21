"""
Test script to debug JWT token decoding issues.

Usage:
    python scripts/test_token.py <token>
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jose import jwt, JWTError
from app.core.config import settings

def test_token_decode(token: str):
    """Test decoding a JWT token."""
    print("=" * 60)
    print("JWT Token Decoding Test")
    print("=" * 60)
    print(f"\nToken (first 50 chars): {token[:50]}...")
    print(f"Token length: {len(token)}")
    print(f"\nSECRET_KEY length: {len(settings.SECRET_KEY)}")
    print(f"SECRET_KEY (first 20 chars): {settings.SECRET_KEY[:20]}...")
    print(f"Algorithm: {settings.ALGORITHM}")
    
    # Try to decode without verification first to see the payload
    try:
        unverified = jwt.decode(token, options={"verify_signature": False})
        print(f"\n✓ Token can be decoded (unverified)")
        print(f"  Payload: {unverified}")
        print(f"  User ID (sub): {unverified.get('sub')}")
        print(f"  Email: {unverified.get('email')}")
        print(f"  Role: {unverified.get('role')}")
        print(f"  Expires at (exp): {unverified.get('exp')}")
    except Exception as e:
        print(f"\n✗ Failed to decode token (even without verification): {e}")
        return
    
    # Now try with verification
    print(f"\n{'='*60}")
    print("Attempting verified decode...")
    print(f"{'='*60}")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        print(f"✓ Token verified successfully!")
        print(f"  User ID: {payload.get('sub')}")
        print(f"  Email: {payload.get('email')}")
        print(f"  Role: {payload.get('role')}")
    except JWTError as e:
        print(f"✗ JWT Error: {type(e).__name__}: {str(e)}")
        print(f"\nPossible causes:")
        print(f"  1. SECRET_KEY mismatch (token was created with different key)")
        print(f"  2. Token has expired")
        print(f"  3. Token signature is invalid")
    except Exception as e:
        print(f"✗ Unexpected error: {type(e).__name__}: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/test_token.py <token>")
        sys.exit(1)
    
    token = sys.argv[1]
    test_token_decode(token)
