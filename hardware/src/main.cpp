#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>
#include <TinyGPS++.h>



#include <vector>

// WiFi Credentials
#define WIFI_SSID "Hari Ram"
#define WIFI_PASSWORD "11242004"

// Firebase Configuration
#define API_KEY "AIzaSyC4Imu4bB-JrIpiVIBmcOvtclVhyJqJE30"
#define FIREBASE_PROJECT_ID "traffic-violations-a8dc6"
#define DATABASE_URL "https://traffic-violations-a8dc6-default-rtdb.firebaseio.com/"
#define USER_EMAIL "hariramreddy6204@gmail.com"
#define USER_PASSWORD "123456"

// Firestore Collection Paths
#define GEOFENCE_ENTRIES_COLLECTION "geofence_entries"
#define VIOLATION_COLLECTION "violation_details"
#define NO_PARKING_COLLECTION "no_parking"

// Firebase Objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// GPS Module Settings
#define RX_PIN 16 // GPS TX → ESP RX
#define TX_PIN 17 // GPS RX → ESP TX
#define BAUD_RATE 9600

TinyGPSPlus gps;
HardwareSerial gpsSerial(1); // UART1 for GPS

// Store no-parking zones
struct Geofence
{
    float c1_lat, c1_lon, c2_lat, c2_lon, c3_lat, c3_lon, c4_lat, c4_lon;
    String name;
};
std::vector<Geofence> geofences;

// Store last known status
bool insideGeofence = false;
String activeGeofence = "";
String entryDateTime = "";
String vehicleNo = "TN19S4105";

void fetchGeofences(); // Declare function before setup()

void setup()
{
    Serial.begin(57600);
    gpsSerial.begin(BAUD_RATE, SERIAL_8N1, RX_PIN, TX_PIN);

    // Connect to WiFi
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Connecting to WiFi...");
    while (WiFi.status() != WL_CONNECTED)
    {
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
    Serial.println("\nAuthentication successful!");

    fetchGeofences();
}

void parseCoordinates(String coord, float &lat, float &lon)
{
    int commaIndex = coord.indexOf(',');
    if (commaIndex != -1)
    {
        lat = coord.substring(0, commaIndex).toFloat();
        lon = coord.substring(commaIndex + 1).toFloat();
    }
}

void fetchGeofences()
{
    Serial.println("Fetching geofences from Firestore...");
    if (Firebase.Firestore.getDocument(&fbdo, FIREBASE_PROJECT_ID, "", NO_PARKING_COLLECTION))
    {
        DynamicJsonDocument doc(4096);
        deserializeJson(doc, fbdo.payload().c_str());
        JsonObject fields = doc["fields"];

        for (JsonPair kv : fields)
        {
            JsonObject geoData = kv.value().as<JsonObject>();
            Geofence gf;
            parseCoordinates(geoData["c1"].as<String>(), gf.c1_lat, gf.c1_lon);
            parseCoordinates(geoData["c2"].as<String>(), gf.c2_lat, gf.c2_lon);
            parseCoordinates(geoData["c3"].as<String>(), gf.c3_lat, gf.c3_lon);
            parseCoordinates(geoData["c4"].as<String>(), gf.c4_lat, gf.c4_lon);
            gf.name = geoData["name"].as<String>();

            geofences.push_back(gf);
        }
        Serial.println("Geofences updated!");
    }
    else
    {
        Serial.println("Failed to retrieve geofences: " + fbdo.errorReason());
    }
}
String getDateAndTime()
{
    if (gps.date.isValid() && gps.time.isValid())
    {
        int hour = gps.time.hour();
        int minute = gps.time.minute();
        int day = gps.date.day();
        int month = gps.date.month();
        int year = gps.date.year();

        // Convert to IST (UTC +5:30)
        minute += 30;
        if (minute >= 60)
        {
            minute -= 60;
            hour += 1;
        }
        hour += 5;
        if (hour >= 24)
        {
            hour -= 24;
            day += 1; // Increment day (handling month/year rollover not included)
        }

        bool isAM = (hour < 12);
        char buffer[25];
        sprintf(buffer, "%04d-%02d-%02d %02d:%02d %s", year, month, day, (hour % 12 == 0) ? 12 : hour % 12, minute, isAM ? "AM" : "PM");
        return String(buffer);
    }
    return "Unknown";
}

bool isInsideGeofence(double lat, double lon)
{
    for (auto &geo : geofences)
    {
        int count = 0;
        if ((geo.c1_lat > lat) != (geo.c2_lat > lat) && lon < (geo.c2_lon - geo.c1_lon) * (lat - geo.c1_lat) / (geo.c2_lat - geo.c1_lat) + geo.c1_lon)
            count++;
        if ((geo.c2_lat > lat) != (geo.c3_lat > lat) && lon < (geo.c3_lon - geo.c2_lon) * (lat - geo.c2_lat) / (geo.c3_lat - geo.c2_lat) + geo.c2_lon)
            count++;
        if ((geo.c3_lat > lat) != (geo.c4_lat > lat) && lon < (geo.c4_lon - geo.c3_lon) * (lat - geo.c3_lat) / (geo.c4_lat - geo.c3_lat) + geo.c3_lon)
            count++;
        if ((geo.c4_lat > lat) != (geo.c1_lat > lat) && lon < (geo.c1_lon - geo.c4_lon) * (lat - geo.c4_lat) / (geo.c1_lat - geo.c4_lat) + geo.c4_lon)
            count++;

        if (count % 2 == 1)
        {
            activeGeofence = geo.name;
            return true;
        }
    }
    return false;
}

void checkGeofence(double lat, double lon, String date_time)
{
    if (isInsideGeofence(lat, lon))
    {
        if (!insideGeofence)
        {
            insideGeofence = true;
            entryDateTime = date_time;
            String jsonStr = "{ \"fields\": {"
                             "\"name\": { \"stringValue\": \"" +
                             activeGeofence + "\" },"
                                              "\"vehicle_no\": { \"stringValue\": \"" +
                             vehicleNo + "\" },"
                                         "\"entry_date_time\": { \"stringValue\": \"" +
                             entryDateTime + "\" },"
                                             "\"lat\": { \"stringValue\": \"" +
                             String(lat, 6) + "\" },"
                                              "\"long\": { \"stringValue\": \"" +
                             String(lon, 6) + "\" }"
                                              "} }";

            Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", GEOFENCE_ENTRIES_COLLECTION, jsonStr);
            Serial.println("Entered geofence: " + activeGeofence);
        }
    }
    else
    {
        if (insideGeofence)
        {
            insideGeofence = false;

            // Construct the query
            String query = String(GEOFENCE_ENTRIES_COLLECTION) +
                           "?where=vehicle_no='" + vehicleNo +
                           "' AND name='" + activeGeofence +
                           "' AND entry_date_time='" + entryDateTime + "'";

            // Attempt to delete the document from geofence_entries
            if (Firebase.Firestore.deleteDocument(&fbdo, FIREBASE_PROJECT_ID, "", query))
            {
                Serial.println("Exited geofence. Removed all matching documents.");
            }
            else
            {
                Serial.println("Document not found in geofence_entries, checking violation_details...");

                // Query to check if the document exists in violation_details
                String violationQuery = String(VIOLATION_COLLECTION) +
                                        "?where=vehicle_no='" + vehicleNo +
                                        "' AND name='" + activeGeofence +
                                        "' AND entry_date_time='" + entryDateTime + "'";

                if (Firebase.Firestore.getDocument(&fbdo, FIREBASE_PROJECT_ID, "", violationQuery))
                {
                    // If the document exists in violation_details, update exit_date_time
                    FirebaseJson updateData;
                    updateData.set("fields/exit_date_time/stringValue", date_time); // Using date_time directly
                    String updateDataStr;
                    updateData.toString(updateDataStr, true);

                    if (Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", violationQuery, updateDataStr.c_str(), "exit_date_time"))
                    {
                        Serial.println("Updated exit_date_time in violation_details.");
                    }
                    else
                    {
                        Serial.println("Failed to update exit_date_time.");
                    }
                }
                else
                {
                    Serial.println("Document not found in violation_details either.");
                }
            }

            // Reset active geofence variables
            activeGeofence = "";
            entryDateTime = "";
        }
    }
}

void loop()
{
    while (gpsSerial.available())
    {
        gps.encode(gpsSerial.read());
    }

    if (gps.location.isUpdated())
    {
        double lat = gps.location.lat();
        double lon = gps.location.lng();
        String date_time = getDateAndTime(); // Get GPS time here
        checkGeofence(lat, lon, date_time);
    }

    delay(300000);
    fetchGeofences();
}
