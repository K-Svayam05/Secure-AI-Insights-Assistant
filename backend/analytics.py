import pandas as pd

def compute_kpis(df: pd.DataFrame) -> dict:
    """Computes key performance indicators from a dataframe."""
    # Placeholder for actual KPI logic
    return {
        "total_rows": len(df),
        "columns": list(df.columns)
    }
