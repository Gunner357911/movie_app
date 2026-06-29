import psycopg2
from fastapi import FastAPI, Header, HTTPException, Depends
import os
from dotenv import load_dotenv
import pandas as pd
import logging
from datetime import date
from typing import Optional
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)

load_dotenv()

API_KEY = os.getenv("API_KEY")

def verify_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

app = FastAPI(dependencies=[Depends(verify_key)])

class Movie(BaseModel):
    movie: str
    date: date
    gun_score: int
    team_score: int
    comment: str

class Num(BaseModel):
    number: int

class MovieUpdate(BaseModel):
    id: Optional[int] = None
    filter_movie: Optional[str] = None
    movie: Optional[str] = None
    date: Optional[str] = None
    gun_score: Optional[int] = None
    team_score: Optional[int] = None
    comment: Optional[str] = None

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


@app.get("/avg_score_by_month")
def avg_score_by_month():
    conn = get_conn()
    df = pd.read_sql_query(
        """
        SELECT
            TO_CHAR(date, 'YYYY-MM') AS month,
            ROUND(AVG((gun_score + team_score) / 2.0)::numeric, 2) AS avg_score
        FROM movie_rating
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month
        """,
        conn,
    )
    conn.close()
    return df.to_dict(orient="records")


@app.put("/update_movie")
def update_movie(update: MovieUpdate):
    db_field_map = {"movie": "name", "date": "date", "gun_score": "gun_score", "team_score": "team_score", "comment": "comment"}
    fields = {db_field_map[k]: v for k, v in update.dict().items() if k in db_field_map and v is not None}
    if not fields:
        return {"message": "nothing to update"}

    conn = get_conn()
    cursor = conn.cursor()
    set_clause = ", ".join(f"{k} = %s" for k in fields)
    values = list(fields.values())

    if update.id is not None:
        cursor.execute(f"UPDATE movie_rating SET {set_clause} WHERE id = %s", values + [update.id])
    elif update.filter_movie is not None:
        cursor.execute(f"UPDATE movie_rating SET {set_clause} WHERE name = %s", values + [update.filter_movie])
    else:
        return {"message": "no filter provided (id or filter_movie required)"}

    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "updated"}


@app.post("/test_add_num")
async def add_number(data: Num):
    new_num = data.number * 2

    return {"result": new_num}