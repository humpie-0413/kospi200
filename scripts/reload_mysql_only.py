"""MySQL만 리로드 (Docker 시작 후 실행)"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts.rebuild_panel_and_reasons import reload_mysql, verify_mysql

if __name__ == "__main__":
    reload_mysql()
    verify_mysql()
    print("MySQL reload complete.")
