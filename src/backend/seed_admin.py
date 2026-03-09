"""관리자 초기 계정 생성 스크립트.

Usage: python seed_admin.py <username> <password>
"""
import sys
import bcrypt

from app.database import engine, Base, SessionLocal
from app.models.user import User


def create_admin(username: str, password: str):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            print(f"User '{username}' already exists.")
            return

        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        user = User(username=username, hashed_password=hashed, is_admin=True)
        db.add(user)
        db.commit()
        print(f"Admin user '{username}' created.")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python seed_admin.py <username> <password>")
        sys.exit(1)
    create_admin(sys.argv[1], sys.argv[2])
