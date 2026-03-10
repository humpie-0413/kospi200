from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "KOSPI200 Ranking Service"
    debug: bool = False

    # DB
    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = ""
    db_name: str = "kospi200"
    db_pool_size: int = 5
    db_max_overflow: int = 10

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = 60
    jwt_refresh_expire_days: int = 7

    # Pipeline
    pipeline_config_path: str = ""
    pipeline_base_dir: str = ""
    pipeline_project_root: str = ""
    ticker_name_mapping_path: str = "ticker_name_mapping.json"

    # Scheduler
    scheduler_enabled: bool = True
    scheduler_hour: int = 6
    scheduler_minute: int = 0

    # Naver Search API
    naver_client_id: str = ""
    naver_client_secret: str = ""

    # CORS
    allowed_origins: str = "http://localhost:5173,http://localhost:8000"

    # Rate Limiting
    rate_limit: str = "60/minute"

    # AI Analysis APIs
    gemini_api_key: str = ""
    groq_api_key: str = ""

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
            "?charset=utf8mb4"
        )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
