"""
Main FastAPI Application
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s:%(name)s:%(message)s'
)
logger = logging.getLogger(__name__)

# Try to import database (optional)
try:
    from database import SessionLocal, engine
    from models import Base, UploadLog
    Base.metadata.create_all(bind=engine)
    logger.info("✓ Database initialized")
except Exception as e:
    logger.warning(f"⚠️ Database not available: {e}")

# Create FastAPI app FIRST
app = FastAPI(
    title="InsightBridge API",
    description="Financial Analysis Platform",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000",  "https://insightbridge-frontend-test.azurewebsites.net", "https://insightbridge-test-app-amgxawdbcxckdjfk.canadacentral-01.azurewebsites.net"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NOW import and register routers AFTER app is created
from api.main import router as main_api_router
from routes.simulations_router import router as simulations_router
from routes.advisor_router import router as advisor_router
from routes.comments import comments_bp
from routes.finance_terms import finance_terms_bp
from routes.team import team_router
from routes.workflows import workflows_router
from routes.company_context import company_context_router
from routes.reconciliation import router as reconciliation_router

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

# Root endpoints
@app.get("/")
async def root():
    return {
        "message": "InsightBridge API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Application starting up...")
    logger.info("📍 Registered routes:")
    for route in app.routes:
        if hasattr(route, 'methods'):
            logger.info(f"  {route.methods} {route.path}")

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting InsightBridge API...")
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)