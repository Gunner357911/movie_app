import psycopg2
from fastapi import FastAPI
import os
from dotenv import load_dotenv
import pandas as pd
import logging
from datetime import date
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)

load_dotenv()

app = FastAPI()

class Movie(BaseModel):
    movie: str
    date: date
    gun_score: int
    team_score: int
    comment: str

class Num(BaseModel):
    number: int

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


@app.post("/add_movie")
def add_movie(data: Movie):

    conn = get_conn()

    cursor = conn.cursor()

    cursor.execute(
                    "INSERT INTO movie_rating (name, date, gun_score, team_score, comment) VALUES (%s, %s, %s, %s, %s)",
                    (data.movie, data.date, data.gun_score, data.team_score, data.comment),
                )
    
    conn.commit()
    cursor.close()
    conn.close()


@app.post("/test_add_num")
async def add_number(data: Num):
    new_num = data.number * 2

    return {"result": new_num}