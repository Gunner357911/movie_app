import psycopg2
from fastapi import FastAPI
import os
from dotenv import load_dotenv
import pandas as pd
import logging

logging.basicConfig(level=logging.INFO)

load_dotenv()

app = FastAPI()

def get_conn():
    db_url = os.getenv("SUPABASE_DB_URL") 
# or st.secrets["SUPABASE_DB_URL"]
    conn = psycopg2.connect(db_url)

    return conn

@app.get("/show")
def get_all_data():
    conn = get_conn()

    df = pd.read_sql_query("SELECT * FROM movie_rating", conn)

    return df.to_dict(orient="records")