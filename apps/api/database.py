import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from apps.api.config import settings

# Determine if we are using SQLite vs PostgreSQL
IS_SQLITE = settings.DATABASE_URL.startswith("sqlite")

connect_args = {}
if IS_SQLITE:
    # Essential for SQLite running under a multi-threaded web server like FastAPI
    connect_args["check_same_thread"] = False

try:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True
    )
    # Test connection
    with engine.connect() as conn:
        pass
except Exception as e:
    # If connection fails (e.g. Postgres not running), print error and fallback to SQLite
    print(f"Database connection failed: {e}. Falling back to SQLite.", file=sys.stderr)
    settings.DATABASE_URL = "sqlite:///./nexora.db"
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
