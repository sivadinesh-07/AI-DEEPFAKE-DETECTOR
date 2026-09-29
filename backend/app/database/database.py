"""
Database initialization and session dependency.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database.models import Base

from sqlalchemy import event
from backend.app.utils.paths import DB_PATH

DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 15}
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA busy_timeout=15000")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
    # Ensure all columns exist in SQLite table (auto-migration)
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            result = conn.execute(text("PRAGMA table_info(analyses)"))
            existing_cols = {row[1] for row in result.fetchall()}
            if "frames_json" not in existing_cols:
                conn.execute(text("ALTER TABLE analyses ADD COLUMN frames_json JSON"))
                conn.commit()
    except Exception as e:
        print(f"[Warning] DB column verification: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
