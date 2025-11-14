"""
Simple JWT Authentication for Clerk
Decodes JWT token and extracts user ID.
Now with a DEV fallback that trusts ?user_id=... when no Authorization header is provided.
"""

import logging
from typing import Optional

from fastapi import Header, HTTPException, Request
from jose import jwt, JWTError

logger = logging.getLogger(__name__)


async def get_current_user_id(
    request: Request,
    authorization: Optional[str] = Header(None),
) -> str:
    """
    Normal path:
      - Expect Authorization: Bearer <Clerk JWT>
      - Decode token, return `sub` as user_id

    DEV fallback:
      - If no Authorization header, but request has ?user_id=...,
        trust that user_id (useful when frontend proxy isn't sending JWT yet).
    """

    # --- 1) Normal Clerk JWT path ---
    if authorization:
        try:
            parts = authorization.split(maxsplit=1)
            if len(parts) != 2:
                raise ValueError("Invalid header format")

            scheme, token = parts
            if scheme.lower() != "bearer":
                logger.error(f"❌ Invalid auth scheme: {scheme}")
                raise HTTPException(
                    status_code=401,
                    detail="Invalid Authorization header format",
                )

            logger.info(f"🔑 Decoding token (first 20 chars): {token[:20]}...")

            # Decode JWT without signature verification
            decoded = jwt.get_unverified_claims(token)

            # Extract user ID from 'sub' claim
            user_id = decoded.get("sub")

            if not user_id:
                logger.error("❌ No 'sub' (user ID) claim found in token")
                raise HTTPException(
                    status_code=401,
                    detail="Invalid token: missing user ID",
                )

            logger.info(f"✅ Authenticated user from JWT: {user_id}")
            return user_id

        except JWTError as e:
            logger.error(f"❌ JWT decode error: {e}")
            raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
        except HTTPException:
            # Already logged above
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error during authentication: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Authentication error: {e}",
            )

    # --- 2) DEV fallback: no Authorization, but user_id in query ---
    user_id_from_query = request.query_params.get("user_id")
    if user_id_from_query:
        logger.warning(
            f"⚠️ No Authorization header; using user_id from query param: {user_id_from_query} "
            "(DEV fallback – do not use this in public production)"
        )
        return user_id_from_query

    # --- 3) Neither present: reject ---
    logger.error("❌ No Authorization header and no user_id query param")
    raise HTTPException(status_code=401, detail="Missing Authorization header")
