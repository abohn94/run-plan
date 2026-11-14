# Run Plan data repository (template)

Copy everything in this folder into a new **private** GitHub repository, keeping the folders.

Then add these repository secrets (Settings → Secrets and variables → Actions):

| Secret | What it is | Needed for |
| --- | --- | --- |
| `GARMIN_PERSONAL_API_KEY` | Your Garmin Connect Personal API key | Hourly Garmin sync |
| `GARMIN_EMAIL` | Your Garmin Connect sign-in email | Watch workouts and Garmin metrics |
| `GARMIN_PASSWORD` | Your Garmin Connect password | Watch workouts and Garmin metrics |

Finally open the Run Plan app, go to **You → Garmin & sync**, and connect this repository with a fine-grained GitHub token that has Contents and Actions read/write access to it. The app creates `user/state.json` the first time it saves.

Your health data stays in your private repository. Nothing here is shared with anyone else.
