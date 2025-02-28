from flask import Flask, jsonify
import firebase_admin
from firebase_admin import credentials, firestore
import threading
import time
from shapely.geometry import Point, Polygon

app = Flask(__name__)

# Initialize Firebase Admin SDK
cred = credentials.Certificate("firebase_api.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

def parse_location(loc_str):
    """Convert location string 'lat,long' to a tuple (lat, long)."""
    lat, long = map(float, loc_str.split(","))
    return lat, long

def get_no_parking_zones():
    """Fetch all no parking zones and return them as a list of polygons."""
    zones = []
    no_parking_ref = db.collection("no_parking").stream()
    
    for doc in no_parking_ref:
        data = doc.to_dict()
        if all(key in data for key in ["c1", "c2", "c3", "c4"]):
            polygon_points = [parse_location(data[key]) for key in ["c1", "c2", "c3", "c4"]]
            zones.append(Polygon(polygon_points))
    
    return zones

def check_parking_violation():
    """Continuously check if user location falls inside a no parking zone."""
    while True:
        no_parking_zones = get_no_parking_zones()
        users_ref = db.collection("user_details").stream()
        
        for doc in users_ref:
            user_data = doc.to_dict()
            if "loc" in user_data:
                user_point = Point(parse_location(user_data["loc"]))
                
                for zone in no_parking_zones:
                    if zone.contains(user_point):
                        print(f"Violation detected for {user_data['vehicle_no']}")
                        log_violation(user_data)
                        break  # No need to check further if already in violation

        time.sleep(5)  # Check every 5 seconds

def log_violation(user_data):
    """Log the parking violation in violation_details collection."""
    violation_ref = db.collection("violation_details").document()
    violation_ref.set({
        "vehicle_no": user_data.get("vehicle_no", "Unknown"),
        "phone": user_data.get("phone", "Unknown"),
        "location": user_data.get("loc", "Unknown"),
        "date_time": user_data.get("date_time", "Unknown"),
        "violation_type": "No Parking"
    })
    print(f"Violation logged for {user_data['vehicle_no']}")

@app.route("/")
def home():
    return jsonify({"message": "Flask Server Running"})

if __name__ == "__main__":
    threading.Thread(target=check_parking_violation, daemon=True).start()
    app.run(debug=True)
