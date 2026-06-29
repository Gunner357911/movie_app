import streamlit as st
import pandas as pd
import os
from dotenv import load_dotenv
import requests
import logging

logging.basicConfig(level=logging.INFO)

load_dotenv()

api_url = os.getenv("API_URL")


def check_password():
    st.title("Movie Rating App!")

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
                logging.info(date)

                res = requests.post(
                    f"{api_url}/add_movie",
                    json={
                        "movie": movie,
                        "date": date.isoformat(),
                        "gun_score": gun_score,
                        "team_score": team_score,
                        "comment": comment,
                    },
                )
                if res.status_code == 200:
                    st.success("Saved successfully!")
                else:
                    st.error(f"Error: {res.status_code}")

                st.success(f"Added: {movie}")
                st.session_state.show_form = False
    "--------------------"


def get_data():
    data = requests.get(f"{api_url}/show")
    data = data.json()
    return data


def log():
    df = pd.DataFrame(get_data())

    st.header("History")

    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    year = df["date"].dt.year.unique()

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

    movie_names = sorted(set(row["name"] for row in get_data()))

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

    if st.session_state.update_mode == "name":
        with st.form("update_name"):
            st.subheader("Update Movie Name")
            update_id = st.number_input("ID", step=1, value=None)
            update_movie_name = st.text_input("Movie Name")

            submitted = st.form_submit_button("Save")
            if submitted:
                requests.put(
                    f"{api_url}/update_movie",
                    json={"id": update_id, "movie": update_movie_name},
                )
                st.success("Updated ✅")
                st.session_state.update_mode = None

    if st.session_state.update_mode == "date":
        with st.form("update_date"):
            st.subheader("Update Date")
            update_movie = st.selectbox("Movie Name", movie_names, key="update_movie")
            update_date = st.date_input("date", key="update_date")

            submitted = st.form_submit_button("Save")
            if submitted:
                requests.put(
                    f"{api_url}/update_movie",
                    json={"filter_movie": update_movie, "date": str(update_date)},
                )
                st.success("Updated ✅")
                st.session_state.update_mode = None

    if st.session_state.update_mode == "gscore":
        with st.form("update_gscore"):
            st.subheader("Update Gun's Score")
            update_movie = st.selectbox("Movie Name", movie_names, key="update_movie")
            update_gun_score = st.slider("", 0, 10, key="update_gun_slide")

            submitted = st.form_submit_button("Save")
            if submitted:
                requests.put(
                    f"{api_url}/update_movie",
                    json={"filter_movie": update_movie, "gun_score": update_gun_score},
                )
                st.success("Updated ✅")
                st.session_state.update_mode = None

    if st.session_state.update_mode == "tscore":
        with st.form("update_tscore"):
            st.subheader("Update Team's Score")
            update_movie = st.selectbox("Movie Name", movie_names, key="update_movie")
            update_team_score = st.slider("", 0, 10, key="update_team_slide")

            submitted = st.form_submit_button("Save")
            if submitted:
                requests.put(
                    f"{api_url}/update_movie",
                    json={"filter_movie": update_movie, "team_score": update_team_score},
                )
                st.success("Updated ✅")
                st.session_state.update_mode = None

    if st.session_state.update_mode == "up_comment":
        st.subheader("Update Comment")
        update_movie = st.selectbox("Movie Name", movie_names, key="update_movie")
        update_comment = st.text_area("")

        if st.button("Save"):
            requests.put(
                f"{api_url}/update_movie",
                json={"filter_movie": update_movie, "comment": update_comment},
            )
            st.success("Updated ✅")
            st.session_state.update_mode = None


def avg_score_chart():
    st.header("Average Score by Month")
    data = requests.get(f"{api_url}/avg_score_by_month").json()
    df = pd.DataFrame(data)
    if df.empty:
        st.info("No data available.")
        return
    df = df.set_index("month")
    df.columns = ["Avg Score"]
    st.bar_chart(df)


add_movie()
avg_score_chart()
log()
update_log_with_form()
