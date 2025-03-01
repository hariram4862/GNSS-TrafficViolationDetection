from flask import Flask, jsonify
import firebase_admin
from firebase_admin import credentials, firestore
import threading
import time
from datetime import datetime, timedelta
import pytz
import random
from twilio.rest import Client
from dotenv import load_dotenv
import os
app = Flask(__name__)

# Initialize Firebase Admin SDK
cred = credentials.Certificate("firebase_services.json")
firebase_admin.initialize_app(cred)
db = firestore.client()


# Fetch credentials from environment
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# IST Timezone
IST = pytz.timezone("Asia/Kolkata")

def get_current_ist_time():
    return datetime.now(IST)

def generate_unique_violation_id():
    """Generates a unique document ID in the format VID_XX (where XX is a random 2-digit number)."""
    while True:
        random_number = random.randint(10, 99)  # Generate a random 2-digit number
        doc_id = f"VID_{random_number}"
        
        # Use Firestore transaction to ensure uniqueness
        with db.transaction():
            doc_ref = db.collection("violation_details").document(doc_id)
            if not doc_ref.get().exists:
                return doc_id  # Return the unique document ID
def send_sms(phone, message):
    """Sends an SMS notification via Twilio."""
    try:
        client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=phone
        )
        print(f"✅ SMS sent to {phone}")
    except Exception as e:
        print(f"❌ Error sending SMS: {e}")

def get_phone_number(vehicle_no):
    """Fetch the phone number from Firestore based on vehicle_no."""
    users_ref = db.collection("user_details")
    query = users_ref.where("vehicle_no", "==", vehicle_no).stream()

    for doc in query:
        user_data = doc.to_dict()
        return user_data.get("phone")  # Returns phone number if found

    return None  # No matching vehicle number found

def check_geofence_violations():
    """Continuously checks for geofence violations based on entry_date_time."""
    while True:
        current_time = get_current_ist_time()
        geofence_ref = db.collection("geofence_entries").stream()

        for doc in geofence_ref:
            data = doc.to_dict()
            if "entry_date_time" in data:
                try:
                    # Parse entry_date_time as full datetime (YYYY-MM-DD HH:MM AM/PM)
                    entry_date_time = datetime.strptime(data["entry_date_time"], "%Y-%m-%d %I:%M %p")
                    entry_date_time = IST.localize(entry_date_time)  # Ensure correct timezone
                    
                    print(f"Current Time: {current_time.strftime('%Y-%m-%d %I:%M %p')}")
                    print(f"Fetched Entry Time: {entry_date_time.strftime('%Y-%m-%d %I:%M %p')}")

                    if entry_date_time > current_time:
                        print(f"Skipping future entry: {entry_date_time.strftime('%Y-%m-%d %I:%M %p')}")
                        continue

                    if (current_time - entry_date_time) > timedelta(minutes=2):
                        # Fetch required fields
                        geofence_name = data.get("name", "Unknown")
                        vehicle_no = data.get("vehicle_no", "Unknown")
                        lat = data.get("lat", "Unknown")
                        long = data.get("long", "Unknown")
                        
                        # Remove the document from geofence_entries
                        db.collection("geofence_entries").document(doc.id).delete()
                        print(f"Removed expired geofence entry for {vehicle_no}")

                        # Fetch the phone number from Firestore
                        phone_number = get_phone_number(vehicle_no)

                        # Generate a unique document ID
                        violation_doc_id = generate_unique_violation_id()
                        
                        # Ensure exit_date_time is included
                        violation_data = {
                            "name": geofence_name,
                            "vehicle_no": vehicle_no,
                            "entry_date_time": entry_date_time.strftime('%Y-%m-%d %I:%M %p'),
                            "type": "No Parking",
                            "exit_date_time": "Still active",  # Ensure this field is always set
                        }

                        # DEBUG PRINT to check before writing to Firestore
                        print(f"Logging Violation: {violation_doc_id} -> {violation_data}")

                        # Write to Firestore using specific document ID
                        db.collection("violation_details").document(violation_doc_id).set(violation_data)
                        print(f"Successfully logged violation {violation_doc_id} for {vehicle_no} in {geofence_name}")

                        # Send SMS if phone number is found
                        if phone_number:
                            message = (
                                f"Alert! Your vehicle {vehicle_no} is detected in a No Parking zone. "
                                f"For details, log in to https://gnsstechtitans.vercel.app/user_dashboard "
                            )
                            send_sms(phone_number,message)
                        else:
                            print(f"⚠️ No phone number found for vehicle {vehicle_no}")
                except ValueError as e:
                    print(f"Error parsing time for {doc.id}: {e}")

        time.sleep(1)  # Check every second

@app.route("/")
def home():
    return jsonify({"message": "Flask Server Running"})

if __name__ == "__main__":
    # check_geofence_violations() 
    threading.Thread(target=check_geofence_violations, daemon=True).start()
    app.run(host="0.0.0.0", port=8000, debug=True)