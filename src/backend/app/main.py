from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging

from app.config import get_settings
from app.database import engine, Base
from app.routers import rankings, backtest, admin, auth, pages
from app.services.scheduler import start_scheduler, stop_scheduler, check_and_run_if_needed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit])


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting %s", settings.app_name)
    Base.metadata.create_all(bind=engine)
    if settings.scheduler_enabled:
        start_scheduler()
        check_and_run_if_needed()
    yield
    # Shutdown
    stop_scheduler()
    logger.info("Shutting down")


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.debug else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files & templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Routers
app.include_router(pages.router)
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(rankings.router, prefix="/api/rankings", tags=["rankings"])
app.include_router(backtest.router, prefix="/api/backtest", tags=["backtest"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404 and not request.url.path.startswith("/api/"):
        return templates.TemplateResponse("404.html", {"request": request}, status_code=404)
    if request.url.path.startswith("/api/"):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return templates.TemplateResponse("500.html", {"request": request}, status_code=exc.status_code)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error: %s", exc, exc_info=True)
    if request.url.path.startswith("/api/"):
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
    return templates.TemplateResponse("500.html", {"request": request}, status_code=500)
