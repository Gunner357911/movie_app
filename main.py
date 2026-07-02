import streamlit as st

# import sqlite3
import pandas as pd
import psycopg2
import logging
from dotenv import load_dotenv
import os

load_dotenv()

logging.basicConfig(level=logging.INFO)


try:
    DB_URL = st.secrets["SUPABASE_DB_URL"]
except:
    DB_URL = os.getenv("SUPABASE_DB_URL")


conn = psycopg2.connect(DB_URL)

# conn = sqlite3.connect("mydb.db")
cursor = conn.cursor()


def check_password():
    st.title("Movie Rating App!")

    try:
        PASSWORD = st.secrets["app_password"]
    except Exception:
        PASSWORD = os.getenv("app_password")

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


def show_monthly():

    monthly = pd.read_sql_query(
        """with a as (
        select 
        name,
        extract(year from date) as year,
        extract(month from date) as month,
        extract(year from current_date) as cur_year,
        extract(month from current_date) as cur_month
        from movie_rating)

        select count(*) from a where year = cur_year and month = cur_month""",
        conn,
    )

    res = monthly.iloc[0, 0]

    st.metric(label="This month we have watched:", value=f"{res} movie(s)")


def show_quarterly():

    query = pd.read_sql_query(
        """with a as 
    (SELECT *, concat(
        EXTRACT(YEAR FROM date), '-',
        CASE
            WHEN EXTRACT(MONTH FROM date) BETWEEN 1 AND 3 THEN 'Q1'
            WHEN EXTRACT(MONTH FROM date) BETWEEN 4 AND 6 THEN 'Q2'
            WHEN EXTRACT(MONTH FROM date) BETWEEN 7 AND 9 THEN 'Q3'
            WHEN EXTRACT(MONTH FROM date) BETWEEN 10 AND 12 THEN 'Q4'
        END) AS quarter
    FROM movie_rating)

    select distinct(quarter), count(quarter) as movies_count 
    from a group by quarter order by quarter desc limit 1""",
        conn,
    )

    quar = query.iloc[0, 0]
    number = query.iloc[0, 1]

    st.metric(label=f"This quarter: {quar}", value=f"{number} movie(s)")


def show_quarterly_chart():
    df = pd.read_sql_query(
        """with a as
    (SELECT *, concat(
        EXTRACT(YEAR FROM date), '-',
        CASE
            WHEN EXTRACT(MONTH FROM date) BETWEEN 1 AND 3 THEN 'Q1'
            WHEN EXTRACT(MONTH FROM date) BETWEEN 4 AND 6 THEN 'Q2'
            WHEN EXTRACT(MONTH FROM date) BETWEEN 7 AND 9 THEN 'Q3'
            WHEN EXTRACT(MONTH FROM date) BETWEEN 10 AND 12 THEN 'Q4'
        END) AS quarter,
        EXTRACT(YEAR FROM date) AS year
    FROM movie_rating)

    select quarter, year, count(*) as movies_count
    from a group by quarter, year order by quarter""",
        conn,
    )

    if df.empty:
        return

    df["year"] = df["year"].astype(int)
    years = sorted(df["year"].unique(), reverse=True)

    st.subheader("Movies Watched by Quarter")
    selected_year = st.selectbox(
        "Filter year",
        years,
        index=None,
        placeholder="All years",
        key="quarterly_chart_year",
    )

    chart_df = df if selected_year is None else df[df["year"] == selected_year]

    st.bar_chart(chart_df.set_index("quarter")["movies_count"])


def show_highest_rated():
    df = pd.read_sql_query(
        "SELECT name, gun_score, team_score FROM movie_rating",
        conn
    )
    if df.empty:
        return

    # Calculate combined average score
    df["avg_score"] = df[["gun_score", "team_score"]].mean(axis=1)
    df = df.dropna(subset=["avg_score"])
    
    if df.empty:
        return
        
    max_score = df["avg_score"].max()
    highest_movies = df[df["avg_score"] == max_score]
    
    names = highest_movies["name"].tolist()
    
    if len(names) == 1:
        movie_title = names[0]
        header_text = "🏆 All Time Highest Rated Movie"
    else:
        movie_title = " & ".join(names)
        header_text = "🏆 All Time Co-Highest Rated Movies"
        
    st.markdown(
        f"""
        <div style="
            background: linear-gradient(135deg, #1e1e24 0%, #2a2a35 100%);
            padding: 24px;
            border-radius: 12px;
            border-left: 6px solid #FFD700;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            margin: 15px 0 25px 0;
            text-align: center;
        ">
            <span style="font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #FFD700; font-weight: bold;">
                {header_text}
            </span>
            <h1 style="margin: 10px 0 5px 0; color: #FFFFFF; font-family: 'Outfit', 'Inter', sans-serif; font-size: 32px; font-weight: 800; border-bottom: none;">
                {movie_title}
            </h1>
            <p style="margin: 0; color: #a0a0b0; font-size: 18px;">
                Average Score: <strong style="color: #FFD700; font-size: 22px;">{max_score:.1f}</strong> <span style="font-size: 14px; color: #707080;">/ 10</span>
            </p>
        </div>
        """,
        unsafe_allow_html=True
    )


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
                cursor.execute(
                    "INSERT INTO movie_rating (name, date, gun_score, team_score, comment) VALUES (%s, %s, %s, %s, %s)",
                    (movie, date, gun_score, team_score, comment),
                )
                conn.commit()
                # conn.close()
                st.success(f"Added: {movie}")
                st.session_state.show_form = False
    "--------------------"


# def del_table_data():
#     cursor.execute("""delete from movie_rating""")
#     conn.commit()
#     conn.close()


def log():
    st.header("History")
    df = pd.read_sql_query("SELECT * FROM movie_rating", conn)

    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    year = pd.read_sql_query(
        """
    SELECT DISTINCT EXTRACT(YEAR FROM date) AS year
    FROM movie_rating
    ORDER BY year DESC
    """,
        conn,
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


if not check_password():
    st.stop()

st.success("Welcome 🎉")
st.write("This is our app!")

left, right = st.columns(2)

with left:
    show_monthly()

with right:
    show_quarterly()

show_highest_rated()
show_quarterly_chart()

add_movie()
log()
update_log_with_form()
