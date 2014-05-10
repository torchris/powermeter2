#include <DigiFi.h>
#include <OneWire.h>
#include <DallasTemperature.h>
DigiFi wifi;
int ledCmded = 8;
int ledStat = 9;
#define ONE_WIRE_BUS 10

// Setup a oneWire instance to communicate with any OneWire devices (not just Maxim/Dallas temperature ICs)
OneWire oneWire(ONE_WIRE_BUS);

// Pass our oneWire reference to Dallas Temperature.
DallasTemperature sensors(&oneWire);

void setup()
{
  pinMode(ledCmded, OUTPUT);
  pinMode(ledStat, OUTPUT);
  digitalWrite(ledCmded, LOW);
  digitalWrite(ledStat, LOW);
  Serial.begin(9600);
  wifi.begin(9600);
  sensors.begin();
  //DigiX trick - since we are on serial over USB wait for character to be entered in serial terminal
  while (!Serial.available()) {
    Serial.println("Enter any key to begin");
    delay(1000);
  }

  Serial.println("Starting");

  while (wifi.ready() != 1)
  {
    Serial.println("Error connecting to network");
    delay(15000);
  }

  Serial.println("Connected to wifi!");
  Serial.print("Server running at: ");
  String address = wifi.server(3010);//sets up server and returns IP
  Serial.println(address);

  //  wifi.close();
}

void loop()
{

  if ( wifi.serverRequest()) {
    Serial.print("Request for: ");
    Serial.println(wifi.serverRequestPath());
    if (wifi.serverRequestPath() == "/off") {
      digitalWrite(ledStat, HIGH);
      digitalWrite(ledCmded, LOW);
      Serial.println("ledCmded off");
      wifi.serverResponse("<html><body><h1>ledCmded: OFF</h1></body></html>");
      digitalWrite(ledStat, LOW);
    }
    else if (wifi.serverRequestPath() == "/on") {
      digitalWrite(ledStat, HIGH);
      digitalWrite(ledCmded, HIGH);
      Serial.println("ledCmded on");
      wifi.serverResponse("<html><body><h1>ledCmded: ON</h1></body></html>");
      digitalWrite(ledStat, LOW);
    } else if (wifi.serverRequestPath() == "/temp") {
      digitalWrite(ledStat, HIGH);
      float gotTemp;
      gotTemp = getTemp();
      Serial.print("Temp =  ");
      Serial.println(gotTemp);
      wifi.println("HTTP/1.1 200 OK");
      wifi.println("Content-Type: text/html");
      wifi.println("Connection: close");  // the connection will be closed after completion of the response
      wifi.println();
      wifi.println("<!DOCTYPE HTML>");
      wifi.print("<html><body><h1>TEMP: ");
      wifi.print(gotTemp);
      wifi.print("</h1></body></html>");
      digitalWrite(ledStat, LOW);
     } else if (wifi.serverRequestPath() == "/ping") {
      digitalWrite(ledStat, HIGH);
      wifi.serverResponse("<html><body><h1>PING</h1></body></html>");
      digitalWrite(ledStat, LOW);
    }
    else {
      wifi.serverResponse("<html><body><h1>Nothing doing</h1></body></html>"); //defaults to 200
    }
  }

  delay(10);
}

float getTemp() {
  float currTemp;
  sensors.requestTemperatures(); // Send the command to get temperatures
  currTemp = sensors.getTempCByIndex(0);
  Serial.println(currTemp); // Why "byIndex"? You can have more than one IC on the same bus. 0 refers to the first IC on the wire
  return currTemp;
}
