#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>
#include <TinyGPS++.h>

// WiFi Credentials
#define WIFI_SSID "Hari Ram"
#define WIFI_PASSWORD "11242004"

// Firebase Configuration
#define API_KEY "AIzaSyC4Imu4bB-JrIpiVIBmcOvtclVhyJqJE30"
#define FIREBASE_PROJECT_ID "traffic-violations-a8dc6"
#define DATABASE_URL "https://traffic-violations-a8dc6-default-rtdb.firebaseio.com/"
#define USER_EMAIL "hariramreddy6204@gmail.com"
#define USER_PASSWORD "123456"

// Firestore Document Path
#define DOCUMENT_PATH "user_details/ud_1"

// Firebase Objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// GPS Module Settings
#define RX_PIN 16   // GPS TX → ESP RX (Adjust according to your board)
#define TX_PIN 17   // GPS RX → ESP TX (Adjust according to your board)
#define BAUD_RATE 9600

TinyGPSPlus gps;
HardwareSerial gpsSerial(1); // Use UART1 for GPS

void readFirestore();
void updateFirestore(double lat, double lon);
void getGPSData();

void setup() {
    Serial.begin(57600);
    gpsSerial.begin(BAUD_RATE, SERIAL_8N1, RX_PIN, TX_PIN); // Start GPS UART

    // Connect to WiFi
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Connecting to WiFi...");
    while (WiFi.status() != WL_CONNECTED) {
        Serial.print(".");
        delay(1000);
    }
    Serial.println("\nConnected to WiFi!");

    // Configure Firebase
    config.api_key = API_KEY;
    config.database_url = DATABASE_URL;
    auth.user.email = USER_EMAIL;
    auth.user.password = USER_PASSWORD;

    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);

    // Wait for authentication
    Serial.print("Authenticating with Firebase...");
    while (auth.token.uid == "") {
        Serial.print(".");
        delay(1000);
    }
    Serial.println("\nAuthentication successful!");
}

void readFirestore() {
    Serial.println("Fetching Firestore Data...");

    if (Firebase.Firestore.getDocument(&fbdo, FIREBASE_PROJECT_ID, "", DOCUMENT_PATH)) {
        Serial.println("Firestore Document Retrieved!");

        DynamicJsonDocument doc(1024);
        deserializeJson(doc, fbdo.payload());

        String latitude = doc["fields"]["lat"]["stringValue"].as<String>();
        String longitude = doc["fields"]["long"]["stringValue"].as<String>();

        Serial.println("Stored Latitude: " + latitude);
        Serial.println("Stored Longitude: " + longitude);
    } else {
        Serial.println("Firestore Read Failed: " + fbdo.errorReason());
    }
}

void updateFirestore(double lat, double lon, double speed, String date, String time) {
    Serial.println("Updating Firestore Data...");

    String documentPath = DOCUMENT_PATH;
    String jsonStr = "{ \"fields\": { "
                     "\"lat\": { \"stringValue\": \"" + String(lat, 6) + "\" }, "
                     "\"long\": { \"stringValue\": \"" + String(lon, 6) + "\" }, "
                     "\"speed\": { \"doubleValue\": " + String(speed, 2) + " }, "
                     "\"date\": { \"stringValue\": \"" + date + "\" }, "
                     "\"time\": { \"stringValue\": \"" + time + "\" } } }";

    if (Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", documentPath, jsonStr, "lat,long,speed,date,time")) {
        Serial.println("Firestore Document Updated Successfully!");
    } else {
        Serial.println("Firestore Update Failed: " + fbdo.errorReason());
    }
}

String getFormattedDate() {
    String months[] = {"", "January", "February", "March", "April", "May", "June", 
                       "July", "August", "September", "October", "November", "December"};

    if (gps.date.isValid()) {
        int day = gps.date.day();
        int month = gps.date.month();
        int year = gps.date.year();
        return String(day) + " " + months[month] + ", " + String(year);
    }
    return "Invalid Date";
}

String getFormattedTime() {
    if (gps.time.isValid()) {
        int hour = gps.time.hour();
        int minute = gps.time.minute();
        int second = gps.time.second();

        // Convert UTC to IST (+5:30)
        minute += 30;
        hour += 5;

        if (minute >= 60) {
            minute -= 60;
            hour += 1;
        }
        if (hour >= 24) {
            hour -= 24; // Wrap around to next day if needed
        }

        String period = "AM";
        if (hour >= 12) {
            period = "PM";
            if (hour > 12) hour -= 12;
        } else if (hour == 0) {
            hour = 12;
        }

        return String(hour) + ":" + (minute < 10 ? "0" : "") + String(minute) + ":" + 
               (second < 10 ? "0" : "") + String(second) + " " + period;
    }
    return "Invalid Time";
}

void getGPSData() {
    Serial.println("Fetching GPS Data...");
    while (gpsSerial.available()) {
        gps.encode(gpsSerial.read());
    }

    if (gps.location.isUpdated()) {
        double latitude = gps.location.lat();
        double longitude = gps.location.lng();
        double speed = gps.speed.kmph(); // Speed in km/h

        String date = getFormattedDate();
        String time = getFormattedTime();

        Serial.print("Latitude: ");
        Serial.println(latitude, 6);
        Serial.print("Longitude: ");
        Serial.println(longitude, 6);
        Serial.print("Speed (km/h): ");
        Serial.println(speed, 2);
        Serial.print("Date: ");
        Serial.println(date);
        Serial.print("Time: ");
        Serial.println(time);

        // Update Firestore with GPS data
        updateFirestore(latitude, longitude, speed, date, time);
    } else {
        Serial.println("No GPS Fix Yet...");
    }
}

void loop() {
    getGPSData();
    delay(1000);  // Update GPS & Firestore every 5 seconds
}