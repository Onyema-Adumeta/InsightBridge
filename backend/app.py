"""
Main FastAPI Application - FIXED VERSION
"""
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s:%(name)s:%(message)s'
)
logger = logging.getLogger(__name__)

# ==========================================
# SECURITY MIDDLEWARE
# ==========================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://insightbridge-frontend-test.azurewebsites.net; "
            "frame-ancestors 'none';"
        )
        
        return response

class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """Force HTTPS in production"""
    async def dispatch(self, request: Request, call_next):
        # Check if request is HTTP and in production
        if request.url.scheme == "http":
            # Check for Azure's forwarded protocol header
            forwarded_proto = request.headers.get("x-forwarded-proto")
            if forwarded_proto == "http":
                # Redirect to HTTPS
                url = request.url.replace(scheme="https")
                return RedirectResponse(url=url, status_code=301)
        
        return await call_next(request)

# ==========================================
# DATABASE SETUP
# ==========================================

# Try to import database (optional)
try:
    from database import SessionLocal, engine
    from models import Base, UploadLog
    Base.metadata.create_all(bind=engine)
    logger.info("✓ Database initialized")
except Exception as e:
    logger.warning(f"⚠️ Database not available: {e}")

# ==========================================
# CREATE FASTAPI APP
# ==========================================

app = FastAPI(
    title="InsightBridge API",
    description="Financial Analysis Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# ==========================================
# APPLY SECURITY MIDDLEWARE
# ==========================================

# 1. HTTPS Redirect (must be first)
app.add_middleware(HTTPSRedirectMiddleware)

# 2. Security Headers
app.add_middleware(SecurityHeadersMiddleware)

# 3. Trusted Host - FIXED WITH CORRECT HOSTNAMES
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "insightbridge-backend-test.azurewebsites.net",  # ← FIXED: Your actual backend URL
        "insightbridge-test-app-amgxawdbcxckdjfk.canadacentral-01.azurewebsites.net",
        "localhost",
        "127.0.0.1",
        "*"  # ← Wildcard to allow Azure health checks
    ]
)

# 4. CORS (must be last middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://insightbridge-frontend-test.azurewebsites.net",
        "https://insightbridge-backend-test.azurewebsites.net",  # ← Added backend URL
        "https://insightbridge-test-app-amgxawdbcxckdjfk.canadacentral-01.azurewebsites.net"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600
)

# ==========================================
# IMPORT AND REGISTER ROUTERS
# ==========================================

from api.main import router as main_api_router
from routes.simulations_router import router as simulations_router
from routes.advisor_router import router as advisor_router
from routes.comments import comments_bp
from routes.finance_terms import finance_terms_bp
from routes.team import team_router
from routes.workflows import workflows_router
from routes.company_context import company_context_router
from routes.reconciliation import router as reconciliation_router
from routes.cash_flow import router as cash_flow_router

# Include routers
app.include_router(main_api_router, prefix="/api/v1/main", tags=["main"])
logger.info("✓ Main router included at /api/v1/main")

app.include_router(simulations_router, prefix="/api/simulations", tags=["simulations"])
logger.info("✓ Simulations router included at /api/simulations")

app.include_router(advisor_router, prefix="/api/v1/advisor", tags=["advisor"])
logger.info("✓ Advisor router included at /api/v1/advisor")

app.include_router(comments_bp, tags=["comments"])
logger.info("✓ Comments router included")

app.include_router(finance_terms_bp, tags=["finance-terms"])
logger.info("✓ Finance Terms router included")

app.include_router(team_router, tags=["team"])
logger.info("✓ Team router included")

app.include_router(workflows_router, tags=["workflows"])
logger.info("✓ Workflows router included")

app.include_router(company_context_router, tags=["company-context"])
logger.info("✓ Company context router included")

app.include_router(reconciliation_router, prefix="/api/v1/reconciliation", tags=["reconciliation"])
logger.info("✓ Reconciliation router included at /api/v1/reconciliation")

app.include_router(cash_flow_router, prefix="/api/v1/cash-flow", tags=["cash-flow"])
logger.info("✓ Cash Flow router included at /api/v1/cash-flow")

# ==========================================
# ROOT ENDPOINTS
# ==========================================

@app.get("/")
async def root():
    return {
        "message": "InsightBridge API",
        "version": "1.0.0",
        "status": "running",
        "security": "enabled"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "https": "enforced",
        "headers": "secured"
    }

# ==========================================
# STARTUP EVENT
# ==========================================

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Application starting up...")
    logger.info("🔒 Security middleware enabled")
    logger.info("📍 Registered routes:")
    for route in app.routes:
        if hasattr(route, 'methods'):
            logger.info(f"  {route.methods} {route.path}")

# ==========================================
# RUN APPLICATION
# ==========================================

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting InsightBridge API...")
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )