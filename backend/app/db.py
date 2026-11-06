
from sqlalchemy import inspect, text
from sqlmodel import SQLModel, Session, create_engine
from .config import DATABASE_URL

# Detect database type
IS_SQLITE = DATABASE_URL.startswith("sqlite")

# Configure database connection
connect_args = {"check_same_thread": False} if IS_SQLITE else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=not IS_SQLITE,
)

# Legacy SQLite schema migrations
NEW_COLUMNS = {
    "user": {
        "txn_limit": "FLOAT DEFAULT 100000",
        "prefs": "VARCHAR DEFAULT '{}'",
        "onboarded": "BOOLEAN DEFAULT 1",
        "user_type": "VARCHAR DEFAULT 'individual'",
        "monthly_income": "FLOAT DEFAULT 0",
        "monthly_revenue": "FLOAT DEFAULT 0",
        "monthly_spend": "FLOAT DEFAULT 0",
        "investments": "VARCHAR DEFAULT ''",
        "reset_hash": "VARCHAR DEFAULT ''",
        "reset_expires": "DATETIME",
    },
    "transaction": {
        "source": "VARCHAR DEFAULT 'bank'",
    },
    "beneficiary": {
        "upi_id": "VARCHAR DEFAULT ''",
        "phone": "VARCHAR DEFAULT ''",
    },
}


def migrate():
    """Apply legacy schema adjustments to SQLite only."""

    if not IS_SQLITE:
        return

    insp = inspect(engine)

    with engine.begin() as conn:
        for table, cols in NEW_COLUMNS.items():
            if not insp.has_table(table):
                continue

            have = {
                column["name"]
                for column in insp.get_columns(table)
            }

            for name, ddl in cols.items():
                if name not in have:
                    conn.execute(
                        text(
                            f'ALTER TABLE "{table}" ADD COLUMN {name} {ddl}'
                        )
                    )


def init_db():
    """Initialize SQLite automatically; PostgreSQL uses Alembic."""

    if IS_SQLITE:
        SQLModel.metadata.create_all(engine)
        migrate()


def get_session():
    with Session(engine) as session:
        yield session
