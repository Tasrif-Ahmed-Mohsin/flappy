// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const bestScoreElement = document.getElementById('bestScore');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');
const facePicker = document.getElementById('facePicker');
const useWebcamBtn = document.getElementById('useWebcam');

// Game state
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let score = 0;
let bestScore = localStorage.getItem('bestScore') || 0;
bestScoreElement.textContent = bestScore;

// Bird object
const bird = {
    x: 50,
    y: canvas.height / 2,
    width: 34,
    height: 24,
    velocity: 0,
    gravity: 0.5,
    jumpPower: -8,
    rotation: 0
};

// Pipes array
let pipes = [];
const pipeWidth = 52;
const pipeGap = 120;
const pipeSpeed = 2;

// Bird image (default yellow bird)
const birdImg = new Image();
let usingCustomFace = false;
let webcamStream = null;
let webcamVideo = null;

// Create default bird canvas
const defaultBirdCanvas = document.createElement('canvas');
const defaultBirdCtx = defaultBirdCanvas.getContext('2d');
defaultBirdCanvas.width = 34;
defaultBirdCanvas.height = 24;

// Draw default yellow bird
function drawDefaultBird() {
    defaultBirdCtx.clearRect(0, 0, 34, 24);
    defaultBirdCtx.fillStyle = '#FFD700';
    defaultBirdCtx.beginPath();
    defaultBirdCtx.ellipse(17, 12, 15, 10, 0, 0, Math.PI * 2);
    defaultBirdCtx.fill();
    
    // Eye
    defaultBirdCtx.fillStyle = '#000';
    defaultBirdCtx.beginPath();
    defaultBirdCtx.ellipse(22, 8, 3, 3, 0, 0, Math.PI * 2);
    defaultBirdCtx.fill();
    
    // Beak
    defaultBirdCtx.fillStyle = '#FFA500';
    defaultBirdCtx.beginPath();
    defaultBirdCtx.moveTo(30, 12);
    defaultBirdCtx.lineTo(34, 10);
    defaultBirdCtx.lineTo(30, 14);
    defaultBirdCtx.fill();
}

// Initialize default bird
drawDefaultBird();
birdImg.src = defaultBirdCanvas.toDataURL();

// Face replacement functionality
facePicker.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            birdImg.src = event.target.result;
            usingCustomFace = true;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Webcam functionality
useWebcamBtn.addEventListener('click', async function() {
    try {
        if (webcamStream) {
            // Stop existing stream
            webcamStream.getTracks().forEach(track => track.stop());
            webcamStream = null;
            useWebcamBtn.textContent = 'Use Webcam';
            return;
        }
        
        webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamVideo = document.createElement('video');
        webcamVideo.srcObject = webcamStream;
        webcamVideo.play();
        
        webcamVideo.onloadedmetadata = function() {
            captureWebcamFrame();
            useWebcamBtn.textContent = 'Stop Webcam';
        };
    } catch (error) {
        alert('Could not access webcam: ' + error.message);
    }
});

function captureWebcamFrame() {
    if (!webcamVideo) return;
    
    const webcamCanvas = document.createElement('canvas');
    const webcamCtx = webcamCanvas.getContext('2d');
    webcamCanvas.width = 34;
    webcamCanvas.height = 24;
    
    // Draw webcam frame
    webcamCtx.drawImage(webcamVideo, 0, 0, 34, 24);
    birdImg.src = webcamCanvas.toDataURL();
    usingCustomFace = true;
    
    // Continue capturing frames
    if (webcamStream) {
        setTimeout(captureWebcamFrame, 100); // Update every 100ms
    }
}

// Game functions
function resetGame() {
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    bird.rotation = 0;
    pipes = [];
    score = 0;
    scoreElement.textContent = score;
    gameState = 'start';
    gameOverElement.style.display = 'none';
}

function jump() {
    if (gameState === 'start') {
        gameState = 'playing';
    }
    if (gameState === 'playing') {
        bird.velocity = bird.jumpPower;
    }
    if (gameState === 'gameOver') {
        resetGame();
    }
}

function updateBird() {
    if (gameState !== 'playing') return;
    
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;
    
    // Rotation based on velocity
    bird.rotation = Math.min(Math.max(bird.velocity * 3, -30), 90) * Math.PI / 180;
    
    // Check boundaries
    if (bird.y + bird.height > canvas.height || bird.y < 0) {
        gameOver();
    }
}

function updatePipes() {
    if (gameState !== 'playing') return;
    
    // Add new pipe
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 200) {
        const pipeHeight = Math.random() * (canvas.height - pipeGap - 100) + 50;
        pipes.push({
            x: canvas.width,
            topHeight: pipeHeight,
            bottomY: pipeHeight + pipeGap,
            bottomHeight: canvas.height - pipeHeight - pipeGap,
            passed: false
        });
    }
    
    // Update pipe positions
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= pipeSpeed;
        
        // Score when bird passes pipe
        if (!pipes[i].passed && pipes[i].x + pipeWidth < bird.x) {
            pipes[i].passed = true;
            score++;
            scoreElement.textContent = score;
        }
        
        // Remove off-screen pipes
        if (pipes[i].x + pipeWidth < 0) {
            pipes.splice(i, 1);
        }
        
        // Check collision
        if (checkCollision(pipes[i])) {
            gameOver();
        }
    }
}

function checkCollision(pipe) {
    // Bird boundaries
    const birdLeft = bird.x;
    const birdRight = bird.x + bird.width;
    const birdTop = bird.y;
    const birdBottom = bird.y + bird.height;
    
    // Pipe boundaries
    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + pipeWidth;
    
    // Check if bird is within pipe x range
    if (birdRight > pipeLeft && birdLeft < pipeRight) {
        // Check if bird hits top or bottom pipe
        if (birdTop < pipe.topHeight || birdBottom > pipe.bottomY) {
            return true;
        }
    }
    
    return false;
}

function gameOver() {
    gameState = 'gameOver';
    
    // Update best score
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
        bestScoreElement.textContent = bestScore;
    }
    
    finalScoreElement.textContent = score;
    gameOverElement.style.display = 'block';
}

function drawBackground() {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 3; i++) {
        const x = (Date.now() * 0.02 + i * 100) % (canvas.width + 60) - 30;
        const y = 50 + i * 30;
        drawCloud(x, y);
    }
}

function drawCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.arc(x + 15, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 30, y, 15, 0, Math.PI * 2);
    ctx.arc(x + 15, y - 10, 15, 0, Math.PI * 2);
    ctx.fill();
}

function drawBird() {
    ctx.save();
    
    // Move to bird center for rotation
    ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    ctx.rotate(bird.rotation);
    
    if (usingCustomFace) {
        // Draw circular mask for custom face
        ctx.beginPath();
        ctx.arc(0, 0, bird.width / 2, 0, Math.PI * 2);
        ctx.clip();
    }
    
    // Draw bird image
    ctx.drawImage(birdImg, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
    
    ctx.restore();
}

function drawPipes() {
    ctx.fillStyle = '#228B22';
    
    pipes.forEach(pipe => {
        // Top pipe
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        
        // Bottom pipe
        ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, pipe.bottomHeight);
        
        // Pipe caps
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(pipe.x - 4, pipe.topHeight - 20, pipeWidth + 8, 20);
        ctx.fillRect(pipe.x - 4, pipe.bottomY, pipeWidth + 8, 20);
        ctx.fillStyle = '#228B22';
    });
}

function drawStartScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Flappy Bird', canvas.width / 2, canvas.height / 2 - 50);
    
    ctx.font = '16px Arial';
    ctx.fillText('Press SPACE or Click to Start', canvas.width / 2, canvas.height / 2);
    ctx.fillText('Upload your face above!', canvas.width / 2, canvas.height / 2 + 30);
}

function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    drawBackground();
    
    // Update and draw game objects
    if (gameState === 'playing') {
        updateBird();
        updatePipes();
    }
    
    // Draw pipes
    drawPipes();
    
    // Draw bird
    drawBird();
    
    // Draw start screen
    if (gameState === 'start') {
        drawStartScreen();
    }
    
    requestAnimationFrame(gameLoop);
}

// Event listeners
canvas.addEventListener('click', jump);
document.addEventListener('keydown', function(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        jump();
    }
});

restartBtn.addEventListener('click', resetGame);

// Start the game
resetGame();
gameLoop();
