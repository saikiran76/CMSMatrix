## Centralized AI based communication management system

### Login Creds
'''
Please Login using the below admin creds:
username (email): admin@example.com
password: admin123
'''

### Features
This centralized dashboard allows the admin or staff to manage the below:
- the infrastructure is there but limited to one platform. (Currentlt Matrix and Slack platforms are supported)
- Monitor multiple matrix chat rooms and slack channels
- AI-Powered Automation is happening: Analyze the conversations using Gemini AI's sentiment analysis
- track priorities of messages
- Get conversation summaries & insights

this has solid foundation with AI integration and UI.


### New Improvements: (16.12.24)
- system now fully integrates user chosen priority into data storage, retrieval, and display
- priority integration and stable data handling
- Messages now have a priority field stored in the database
-  sending a message, the chosen priority is included in the request and saved
-  When fetching messages, priority is returned to the frontend
-  user can choose which priorities to view, and can set a desired sending priority before posting a new message




### Sneak peek of the seamless dashboard:
![image](https://github.com/user-attachments/assets/418a7171-2fd9-46c5-a9c3-c47a9ffa082a)
![image](https://github.com/user-attachments/assets/f6922685-a2ae-415d-9eee-e07618452561)

### Note
Note: The backend has been deployed on a free tier deployment service (render), so it might take some time for the server to spin up after 15 minutes of inactivity

