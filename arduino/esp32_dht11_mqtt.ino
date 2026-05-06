#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

#define DHTPIN 13    
#define DHTTYPE DHT11  

const char* ssid = "***";           
const char* password = "****";   

const char* mqtt_server = "****";  
const char* mqtt_topic = "****";

WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);

unsigned long lastMsg = 0;
const long interval = 60000;  

void setup() {
  Serial.begin(115200);
  
  dht.begin();
  Serial.println("Sensor DHT11 iniciado en GPIO13");
  
  // Conexion WiFi
  Serial.print("Conectando a WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  
  // Configurar MQTT
  client.setServer(mqtt_server, 1883);
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Conectando a EMQX...");
    if (client.connect("ESP32_DHT11")) {
      Serial.println(" Conectado a EMQX");
    } else {
      Serial.print(" Error, rc=");
      Serial.print(client.state());
      Serial.println(" Reintentando en 5 segundos");
      delay(5000);
    }
  }
}

void loop() {
  // Verificar conexion MQTT
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();
  
  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;
    
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    
    if (isnan(h) || isnan(t)) {
      Serial.println("Error leyendo DHT11");
      return;
    }
    
    char payload[50];
    snprintf(payload, 50, "{\"temperatura\":%.1f,\"humedad\":%.1f}", t, h);
    
    // Publicar MQTT
    if (client.publish(mqtt_topic, payload)) {
      Serial.print("Enviado: ");
      Serial.println(payload);
    } else {
      Serial.println("Error al publicar MQTT");
    }
  }
}