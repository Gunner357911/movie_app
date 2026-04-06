import streamlit as st

# import sqlite3
import pandas as pd
import psycopg2

import os
from dotenv import load_dotenv
import requests
import logging

logging.basicConfig(level=logging.INFO)

load_dotenv()

db_url = os.getenv("SUPABASE_DB_URL") 
# or st.secrets["SUPABASE_DB_URL"]
conn = psycopg2.connect(db_url)

# conn = sqlite3.connect("mydb.db")
cursor = conn.cursor()


def check_password():
    st.title("Movie Rating App!")

    PASSWORD = os.getenv("app_password") 
    # or st.secrets["app_password"]

    if "authenticated" not in st.session_state:
        st.session_state.authenticated = False

    if not st.session_state.authenticated:
        if st.text_input("Password", type="password", key="password"):
            if st.session_state.password == PASSWORD:
                st.session_state.authenticated = True
                st.rerun()
            else:
                st.error("Incorrect Password.")
        return False
    return True


if not check_password():
    st.stop()

st.success("Welcome 🎉")
st.write("This is our app!")


def add_movie():
    if "show_form" not in st.session_state:
        st.session_state.show_form = False

    if st.button("➕ Add Movie"):
        st.session_state.show_form = True

    if st.session_state.show_form:
        st.subheader("Movie Name")
        movie = st.text_input("Movie Name", key="movie")
        st.subheader("Date")
        date = st.date_input("date")
        st.subheader("Gun's Score")
        gun_score = st.slider("", 0, 10, key="gun_slide")
        st.subheader("Team's Score")
        team_score = st.slider("", 0, 10, key="team_slide")
        st.subheader("Comment")
        comment = st.text_area("Comment", key="comment")
        comment = str(comment)

        if st.button("Save Movie"):
            if len(movie) < 1:
                st.error("Invalid Movie Name")
                st.stop()
            else:
                cursor.execute(
                    """
                   CREATE TABLE IF NOT EXISTS movie_rating (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    date DATE NOT NULL,
                    gun_score INTEGER,
                    team_score INTEGER,
                    comment TEXT NOT NULL
                );
                    """
                )
                # cursor.execute(
                #     "INSERT INTO movie_rating (name, date, gun_score, team_score, comment) VALUES (%s, %s, %s, %s, %s)",
                #     (movie, date, gun_score, team_score, comment),
                # )
                # conn.commit()
                # conn.close()

                logging.info(date)

                res = requests.post("http://127.0.0.1:8000/add_movie", 
                              json={"movie": movie, 
                                    "date": date.isoformat(), #JSON doesn't understand datetime
                                    "gun_score": gun_score,
                                    "team_score": team_score,
                                    "comment": comment}
                                    )
                if res.status_code == 200:
                    st.success("Saved successfully!")
                else:
                    st.error(f"Error: {res.status_code}")

                st.success(f"Added: {movie}")
                st.session_state.show_form = False
    "--------------------"


# def del_table_data():
#     cursor.execute("""delete from movie_rating""")
#     conn.commit()
#     conn.close()


def get_data():
    data = requests.get("http://127.0.0.1:8000/show")

    #list of dict
    data = data.json()

    return data


def log():

    df = pd.DataFrame(get_data())

    st.header("History")

    # df = pd.read_sql_query("SELECT * FROM movie_rating", conn)

    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    # year = pd.read_sql_query(
    #     """
    # SELECT DISTINCT EXTRACT(YEAR FROM date) AS year
    # FROM movie_rating
    # ORDER BY year DESC
    # """,
    #     conn,
    # )

    year = df['date'].dt.year.unique()

    # year["year"] = year["year"].astype(int)

    if st.selectbox(
        "Filter year",
        year,
        placeholder="Select year...",
        index=None,
        key="filtered_year",
    ):
        filtered_year = st.session_state.filtered_year
        st.text("filtered")
        filtered_df = df[df["date"].dt.year == filtered_year]
        st.dataframe(filtered_df)
    else:
        st.dataframe(df)


def update_log_with_form():
    if "update_mode" not in st.session_state:
        st.session_state.update_mode = None

    movie = pd.read_sql_query("SELECT DISTINCT name FROM movie_rating", conn)

    col1, col2, col3, col4, col5 = st.columns([1, 1, 1, 1, 1])

    with col1:
        if st.button("Update Name", use_container_width=True):
            st.session_state.update_mode = "name"
    with col2:
        if st.button("Update Date", use_container_width=True):
            st.session_state.update_mode = "date"
    with col3:
        if st.button("Update Gun's Score", use_container_width=True):
            st.session_state.update_mode = "gscore"
    with col4:
        if st.button("Update Team's Score", use_container_width=True):
            st.session_state.update_mode = "tscore"
    with col5:
        if st.button("Update Comment", use_container_width=True):
            st.session_state.update_mode = "up_comment"

    # ---------- UPDATE NAME ----------
    if st.session_state.update_mode == "name":
        with st.form("update_name"):
            st.subheader("Update Movie Name")
            update_id = st.number_input("ID", step=1, value=None)
            update_movie_name = st.text_input("Movie Name")

            submitted = st.form_submit_button("Save")
            if submitted:
                cursor.execute(
                    "UPDATE movie_rating SET name = %s WHERE id = %s",
                    (update_movie_name, update_id),
                )
                conn.commit()
                st.success("Updated ✅")
                st.session_state.update_mode = None

    if st.session_state.update_mode == "date":
        with st.form("update_date"):
            st.subheader("Update Date")
            update_movie = st.selectbox("Movie Name", movie, key="update_movie")
            update_date = st.date_input("date", key="update_date")

            submitted = st.form_submit_button("Save")
            if submitted:
                cursor.execute(
                    "UPDATE movie_rating SET date = %s WHERE name = %s",
                    (update_date, update_movie),
                )
                conn.commit()
                st.success("Updated ✅")
                st.session_state.update_mode = None

    if st.session_state.update_mode == "gscore":
        with st.form("update_gscore"):
            st.subheader("Update Gun's Score")
            update_movie = st.selectbox("Movie Name", movie, key="update_movie")
            update_gun_score = st.slider("", 0, 10, key="update_gun_slide")

            submitted = st.form_submit_button("Save")
            if submitted:
                cursor.execute(
                    "UPDATE movie_rating SET gun_score = %s WHERE name = %s",
                    (update_gun_score, update_movie),
                )
                conn.commit()
                st.success("Updated ✅")
                st.session_state.update_mode = None

    if st.session_state.update_mode == "tscore":
        with st.form("update_tscore"):
            st.subheader("Update Team's Score")
            update_movie = st.selectbox("Movie Name", movie, key="update_movie")
            update_team_score = st.slider("", 0, 10, key="update_team_slide")

            submitted = st.form_submit_button("Save")
            if submitted:
                cursor.execute(
                    "UPDATE movie_rating SET team_score = %s WHERE name = %s",
                    (update_team_score, update_movie),
                )
                conn.commit()
                st.success("Updated ✅")
                st.session_state.update_mode = None

    if st.session_state.update_mode == "up_comment":
        # with st.form("update_comment"):
        st.subheader("Update Comment")
        update_movie = st.selectbox("Movie Name", movie, key="update_movie")
        update_comment = st.text_area("")

        # submitted = st.form_submit_button("Save")
        # if submitted:
        if st.button("Save"):
            cursor.execute(
                "UPDATE movie_rating SET comment = %s WHERE name = %s",
                (update_comment, update_movie),
            )
            conn.commit()
            st.success("Updated ✅")
            st.session_state.update_mode = None


add_movie()
log()
update_log_with_form()
