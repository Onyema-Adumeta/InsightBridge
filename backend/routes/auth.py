"""
JWT Authentication for Clerk using v4.0.0 SDK
Properly verifies tokens using Clerk's Session API
"""

import os
import logging
from fastapi import Header, HTTPException
from typing import Optional

logger = logging.getLogger(__name__)

# Initialize Clerk client
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")

# Try to import Clerk SDK
try:
    from clerk_backend_api import Clerk
    
    if not CLERK_SECRET_KEY:
        logger.warning("⚠️ CLERK_SECRET_KEY not set - authentication will fail!")
        clerk_client = None
    else:
        clerk_client = Clerk(bearer_auth=CLERK_SECRET_KEY)
        logger.info("✅ Clerk SDK initialized successfully")
        
except ImportError as e:
    logger.error(f"❌ Failed to import Clerk SDK: {e}")
    clerk_client = None


async def get_current_user_id(
    authorization: Optional[str] = Header(None),
) -> str:
    """
    Verifies Clerk JWT token and extracts user ID.
    Uses Clerk Sessions API for verification.
    """
    
    if not authorization:
        logger.error("❌ No Authorization header provided")
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    # Extract Bearer token
    try:
        scheme, token = authorization.split(maxsplit=1)
        if scheme.lower() != "bearer":
            logger.error(f"❌ Invalid auth scheme: {scheme}")
            raise HTTPException(status_code=401, detail="Invalid Authorization header format")
    except ValueError:
        logger.error("❌ Malformed Authorization header")
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")

    if not clerk_client:
        logger.error("❌ Clerk client not initialized - check CLERK_SECRET_KEY")
        raise HTTPException(status_code=500, detail="Authentication service unavailable")

    # Verify token with Clerk
    try:
        logger.info(f"🔑 Verifying token (first 20 chars): {token[:20]}...")
        
        # For Clerk v4.0.0, use the verify_token method
        # The token is a JWT that contains session info
        from jose import jwt
        
        # Decode without verification to get session_id
        unverified = jwt.get_unverified_claims(token)
        session_id = unverified.get("sid")
        
        if not session_id:
            logger.error("❌ No session ID in token")
            raise HTTPException(status_code=401, detail="Invalid token: missing session ID")
        
        # Verify the session with Clerk
        logger.info(f"🔍 Verifying session: {session_id[:10]}...")
        session = clerk_client.sessions.verify_token(session_id=session_id, token=token)
        
        # Extract user ID from verified session
        user_id = session.user_id
        
        if not user_id:
            logger.error("❌ Session verified but no user ID found")
            raise HTTPException(status_code=401, detail="Invalid token: missing user ID")

        logger.info(f"✅ Authenticated user: {user_id}")
        return user_id

    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        logger.error(f"❌ Token verification failed: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=401, 
            detail=f"Authentication failed: {str(e)}"
        )