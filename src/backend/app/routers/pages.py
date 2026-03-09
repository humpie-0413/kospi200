from fastapi import APIRouter, Request, Depends
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter()
templates = Jinja2Templates(directory="templates")


@router.get("/")
def index(request: Request):
    return templates.TemplateResponse("rankings.html", {"request": request})


@router.get("/rankings")
def rankings_page(request: Request):
    return templates.TemplateResponse("rankings.html", {"request": request})


@router.get("/backtest")
def backtest_page(request: Request):
    return templates.TemplateResponse("backtest.html", {"request": request})


@router.get("/admin")
def admin_page(request: Request):
    return templates.TemplateResponse("admin.html", {"request": request})


@router.get("/login")
def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})
