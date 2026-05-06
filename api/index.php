<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$host = 'mariadb';
$user = 'sensor';
$password = 'sensor123';
$database = 'iot_db';

$conn = new mysqli($host, $user, $password, $database);

if ($conn->connect_error) {
    echo json_encode(["error" => "Error de conexión: " . $conn->connect_error]);
    exit;
}

$raw_data = file_get_contents('php://input');


$data = json_decode($raw_data, true);

if ($data === null) {
    $parts = explode(',', $raw_data);
    if (count($parts) == 2) {
        $data = ['temperatura' => trim($parts[0]), 'humedad' => trim($parts[1])];
    }
}

$temperatura = $data['temperatura'] ?? $data['temp'] ?? null;
$humedad = $data['humedad'] ?? $data['hum'] ?? null;

if ($temperatura !== null && $humedad !== null) {
    $stmt = $conn->prepare("INSERT INTO sensor_dht11 (temperatura, humedad) VALUES (?, ?)");
    $stmt->bind_param("dd", $temperatura, $humedad);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "ok", "mensaje" => "Datos guardados"]);
    } else {
        echo json_encode(["error" => "Error al guardar"]);
    }
    $stmt->close();
} else {
    // Guardar el raw data para depuración
    echo json_encode(["status" => "debug", "raw" => $raw_data, "parsed" => $data]);
}

$conn->close();
?>