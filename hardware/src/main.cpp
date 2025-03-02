#include <Arduino.h>
#include <TinyGPS++.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// Firebase credentials
#define WIFI_SSID "Hari Ram"
#define WIFI_PASSWORD "11242004"
#define API_KEY "AIzaSyCfFzRlBO7PG0zI7xEApTIBcYVvJkh0AyE"
#define FIREBASE_PROJECT_ID "gnss-trafficviolationdetection"
#define USER_EMAIL "hariramreddy6204@gmail.com"
#define USER_PASSWORD "123456"
#define DATABASE_URL "https://gnss-trafficviolationdetection-default-rtdb.firebaseio.com/"

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
    double c1_lat, c1_lon, c2_lat, c2_lon, c3_lat, c3_lon, c4_lat, c4_lon;
    String name;
};
std::vector<Geofence> geofences;

// Store last known status
bool insideGeofence = false;
String activeGeofence = "";
String entryDateTime = "";
String vehicleNo = "TN19S4105";
unsigned long lastFetchTime = 0;            // Store last fetch time globally
const unsigned long fetchInterval = 300000; // 5 minutes in milliseconds

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

void parseCoordinates(String coord, double &lat, double &lon)
{
    int commaIndex = coord.indexOf(',');
    if (commaIndex != -1)
    {
        lat = coord.substring(0, commaIndex).toDouble();
        lon = coord.substring(commaIndex + 1).toDouble();
    }
}

void fetchGeofences()
{
    Serial.println("Fetching geofences from Firestore...");
    String query = String(NO_PARKING_COLLECTION);
    if (Firebase.Firestore.getDocument(&fbdo, FIREBASE_PROJECT_ID, "", query.c_str()))
    {
        DynamicJsonDocument doc(8192);
        deserializeJson(doc, fbdo.payload().c_str());
        JsonArray documents = doc["documents"].as<JsonArray>();

        geofences.clear();
        for (JsonObject document : documents)
        {
            JsonObject fields = document["fields"];
            Geofence gf;
            parseCoordinates(fields["c1"]["stringValue"].as<String>(), gf.c1_lat, gf.c1_lon);
            parseCoordinates(fields["c2"]["stringValue"].as<String>(), gf.c2_lat, gf.c2_lon);
            parseCoordinates(fields["c3"]["stringValue"].as<String>(), gf.c3_lat, gf.c3_lon);
            parseCoordinates(fields["c4"]["stringValue"].as<String>(), gf.c4_lat, gf.c4_lon);
            gf.name = fields["name"]["stringValue"].as<String>();
            geofences.push_back(gf);

            Serial.printf("Geofence: %s, c1: %.6f, %.6f\n", gf.name.c_str(), gf.c1_lat, gf.c1_lon);
            Serial.printf("Geofence: %s, c2: %.6f, %.6f\n", gf.name.c_str(), gf.c2_lat, gf.c2_lon);
            Serial.printf("Geofence: %s, c3: %.6f, %.6f\n", gf.name.c_str(), gf.c3_lat, gf.c3_lon);
            Serial.printf("Geofence: %s, c4: %.6f, %.6f\n", gf.name.c_str(), gf.c4_lat, gf.c4_lon);
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
        // return "2025-03-03 03:33 AM";
    }
    return "Unknown";
}

bool isPointOnEdge(double lat, double lon, double lat1, double lon1, double lat2, double lon2)
{
    // Check if the point (lat, lon) lies exactly on the edge (lat1, lon1) -> (lat2, lon2)
    double crossProduct = (lon - lon1) * (lat2 - lat1) - (lat - lat1) * (lon2 - lon1);

    if (abs(crossProduct) > 1e-9) // Not collinear
        return false;

    // Check if the point is within segment bounds
    if (lat >= min(lat1, lat2) && lat <= max(lat1, lat2) &&
        lon >= min(lon1, lon2) && lon <= max(lon1, lon2))
    {
        return true;
    }
    return false;
}

bool isInsideGeofence(double lat, double lon)
{
    for (auto &geo : geofences)
    {
        int count = 0;

        // Define corners of the quadrilateral
        double lat1 = geo.c1_lat, lon1 = geo.c1_lon;
        double lat2 = geo.c2_lat, lon2 = geo.c2_lon;
        double lat3 = geo.c3_lat, lon3 = geo.c3_lon;
        double lat4 = geo.c4_lat, lon4 = geo.c4_lon;

        // Check if the point is exactly on any edge
        if (isPointOnEdge(lat, lon, lat1, lon1, lat2, lon2) ||
            isPointOnEdge(lat, lon, lat2, lon2, lat3, lon3) ||
            isPointOnEdge(lat, lon, lat3, lon3, lat4, lon4) ||
            isPointOnEdge(lat, lon, lat4, lon4, lat1, lon1))
        {

            activeGeofence = geo.name;
            Serial.println("Inside - On the Edge");
            return true;
        }

        // Ray-Casting Algorithm for inside check
        if ((lat1 > lat) != (lat2 > lat) && lon < (lon2 - lon1) * (lat - lat1) / (lat2 - lat1) + lon1)
            count++;
        if ((lat2 > lat) != (lat3 > lat) && lon < (lon3 - lon2) * (lat - lat2) / (lat3 - lat2) + lon2)
            count++;
        if ((lat3 > lat) != (lat4 > lat) && lon < (lon4 - lon3) * (lat - lat3) / (lat4 - lat3) + lon3)
            count++;
        if ((lat4 > lat) != (lat1 > lat) && lon < (lon1 - lon4) * (lat - lat4) / (lat1 - lat4) + lon4)
            count++;

        if (count % 2 == 1)
        {
            activeGeofence = geo.name;
            Serial.println("Inside");
            return true;
        }
    }
    Serial.println("Outside");
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
                             String(lat, 5) + "\" },"
                                              "\"long\": { \"stringValue\": \"" +
                             String(lon, 5) + "\" }"
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

void uploadToFirebase(double lat, double lon, String date_time)
{
    String path = "/gps_data"; // Fixed path instead of unique millis()

    FirebaseJson json;
    json.set("latitude", lat);
    json.set("longitude", lon);
    json.set("date_time", date_time);

    if (Firebase.RTDB.updateNode(&fbdo, path.c_str(), &json))
    {
        Serial.println("Data updated successfully in Firebase");
    }
    else
    {
        Serial.print("Firebase error: ");
        Serial.println(fbdo.errorReason());
    }
}

void getGPSData()
{

    while (gpsSerial.available() > 0)
    {
        gps.encode(gpsSerial.read());
    }

    if (gps.location.isUpdated())
    {
        double lat = gps.location.lat();
        double lon = gps.location.lng();
        // double lat = 12.66201;
        // double lon = 80.01405;

        // Convert to String with 5 decimal places
        char latBuffer[10], lonBuffer[10];
        dtostrf(lat, 8, 5, latBuffer); // (value, min width, decimal places, buffer)
        dtostrf(lon, 8, 5, lonBuffer);

        // Convert back to double
        lat = atof(latBuffer);
        lon = atof(lonBuffer);

        // Print with strict 5-decimal precision
        Serial.printf("Lat: %.5f  Lon: %.5f\n", lat, lon);

        String date_time = getDateAndTime(); // Get GPS time here

        // Send strict 5-decimal values
        uploadToFirebase(lat, lon, date_time);
        checkGeofence(lat, lon, date_time);
    }
    else
    {
        Serial.println("No GPS Fix Yet...");
    }
}

void loop()
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("WiFi Lost. Reconnecting...");
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        while (WiFi.status() != WL_CONNECTED)
        {
            Serial.print(".");
            delay(1000);
        }
        Serial.println("\nReconnected to WiFi!");
    }

    if (millis() - lastFetchTime >= fetchInterval)
    {
        fetchGeofences();
        lastFetchTime = millis(); // Update last fetch time
    }

    getGPSData();

    delay(1000);
}