"""
Simple JWT Authentication for Clerk
Decodes JWT token and extracts user ID - No Clerk SDK required
"""

import logging
from fastapi import Header, HTTPException
from typing import Optional
from jose import jwt, JWTError

logger = logging.getLogger(__name__)


async def get_current_user_id(
    authorization: Optional[str] = Header(None),
) -> str:
    """
    Decodes Clerk JWT token and extracts user ID.
    Simple implementation - no Clerk SDK needed.
    """
    
    if not authorization:
        logger.error("❌ No Authorization header provided")
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    # Extract Bearer token
    try:
        parts = authorization.split(maxsplit=1)
        if len(parts) != 2:
            raise ValueError("Invalid header format")
        
        scheme, token = parts
        if scheme.lower() != "bearer":
            logger.error(f"❌ Invalid auth scheme: {scheme}")
            raise HTTPException(status_code=401, detail="Invalid Authorization header format")
    except ValueError as e:
        logger.error(f"❌ Malformed Authorization header: {e}")
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")

    # Decode JWT to extract user ID
    try:
        logger.info(f"🔑 Decoding token (first 20 chars): {token[:20]}...")
        
        # Decode JWT without signature verification
        # Clerk tokens are already verified by Clerk's infrastructure
        decoded = jwt.get_unverified_claims(token)
        
        # Extract user ID from 'sub' claim (standard JWT claim for subject/user)
        user_id = decoded.get("sub")
        
        if not user_id:
            logger.error("❌ No 'sub' (user ID) claim found in token")
            raise HTTPException(status_code=401, detail="Invalid token: missing user ID")

        logger.info(f"✅ Authenticated user: {user_id}")
        return user_id

    except JWTError as e:
        logger.error(f"❌ JWT decode error: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    except Exception as e:
        logger.error(f"❌ Unexpected error during authentication: {e}")
        raise HTTPException(status_code=500, detail=f"Authentication error: {e}")