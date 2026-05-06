const MQTT_HOST = 'ws://localhost:8083/mqtt';
const MQTT_TOPIC = 'udec';

let mqttClient = null;
let historialDatos = [];
let chart = null;

function iniciarGrafica() {
    const ctx = document.getElementById('graficaHistorial').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperatura (°C)',
                    data: [],
                    borderColor: '#e65100',
                    backgroundColor: 'rgba(230, 81, 0, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Humedad (%)',
                    data: [],
                    borderColor: '#0288d1',
                    backgroundColor: 'rgba(2, 136, 209, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: { y: { beginAtZero: true, max: 100 } }
        }
    });
}

function actualizarGrafica() {
    if (!chart) return;
    const ultimos = historialDatos.slice(-15);
    chart.data.labels = ultimos.map(d => d.hora);
    chart.data.datasets[0].data = ultimos.map(d => d.temperatura);
    chart.data.datasets[1].data = ultimos.map(d => d.humedad);
    chart.update();
}

function actualizarTabla() {
    const tbody = document.getElementById('tablaRegistro');
    if (historialDatos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Esperando datos...</td></tr>';
        return;
    }
    const ultimos = [...historialDatos].reverse().slice(0, 10);
    tbody.innerHTML = ultimos.map(d => `
        <tr><td>${d.hora}</td><td>${d.temperatura.toFixed(1)} °C</td><td>${d.humedad.toFixed(1)} %</td></tr>
    `).join('');
}

function actualizarUI(temp, hum, horaStr) {
    document.getElementById('tempActual').innerHTML = temp.toFixed(1);
    document.getElementById('humActual').innerHTML = hum.toFixed(1);
    document.getElementById('fechaActual').innerHTML = `Última lectura: ${horaStr}`;
    
    let humedadSuelo = '', fuerza = '', salud = '', clase = '';
    
    if (hum >= 70) { humedadSuelo = '85%'; fuerza = 'Fuerte 💪'; salud = 'Excelente'; clase = 'excelente'; }
    else if (hum >= 55) { humedadSuelo = '65%'; fuerza = 'Normal 👍'; salud = 'Buena'; clase = 'bueno'; }
    else if (hum >= 40) { humedadSuelo = '45%'; fuerza = 'Débil'; salud = 'Atención'; clase = 'atencion'; }
    else { humedadSuelo = '25%'; fuerza = 'Muy débil'; salud = 'Crítica'; clase = 'critico'; }
    
    if (temp > 32) { salud = 'Calor extremo'; clase = 'critico'; }
    else if (temp < 15) { salud = 'Demasiado frío'; clase = 'atencion'; }
    
    document.getElementById('humedadSuelo').innerHTML = humedadSuelo;
    document.getElementById('fuerza').innerHTML = fuerza;
    document.getElementById('salud').innerHTML = salud;
    document.getElementById('salud').className = `indicador-valor ${clase}`;
    
    document.querySelectorAll('.lectura-valor, .indicador-valor').forEach(el => {
        el.classList.add('nuevo-dato');
        setTimeout(() => el.classList.remove('nuevo-dato'), 500);
    });
}

function procesarDato(mensaje) {
    try {
        let dato = typeof mensaje === 'string' ? JSON.parse(mensaje) : mensaje;
        const temp = dato.temperatura || dato.temp || dato.t;
        const hum = dato.humedad || dato.humidity || dato.h;
        
        if (temp === undefined || hum === undefined) return;
        
        const ahora = new Date();
        const horaStr = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        historialDatos.push({ temperatura: parseFloat(temp), humedad: parseFloat(hum), hora: horaStr });
        if (historialDatos.length > 50) historialDatos.shift();
        
        actualizarUI(parseFloat(temp), parseFloat(hum), horaStr);
        actualizarTabla();
        actualizarGrafica();
    } catch(e) { console.error(e); }
}

function conectarMQTT() {
    const statusDiv = document.getElementById('mqttStatus');
    statusDiv.textContent = '🔄 Conectando a EMQX...';
    statusDiv.className = 'mqtt-status mqtt-connecting';
    
    try {
        mqttClient = mqtt.connect(MQTT_HOST);
        mqttClient.on('connect', () => {
            statusDiv.textContent = '✅ Conectado a EMQX';
            statusDiv.className = 'mqtt-status mqtt-online';
            mqttClient.subscribe(MQTT_TOPIC);
        });
        mqttClient.on('message', (topic, msg) => procesarDato(msg.toString()));
        mqttClient.on('error', () => {
            statusDiv.textContent = '❌ Error de conexión';
            statusDiv.className = 'mqtt-status mqtt-offline';
        });
    } catch(e) { console.error(e); }
}

function datosEjemplo() {
    const ejemplos = [
        { temperatura: 24.5, humedad: 68, hora: "12:00:00" },
        { temperatura: 25.2, humedad: 65, hora: "12:05:00" },
        { temperatura: 26.0, humedad: 62, hora: "12:10:00" }
    ];
    ejemplos.forEach(d => {
        historialDatos.push(d);
        actualizarUI(d.temperatura, d.humedad, d.hora);
    });
    actualizarTabla();
    actualizarGrafica();
}

iniciarGrafica();
conectarMQTT();
setTimeout(() => { if (historialDatos.length === 0) datosEjemplo(); }, 3000);
