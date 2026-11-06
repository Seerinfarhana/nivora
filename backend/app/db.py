from sqlalchemy import inspect, text
from sqlmodel import SQLModel, Session, create_engine
from .config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Columns added after the first release. SQLite cannot add them automatically,
# so init_db() adds any that are missing and your existing nivora.db keeps working.
NEW_COLUMNS = {
    "user": {
        "txn_limit": "FLOAT DEFAULT 100000", "prefs": "VARCHAR DEFAULT '{}'",
        "onboarded": "BOOLEAN DEFAULT 1",  # customers that already exist are treated as onboarded
        "user_type": "VARCHAR DEFAULT 'individual'", "monthly_income": "FLOAT DEFAULT 0",
        "monthly_revenue": "FLOAT DEFAULT 0", "monthly_spend": "FLOAT DEFAULT 0",
        "investments": "VARCHAR DEFAULT ''", "reset_hash": "VARCHAR DEFAULT ''", "reset_expires": "DATETIME",
    },
    "transaction": {"source": "VARCHAR DEFAULT 'bank'"},
    "beneficiary": {"upi_id": "VARCHAR DEFAULT ''", "phone": "VARCHAR DEFAULT ''"},
}


def migrate():
    insp = inspect(engine)
    with engine.begin() as conn:
        for table, cols in NEW_COLUMNS.items():
            if not insp.has_table(table):
                continue
            have = {c["name"] for c in insp.get_columns(table)}
            for name, ddl in cols.items():
                if name not in have:
                    conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN {name} {ddl}'))


def init_db():
    SQLModel.metadata.create_all(engine)
    migrate()


def get_session():
    with Session(engine) as session:
        yield session
