import tkinter as tk
from tkinter import Label
from PIL import Image, ImageTk
import cv2
import numpy as np
import firebase_admin
from firebase_admin import credentials, db
from pyzbar.pyzbar import decode
from datetime import datetime
import pytz  # For timezone handling

# Initialize Firebase Admin SDK
cred = credentials.Certificate('/home/pi/Desktop/trial-b04e6-firebase-adminsdk-sztaf-9ea51d1063.json')
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://trial-b04e6-default-rtdb.firebaseio.com'
})

# Function to format email for Firebase query
def format_email_for_firebase(email):
    return email.replace('.', '_')

# Function to fetch user data from Firebase
def get_user_data(email):
    formatted_email = format_email_for_firebase(email)
    ref = db.reference(f'users/{formatted_email}')
    try:
        user_data = ref.get()
        return user_data
    except Exception as e:
        print(f"Error fetching user data: {e}")
        return None

# Function to log attendance in Firebase
def log_attendance(email):
    india_tz = pytz.timezone('Asia/Kolkata')
    current_time = datetime.now(india_tz)
    date_str = current_time.strftime('%Y-%m-%d')
    time_str = current_time.strftime('%H:%M:%S')
    cutoff_time = current_time.replace(hour=9, minute=45, second=0, microsecond=0)
    status = 'late' if current_time > cutoff_time else 'present'
    attendance_ref = db.reference(f'attendance/{format_email_for_firebase(email)}/{date_str}')
    existing_attendance = attendance_ref.get()
    if existing_attendance:
        return "Attendance already recorded"
    else:
        attendance_data = {
            'date': date_str,
            'time': time_str,
            'status': status,
            'name': email
        }
        try:
            attendance_ref.set(attendance_data)
            return f"Attendance logged for {email}. Status: {status}"
        except Exception as e:
            return f"Error logging attendance: {e}"

# Function to decode QR code and match UID
def process_qr_code(frame):
    decoded_objects = decode(frame)
    for obj in decoded_objects:
        qr_data = obj.data.decode('utf-8')
        try:
            parts = qr_data.split(', UID: ')
            email = parts[0].replace('Email: ', '')
            qr_uid = parts[1]
        except (IndexError, ValueError):
            return "QR code data format is incorrect."
        user_data = get_user_data(email)
        if user_data:
            jumbled_uid = user_data.get('jumbledUid')
            if jumbled_uid:
                if qr_uid == jumbled_uid:
                    return log_attendance(email)
                else:
                    return "UID did not match"
            else:
                return "No jumbledUid found for the user."
        else:
            return "User not found."
    return "No QR code detected"

# Function to show alert message
def show_alert(message):
    alert_window = tk.Toplevel(window)
    alert_window.title("Alert")
    alert_window.geometry("250x100")
    alert_window.configure(bg="white")
    
    alert_label = tk.Label(alert_window, text=message, font=('Helvetica', 12), bg="white", fg="black")
    alert_label.pack(expand=True)
    
    # Automatically close the alert window after 3 seconds
    alert_window.after(3000, alert_window.destroy)

# Function to update the GUI
def update_gui():
    ret, frame = cap.read()
    if not ret:
        status_text.set("Failed to grab frame")
        return
    
    if frame is None or not isinstance(frame, np.ndarray):
        status_text.set("Invalid frame captured")
        return

    try:
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = Image.fromarray(frame_rgb)
        imgtk = ImageTk.PhotoImage(image=img)
        camera_label.imgtk = imgtk
        camera_label.configure(image=imgtk)
        
        status = process_qr_code(frame)
        status_text.set(status)
        
        # Show alert if attendance is logged or already recorded
        if "Attendance logged" in status or "Attendance already recorded" in status:
            show_alert(status)
    except Exception as e:
        status_text.set(f"Error processing frame: {e}")
    
    window.after(10, update_gui)

# Initialize the GUI
window = tk.Tk()
window.title("QR Code Attendance System")
window.geometry("480x320")

# Create the camera feed frame
camera_frame = tk.Frame(window, width=320, height=320)
camera_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=False)
camera_label = tk.Label(camera_frame)
camera_label.pack()

# Create the status text frame
status_frame = tk.Frame(window, width=160, height=320)
status_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=False)
status_text = tk.StringVar()
status_label = tk.Label(status_frame, textvariable=status_text, font=('Helvetica', 10), anchor='center', justify='center')
status_label.pack(expand=True)

# Open camera and start updating the GUI
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    status_text.set("Error: Could not open video stream.")
else:
    update_gui()
    
window.mainloop()
