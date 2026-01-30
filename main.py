import streamlit as st
import sqlite3
import pandas as pd

conn = sqlite3.connect("mydb.db")
cursor = conn.cursor()


def check_password():
    st.title("Movie Rating App!")

    PASSWORD = "gen"

    if "authenticated" not in st.session_state:
        st.session_state.authenticated = False

    if not st.session_state.authenticated:
        # st.text_input("Password", type="password", key="password")
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

        if st.button("Save Movie"):
            if len(movie) < 1:
                st.error("Invalid Movie Name")
                st.stop()
            else:
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS movie_rating (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        date DATE not null,
                        gun_score INTEGER,
                        team_score INTEGER
                    )
                    """
                )
                cursor.execute(
                    "INSERT INTO movie_rating (name, date, gun_score, team_score) VALUES (?, ?, ?, ?)",
                    (movie, date, gun_score, team_score),
                )
                conn.commit()
                # conn.close()
                st.success(f"Added: {movie}")
                st.session_state.show_form = False
    "--------------------"


# def drop_table():
#     cursor.execute("""delete from movie_rating""")
#     conn.commit()
#     conn.close()


def log():
    st.header("History")
    df = pd.read_sql_query(
        "SELECT name, date, gun_score, team_score FROM movie_rating", conn
    )

    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    year = pd.read_sql_query(
        "SELECT DISTINCT strftime('%Y', date) AS year FROM movie_rating", conn
    )
    year["year"] = year["year"].astype(int)
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


def update_log():
    # if "show_form" not in st.session_state:
    #     st.session_state.show_form = False

    if st.button("Update Data"):
        # st.session_state.show_form = True

        # if st.session_state.show_form:
        st.subheader("Movie Name")
        movie = st.text_input("Movie Name", key="update_movie")
        st.subheader("Date")
        date = st.date_input("date", key="update_date")
        st.subheader("Gun's Score")
        gun_score = st.slider("", 0, 10, key="update_gun_slide")
        st.subheader("Team's Score")
        team_score = st.slider("", 0, 10, key="update_team_slide")


add_movie()
log()
update_log()
