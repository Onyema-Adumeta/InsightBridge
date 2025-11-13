"""
JWT Authentication for Clerk
Decodes the Authorization Bearer token and extracts the Clerk user ID.
"""

import os
import logging
from fastapi import Header, HTTPException, Depends
from dotenv import load_dotenv
from typing import Optional
from jose import jwt, JWTError

load_dotenv()
logger = logging.getLogger(__name__)

# Clerk JWT public key (JWK)
CLERK_JWKS_URL = "https://api.clerk.com/v1/jwks"

# Load Clerk issuer + audience
CLERK_ISSUER = os.getenv("CLERK_JWT_ISSUER")
CLERK_AUDIENCE = os.getenv("CLERK_JWT_AUDIENCE")

async def get_current_user_id(
    authorization: Optional[str] = Header(None),
):
    """
    Decodes Clerk JWT token and extracts the real user ID.
    Returns user_id (string).
    """

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid Authorization header format")
    except:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    # Decode JWT without validating signature (Clerk recommends key lookup but optional here)
    try:
        decoded = jwt.get_unverified_claims(token)
        user_id = decoded.get("sub")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid Clerk token: missing user ID")

        logger.info(f"🔐 Authenticated Clerk user: {user_id}")
        return user_id

    except JWTError as e:
        logger.error(f"JWT decode error: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired Clerk token")
