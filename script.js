const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScore = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const birdImg = new Image();
birdImg.src = "bird.png"; // change name if needed
const bgImg = new Image();
bgImg.src = "background.jpg"; // change name if needed
const flapSound = new Audio("flap.mp3");
const hitSound = new Audio("hit.mp3");

// Original Flappy Bird approximate physics & mechanics
const GRAVITY = 0.25;
const FLAP_SPEED = -6.8;
const PIPE_SPEED = 2.8;   // slower pipes 
const PIPE_WIDTH = 64;
const PIPE_CAP_HEIGHT = 28;
const PIPE_CAP_WIDTH = 70;
const PIPE_GAP = 200;
const PIPE_SPACING = 220; // more distance between pipes 
const GROUND_HEIGHT = 112; 

let bird = {};
let pipes = [];
let score = 0;
let gameRunning = false;
let animationId;
let groundOffsetX = 0;
let lastTime = 0;

function init() {
    bird = {
        x: 100,
        y: canvas.height / 2,
        radius: 14,
        velocity: 0,
        rotation: 0
    };
    pipes = [];
    score = 0;
    scoreDisplay.innerText = score;
    createPipe(canvas.width + 100);
}

function createPipe(xPos) {
    const minHeight = 60;
    const maxPipeBaseHeight = canvas.height - GROUND_HEIGHT - PIPE_GAP - minHeight;
    const height = Math.floor(Math.random() * (maxPipeBaseHeight - minHeight + 1) + minHeight);
    
    pipes.push({
        x: xPos,
        topHeight: height,
        bottomY: height + PIPE_GAP,
        passed: false
    });
}

function drawBird(x, y, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    ctx.drawImage(birdImg, -35, -35, 70, 70); // bigger bird

    ctx.restore();
}

function drawPipes() {
    ctx.fillStyle = '#73BF2E'; // Light pixel green
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;

    pipes.forEach(pipe => {
        // --- TOP PIPE ---
        const topStemHeight = pipe.topHeight - PIPE_CAP_HEIGHT;
        
        ctx.fillRect(pipe.x, -5, PIPE_WIDTH, topStemHeight + 5);
        ctx.strokeRect(pipe.x, -5, PIPE_WIDTH, topStemHeight + 5); 
        
        ctx.fillRect(pipe.x - (PIPE_CAP_WIDTH - PIPE_WIDTH)/2, topStemHeight, PIPE_CAP_WIDTH, PIPE_CAP_HEIGHT);
        ctx.strokeRect(pipe.x - (PIPE_CAP_WIDTH - PIPE_WIDTH)/2, topStemHeight, PIPE_CAP_WIDTH, PIPE_CAP_HEIGHT);

        // Retro pseudo-3D highlights
        ctx.fillStyle = '#9BDE59';
        ctx.fillRect(pipe.x + 4, 0, 4, topStemHeight);
        ctx.fillRect(pipe.x - (PIPE_CAP_WIDTH - PIPE_WIDTH)/2 + 4, topStemHeight + 4, 4, PIPE_CAP_HEIGHT - 8);

        ctx.fillStyle = '#73BF2E'; 
        
        // --- BOTTOM PIPE ---
        const bottomStemHeight = canvas.height - GROUND_HEIGHT - pipe.bottomY - PIPE_CAP_HEIGHT;
        
        ctx.fillRect(pipe.x, pipe.bottomY + PIPE_CAP_HEIGHT, PIPE_WIDTH, bottomStemHeight + 5);
        ctx.strokeRect(pipe.x, pipe.bottomY + PIPE_CAP_HEIGHT, PIPE_WIDTH, bottomStemHeight + 5);

        ctx.fillRect(pipe.x - (PIPE_CAP_WIDTH - PIPE_WIDTH)/2, pipe.bottomY, PIPE_CAP_WIDTH, PIPE_CAP_HEIGHT);
        ctx.strokeRect(pipe.x - (PIPE_CAP_WIDTH - PIPE_WIDTH)/2, pipe.bottomY, PIPE_CAP_WIDTH, PIPE_CAP_HEIGHT);
        
        ctx.fillStyle = '#9BDE59';
        ctx.fillRect(pipe.x + 4, pipe.bottomY + PIPE_CAP_HEIGHT, 4, bottomStemHeight);
        ctx.fillRect(pipe.x - (PIPE_CAP_WIDTH - PIPE_WIDTH)/2 + 4, pipe.bottomY + 4, 4, PIPE_CAP_HEIGHT - 8);

        ctx.fillStyle = '#73BF2E'; 
    });
}

function drawGround() {
    const groundY = canvas.height - GROUND_HEIGHT;

    ctx.fillStyle = '#DED895';
    ctx.fillRect(0, groundY, canvas.width, GROUND_HEIGHT);
    
    ctx.fillStyle = '#73BF2E';
    ctx.fillRect(0, groundY, canvas.width, 16);
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, groundY + 16);
    ctx.lineTo(canvas.width, groundY + 16);
    ctx.stroke();

    ctx.fillStyle = '#9BDE59';
    ctx.fillRect(0, groundY, canvas.width, 4);

    ctx.strokeStyle = '#5A4A33';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = -1; i <= canvas.width / 24 + 1; i++) {
        let x = (i * 24) - groundOffsetX;
        ctx.moveTo(x + 10, groundY + 16);
        ctx.lineTo(x, groundY + 36);
    }
    ctx.stroke();
}

function updateGame(timestamp) {
    if (!gameRunning) return;

    if (!lastTime) lastTime = timestamp;
    const dt = Math.min(timestamp - lastTime, 50); // Cap delta time at 50ms to avoid huge jumps
    lastTime = timestamp;

    // Normalizes movement around a standard 60fps refresh rate (16.66ms per frame)
    const timeScale = Math.min(dt / 16.666, 1.1);

    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height*1.5);

    // Apply Physics with time-scale for perfectly smooth velocity
    bird.velocity += GRAVITY * timeScale;
    bird.velocity = Math.min(bird.velocity, 7);    // Add velocity with timescale applied
    bird.y += bird.velocity * timeScale;

    // Smoother Interpolated Rotation handling
    let targetRotation;
    if (bird.velocity < 2) {
        targetRotation = -25 * Math.PI / 180;
    } else {
        // Smoothly interpolate target rotation based on fall speed
        const t = Math.min((bird.velocity - 2) / 8, 1);
        targetRotation = -25 * Math.PI / 180 + t * (115 * Math.PI / 180);
    }
    // Interpolate towards target (lerp)
    bird.rotation += (targetRotation - bird.rotation) * 0.2 * timeScale;

    if (pipes.length === 0 || canvas.width - pipes[pipes.length - 1].x >= PIPE_SPACING) {
        createPipe(canvas.width);
    }

    let collision = false;

    if (bird.y + bird.radius >= canvas.height - GROUND_HEIGHT) {
        collision = true;
        bird.y = canvas.height - GROUND_HEIGHT - bird.radius;
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i];
        p.x -= PIPE_SPEED * timeScale;

        if (!p.passed && p.x + PIPE_WIDTH < bird.x) {
            score++;
            scoreDisplay.innerText = score;
            p.passed = true;
        }

        if (bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + PIPE_WIDTH) {
            if (bird.y - bird.radius < p.topHeight || bird.y + bird.radius > p.bottomY) {
                collision = true;
            }
        }

        if (p.x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
        }
    }

    // Update Ground Animation Offset smoothly using timeScale
    groundOffsetX = (groundOffsetX + PIPE_SPEED * timeScale) % 24;

    if (collision) {
        drawPipes();
        drawGround();
        drawBird(bird.x, bird.y, bird.rotation);
        gameOver();
        return; 
    } else {
        drawPipes();
        drawGround();
        drawBird(bird.x, bird.y, bird.rotation);
        animationId = requestAnimationFrame(updateGame);
    }
}

function flap() {
    if (!gameRunning) return;
    bird.velocity = FLAP_SPEED;

    flapSound.currentTime = 0; // allows rapid replay
    flapSound.play();
}

function startGame() {
    init();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameRunning = true;
    lastTime = 0; // reset time to avoid huge initial tick scaling
    animationId = requestAnimationFrame(updateGame);
}

function gameOver() {
    gameRunning = false;

    hitSound.currentTime = 0;
    hitSound.play();

    finalScore.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameRunning) {
            flap();
        } else if (!startScreen.classList.contains('hidden') || !gameOverScreen.classList.contains('hidden')) {
            startGame();
        }
    }
});

canvas.addEventListener('mousedown', () => {
    if (gameRunning) flap();
});

document.addEventListener('mousedown', (e) => {
   if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'CANVAS') {
      if (gameRunning) flap();
   }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

ctx.clearRect(0, 0, canvas.width, canvas.height);
drawGround();
drawBird(100, canvas.height / 2, 0);
