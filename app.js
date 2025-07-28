// Game configuration
const CONFIG = {
    canvasWidth: 320,
    canvasHeight: 480,
    gravity: 0.5,
    jumpVelocity: -8,
    pipeSpeed: 2,
    pipeGap: 120,
    pipeSpacing: 150,
    maxFallSpeed: 5
};

// Game states
const GAME_STATES = {
    START: 'START',
    PLAYING: 'PLAYING',
    GAME_OVER: 'GAME_OVER'
};

// Game variables
let canvas, ctx;
let gameState = GAME_STATES.START;
let score = 0;
let bestScore = 0;
let animationId;

// Bird object
const bird = {
    x: 80,
    y: 240,
    width: 30,
    height: 30,
    velocity: 0,
    rotation: 0,
    
    update() {
        if (gameState === GAME_STATES.PLAYING) {
            // Apply gravity
            this.velocity += CONFIG.gravity;
            
            // Limit fall speed
            if (this.velocity > CONFIG.maxFallSpeed) {
                this.velocity = CONFIG.maxFallSpeed;
            }
            
            // Update position
            this.y += this.velocity;
            
            // Update rotation based on velocity
            this.rotation = Math.min(Math.max(this.velocity * 3, -20), 90);
        }
    },
    
    jump() {
        if (gameState === GAME_STATES.PLAYING) {
            this.velocity = CONFIG.jumpVelocity;
        }
    },
    
    reset() {
        this.x = 80;
        this.y = 240;
        this.velocity = 0;
        this.rotation = 0;
    },
    
    draw() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation * Math.PI / 180);
        
        // Draw bird as yellow circle with black outline
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Draw simple eye
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-5, -5, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-3, -5, 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw beak
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(18, -3);
        ctx.lineTo(18, 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
};

// Pipes array
let pipes = [];

// Pipe class
class Pipe {
    constructor(x) {
        this.x = x;
        this.width = 60;
        this.gap = CONFIG.pipeGap;
        this.gapY = Math.random() * (280 - 150) + 150; // Adjusted for better gameplay
        this.passed = false;
    }
    
    update() {
        this.x -= CONFIG.pipeSpeed;
    }
    
    draw() {
        // Draw pipes as green rectangles
        ctx.fillStyle = '#228B22';
        ctx.strokeStyle = '#006400';
        ctx.lineWidth = 3;
        
        // Top pipe
        ctx.fillRect(this.x, 0, this.width, this.gapY - this.gap/2);
        ctx.strokeRect(this.x, 0, this.width, this.gapY - this.gap/2);
        
        // Bottom pipe
        ctx.fillRect(this.x, this.gapY + this.gap/2, this.width, CONFIG.canvasHeight - (this.gapY + this.gap/2) - 50);
        ctx.strokeRect(this.x, this.gapY + this.gap/2, this.width, CONFIG.canvasHeight - (this.gapY + this.gap/2) - 50);
        
        // Pipe caps (wider rectangles at the gap)
        const capHeight = 30;
        const capWidth = this.width + 10;
        const capX = this.x - 5;
        
        // Top cap
        ctx.fillRect(capX, this.gapY - this.gap/2 - capHeight, capWidth, capHeight);
        ctx.strokeRect(capX, this.gapY - this.gap/2 - capHeight, capWidth, capHeight);
        
        // Bottom cap
        ctx.fillRect(capX, this.gapY + this.gap/2, capWidth, capHeight);
        ctx.strokeRect(capX, this.gapY + this.gap/2, capWidth, capHeight);
    }
    
    checkCollision(bird) {
        // More forgiving collision detection - using smaller hit box
        const birdLeft = bird.x + 5;
        const birdRight = bird.x + bird.width - 5;
        const birdTop = bird.y + 5;
        const birdBottom = bird.y + bird.height - 5;
        
        const pipeLeft = this.x;
        const pipeRight = this.x + this.width;
        
        // Check if bird is within pipe's horizontal bounds
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
            // Check collision with top pipe
            if (birdTop < this.gapY - this.gap/2) {
                return true;
            }
            // Check collision with bottom pipe
            if (birdBottom > this.gapY + this.gap/2) {
                return true;
            }
        }
        
        return false;
    }
    
    checkPassed(bird) {
        if (!this.passed && bird.x > this.x + this.width) {
            this.passed = true;
            return true;
        }
        return false;
    }
}

// Game functions
function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set up event listeners
    document.addEventListener('keydown', handleKeyPress);
    canvas.addEventListener('click', handleClick);
    
    // Make sure restart button is properly connected
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', restartGame);
    }
    
    // Initialize UI state
    showStartScreen();
    
    // Start game loop
    gameLoop();
}

function handleKeyPress(event) {
    if (event.code === 'Space') {
        event.preventDefault();
        handleInput();
    }
}

function handleClick(event) {
    event.preventDefault();
    handleInput();
}

function handleInput() {
    switch (gameState) {
        case GAME_STATES.START:
            startGame();
            break;
        case GAME_STATES.PLAYING:
            bird.jump();
            break;
        case GAME_STATES.GAME_OVER:
            // Allow click to restart during game over
            restartGame();
            break;
    }
}

function showStartScreen() {
    gameState = GAME_STATES.START;
    document.getElementById('startScreen').classList.remove('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('scoreDisplay').classList.add('hidden');
}

function startGame() {
    gameState = GAME_STATES.PLAYING;
    score = 0;
    pipes = [];
    bird.reset();
    
    // Generate initial pipes - start farther away
    for (let i = 1; i <= 3; i++) {
        pipes.push(new Pipe(CONFIG.canvasWidth + i * CONFIG.pipeSpacing));
    }
    
    // Update UI
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('scoreDisplay').classList.remove('hidden');
    updateScoreDisplay();
}

function restartGame() {
    // Reset all game variables
    score = 0;
    pipes = [];
    bird.reset();
    
    // Show start screen
    showStartScreen();
}

function gameOver() {
    gameState = GAME_STATES.GAME_OVER;
    
    // Update best score
    if (score > bestScore) {
        bestScore = score;
    }
    
    // Show game over screen
    document.getElementById('scoreDisplay').classList.add('hidden');
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.remove('hidden');
    document.getElementById('finalScore').textContent = score;
    document.getElementById('bestScore').textContent = bestScore;
}

function updateScoreDisplay() {
    document.getElementById('currentScore').textContent = score;
}

function update() {
    if (gameState === GAME_STATES.PLAYING) {
        // Update bird
        bird.update();
        
        // Check boundary collisions - more forgiving
        if (bird.y <= -10 || bird.y + bird.height >= CONFIG.canvasHeight - 40) {
            gameOver();
            return;
        }
        
        // Update pipes
        pipes.forEach(pipe => pipe.update());
        
        // Remove off-screen pipes and add new ones
        pipes = pipes.filter(pipe => pipe.x > -pipe.width);
        
        // Add new pipe if needed
        const lastPipe = pipes[pipes.length - 1];
        if (lastPipe && lastPipe.x < CONFIG.canvasWidth - CONFIG.pipeSpacing) {
            pipes.push(new Pipe(CONFIG.canvasWidth + 50));
        }
        
        // Check collisions and scoring
        for (let pipe of pipes) {
            if (pipe.checkCollision(bird)) {
                gameOver();
                return;
            }
            
            if (pipe.checkPassed(bird)) {
                score++;
                updateScoreDisplay();
            }
        }
    }
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    
    // Draw sky background
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    
    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, CONFIG.canvasHeight - 50, CONFIG.canvasWidth, 50);
    
    // Draw grass on ground
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, CONFIG.canvasHeight - 50, CONFIG.canvasWidth, 10);
    
    // Draw pipes
    pipes.forEach(pipe => pipe.draw());
    
    // Draw bird
    bird.draw();
    
    // Draw score during gameplay on canvas
    if (gameState === GAME_STATES.PLAYING) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        
        const text = score.toString();
        const x = CONFIG.canvasWidth / 2;
        const y = 60;
        
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
    }
}

function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);