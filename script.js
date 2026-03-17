const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const participantsList = document.getElementById('participantsList');
const spinBtn = document.getElementById('spinBtn');
const winnerModal = document.getElementById('winnerModal');
const winnerText = document.getElementById('winnerText');

// 1. CARGA INICIAL: Intentamos leer del LocalStorage
let participants = JSON.parse(localStorage.getItem('participants')) || [];

let startAngle = 0;
let arc = 0;
let spinTimeout = null;
let spinAngleStart = 10;
let spinTime = 0;
let spinTimeTotal = 0;
let isSpinning = false;
let spinStartTimestamp = null;

const colors = ['#3669c9', '#eb4d4b', '#f9ca24', '#6ab04c', '#be2edd', '#e056fd'];

// Guardar en el navegador para no perder datos
function saveToStorage() {
    localStorage.setItem('participants', JSON.stringify(participants));
}

function drawRouletteWheel() {
    if (participants.length === 0) {
        // Limpiar canvas si no hay nadie
        ctx.clearRect(0, 0, 500, 500);
        return;
    }

    const totalWeight = participants.reduce((sum, p) => sum + p.chances, 0);
    let currentAngle = startAngle;
    
    ctx.clearRect(0, 0, 500, 500);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;

    const outsideRadius = 240;
    // AJUSTE 1: Empujamos el texto más hacia el borde (antes era 160)
    const textRadius = 200;
    const insideRadius = 0;

    participants.forEach((p, index) => {
        const segmentAngle = (p.chances / totalWeight) * 2 * Math.PI;
        
        ctx.fillStyle = colors[index % colors.length];
        
        ctx.beginPath();
        ctx.arc(250, 250, outsideRadius, currentAngle, currentAngle + segmentAngle, false);
        ctx.arc(250, 250, insideRadius, currentAngle + segmentAngle, currentAngle, true);
        ctx.stroke();
        ctx.fill();

        ctx.save();
        ctx.fillStyle = "white";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.font = 'bold 24px "Lilita One", sans-serif';
        
        const textAngle = currentAngle + segmentAngle / 2;
        ctx.translate(250 + Math.cos(textAngle) * textRadius, 
                      250 + Math.sin(textAngle) * textRadius);
        
        // AJUSTE 2: Rotación radial (a lo largo)
        // Quitamos el "+ Math.PI / 2" para que apunten desde el centro hacia afuera
        ctx.rotate(textAngle);
        
        const text = p.name;
        if (segmentAngle > 0.05) { // Mostrar texto solo si cabe
             ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
        }
        ctx.restore();

        currentAngle += segmentAngle;
    });
}

function addParticipant() {
    const nameInput = document.getElementById('participantName');
    const chancesInput = document.getElementById('chances');
    
    const name = nameInput.value.trim();
    let chances = parseInt(chancesInput.value);

    if (!chances || chances < 1) chances = 1;

    if (name) {
        participants.push({ name, chances });
        saveToStorage(); // Guardamos cambios
        updateUI();
        nameInput.value = '';
        chancesInput.value = '1';
        drawRouletteWheel();
    }
}

// Función para borrar participante
function deleteParticipant(index) {
    if (isSpinning) return; // No borrar mientras gira
    participants.splice(index, 1);
    saveToStorage(); // Guardamos cambios
    updateUI();
    drawRouletteWheel();
}

function updateUI() {
    participantsList.innerHTML = '';
    participants.forEach((p, index) => {
        const li = document.createElement('li');
        
        li.innerHTML = `
            <div class="player-info">
                <span>${p.name}</span>
                <span class="badge">x${p.chances}</span>
            </div>
            <button class="delete-btn" onclick="deleteParticipant(${index})">✕</button>
        `;
        participantsList.appendChild(li);
    });
}

function spinWheel() {
    if (isSpinning || participants.length === 0) return;
    
    isSpinning = true;
    spinBtn.disabled = true;
    
    // Giro largo de suspenso
    spinAngleStart = Math.random() * 15 + 25; 
    spinTime = 0;
    spinTimeTotal = Math.random() * 5000 + 10000; // Entre 10 y 15 segundos
    spinStartTimestamp = null;
    
    rotateWheel();
}

function rotateWheel() {
    const now = performance.now();
    if (spinStartTimestamp === null) spinStartTimestamp = now;
    spinTime = now - spinStartTimestamp;

    if (spinTime >= spinTimeTotal) {
        stopRotateWheel();
        return;
    }
    
    const spinAngle = spinAngleStart - (easeOut(spinTime, 0, spinAngleStart, spinTimeTotal));
    startAngle += (spinAngle * Math.PI / 180);
    drawRouletteWheel();
    spinTimeout = requestAnimationFrame(rotateWheel);
}

function stopRotateWheel() {
    cancelAnimationFrame(spinTimeout);
    isSpinning = false;
    spinBtn.disabled = false;
    
    const degrees = startAngle * 180 / Math.PI + 90;
    const arcd = degrees % 360;
    const rotationIndex = 360 - arcd;
    
    const totalWeight = participants.reduce((sum, p) => sum + p.chances, 0);
    let winner = null;

    const weightPerDegree = totalWeight / 360;
    const winningWeightPoint = rotationIndex * weightPerDegree;

    let accumWeight = 0;
    for(let p of participants) {
        accumWeight += p.chances;
        if(winningWeightPoint <= accumWeight) {
            winner = p.name;
            break;
        }
    }

    showWinner(winner);
}

function easeOut(t, b, c, d) {
    t /= d;
    t--;
    return c * (t*t*t + 1) + b;
}

function showWinner(name) {
    winnerText.textContent = name;
    winnerModal.classList.remove('hidden');
}

function closeModal() {
    winnerModal.classList.add('hidden');
}

// Inicialización
updateUI();
drawRouletteWheel();