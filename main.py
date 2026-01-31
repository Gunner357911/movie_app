import streamlit as st
import sqlite3
import pandas as pd

conn = sqlite3.connect("mydb.db")
cursor = conn.cursor()


def check_password():
    st.title("Movie Rating App!")

    PASSWORD = st.secrets["app_password"]

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


# def del_table_data():
#     cursor.execute("""delete from movie_rating""")
#     conn.commit()
#     conn.close()


def log():
    st.header("History")
    df = pd.read_sql_query("SELECT * FROM movie_rating", conn)

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


# def update_log():
# if "update_show_form" not in st.session_state:
#     st.session_state.update_show_form = False

# col1, col2, col3, col4 = st.columns(4)
# with col1:
#     st.button("Update Name", key="update_name_button")
# with col2:
#     st.button("Update Date", key="update_date_button")
# with col3:
#     st.button("Update Gun's Score", key="update_gscore_button")
# with col4:
#     st.button("Update Team's Score", key="update_tscore_button")

# if (
#     st.session_state.update_name_button
#     or st.session_state.update_date_button
#     or st.session_state.update_gscore_button
#     or st.session_state.update_tscore_button
# ):
#     st.session_state.update_show_form = True
#     movie = pd.read_sql_query("SELECT DISTINCT name FROM movie_rating", conn)

# if st.session_state.update_show_form and st.session_state.update_name_button:

#     st.subheader("ID")
#     update_id = st.number_input("id", key="update_id", step=1, value=None)
#     st.subheader("Movie Name")
#     update_movie_name = st.text_input("Movie Name", key="update_movie_name")

#     if st.button("Save"):
#         cursor.execute(
#                 f"UPDATE movie_rating SET name = ? where id = ?",
#                 (update_movie_name, update_id)
#             )
#         conn.commit()
#         st.success("Updated ✅")

# if st.session_state.update_show_form and st.session_state.update_date_button:
#     st.subheader("Movie Name")
#     update_movie = st.selectbox("Movie Name", movie, key="update_movie")
#     st.subheader("Date")
#     update_date = st.date_input("date", key="update_date")
# st.subheader("Gun's Score")
# update_gun_score = st.slider("", 0, 10, key="update_gun_slide")
# st.subheader("Team's Score")
# update_team_score = st.slider("", 0, 10, key="update_team_slide")


def update_log_with_form():
    if "update_mode" not in st.session_state:
        st.session_state.update_mode = None

    movie = pd.read_sql_query("SELECT DISTINCT name FROM movie_rating", conn)

    col1, col2, col3, col4 = st.columns([1, 1, 1, 1])

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

    # ---------- UPDATE NAME ----------
    if st.session_state.update_mode == "name":
        with st.form("update_name"):
            st.subheader("Update Movie Name")
            update_id = st.number_input("ID", step=1, value=None)
            update_movie_name = st.text_input("Movie Name")

            submitted = st.form_submit_button("Save")
            if submitted:
                cursor.execute(
                    "UPDATE movie_rating SET name = ? WHERE id = ?",
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
                    "UPDATE movie_rating SET date = ? WHERE name = ?",
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
                    "UPDATE movie_rating SET gun_score = ? WHERE name = ?",
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
                    "UPDATE movie_rating SET team_score = ? WHERE name = ?",
                    (update_team_score, update_movie),
                )
                conn.commit()
                st.success("Updated ✅")
                st.session_state.update_mode = None



add_movie()
log()
update_log_with_form()
