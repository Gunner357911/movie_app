# 🎬 Movie Rating App

This is a small personal project I built to use with **two friends**.  
The main purpose of this app is to **keep track of movie ratings** that we give together.

This project is mainly for **learning and practice**.  
I’m still a **beginner developer**, so the code may not be perfect, but it works for our use case 🙂

---

## ✨ What this app does

- Add a movie with a date
- Each person can give their own score
- One score can be added first, the other can be updated later
- **Reminds us to rate**: movies we've watched but haven't scored show up at the top, with one-tap scoring
- **Adds movies by itself**: after buying a ticket on Major Cineplex, the confirmation email in Gmail is picked up and the movie (with its poster) appears in the app
- Rewatching a movie doesn't create a duplicate
- View rating history with posters, stats, a quarterly chart and our biggest disagreements
- Edit data directly from the UI

---

## 🛠 Tech Stack

- **React + Vite + TypeScript** (UI, in [`web/`](web/), deployed on Netlify)
- **Supabase** (Postgres database, login, poster storage)
- **Google Apps Script** (reads Major Cineplex ticket emails)
- **Python + Streamlit + Pandas** (the original version, `main.py`, kept for reference)

Setup and deployment steps are in [`web/README.md`](web/README.md).

---

## 👥 Who is this for?

This app is:
- Designed for **a small group of friends**
- Not meant for public or large-scale use
- Not production-grade

It’s just a simple app to make movie nights more fun 😄

---

## ⚠️ Disclaimer

- This is a beginner project
- Code structure and best practices may not be perfect
- Security is kept simple and intended only for private use (login for 3 people, protected by Supabase Row Level Security)

---

## 🚀 Why I built this

I wanted to:
- Practice Python and Streamlit, then React
- Learn how to use SQL (Supabase) with a real app
- Build something fun that I can actually use with friends

---

Thanks for checking it out!
