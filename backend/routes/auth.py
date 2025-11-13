"""
JWT Authentication for Clerk using official Clerk Backend SDK
Properly verifies tokens using Clerk's API
"""

import os
import logging
from fastapi import Header, HTTPException
from typing import Optional
from clerk_backend_api import Clerk
from clerk_backend_api.jwks_helpers import verify_token

logger = logging.getLogger(__name__)

# Initialize Clerk client with secret key
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")

if not CLERK_SECRET_KEY:
    logger.warning("⚠️ CLERK_SECRET_KEY not set - authentication will fail!")

clerk_client = Clerk(bearer_auth=CLERK_SECRET_KEY) if CLERK_SECRET_KEY else None


async def get_current_user_id(
    authorization: Optional[str] = Header(None),
) -> str:
    """
    Verifies Clerk JWT token and extracts the user ID.
    Returns user_id (string).
    """
    
    if not authorization:
        logger.error("❌ No Authorization header provided")
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    # Extract Bearer token
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            logger.error(f"❌ Invalid auth scheme: {scheme}")
            raise HTTPException(status_code=401, detail="Invalid Authorization header format")
    except ValueError:
        logger.error("❌ Malformed Authorization header")
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    if not clerk_client:
        logger.error("❌ Clerk client not initialized - check CLERK_SECRET_KEY")
        raise HTTPException(status_code=500, detail="Authentication service unavailable")

    # Verify token with Clerk
    try:
        logger.info(f"🔑 Verifying token (first 20 chars): {token[:20]}...")
        
        # Use Clerk's verify_token helper to validate the JWT
        verified_token = verify_token(token, CLERK_SECRET_KEY)
        
        # Extract user ID from verified claims
        user_id = verified_token.get("sub")
        
        if not user_id:
            logger.error("❌ Token verified but no user ID (sub) found")
            raise HTTPException(status_code=401, detail="Invalid token: missing user ID")

        logger.info(f"✅ Authenticated user: {user_id}")
        return user_id

    except Exception as e:
        logger.error(f"❌ Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=401, 
            detail=f"Invalid or expired token: {str(e)}"
        )