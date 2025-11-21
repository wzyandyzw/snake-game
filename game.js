// 游戏配置
const config = {
    gridSize: 20,
    // 难度设置
    difficulties: {
        easy: { initialSpeed: 200, acceleration: 4 },
        medium: { initialSpeed: 150, acceleration: 5 },
        hard: { initialSpeed: 100, acceleration: 6 }
    },
    currentDifficulty: 'easy',
    // 食物配置
    foodTypes: [
        { color: '#FF5722', points: 10, duration: Infinity },  // 普通食物
        { color: '#E91E63', points: 25, duration: 5000 },     // 特殊食物（限时）
        { color: '#9C27B0', points: 50, duration: 3000 }      // 稀有食物（限时）
    ],
    specialFoodChance: 0.15,  // 特殊食物出现概率
    rareFoodChance: 0.05      // 稀有食物出现概率
};

// 游戏状态
let gameState = {
    canvas: null,
    ctx: null,
    snake: [],
    food: {},
    foodType: 0,  // 0: 普通食物, 1: 特殊食物, 2: 稀有食物
    foodTimer: null,
    direction: 'right',
    nextDirection: 'right',
    score: 0,
    highScore: localStorage.getItem('snakeHighScore') || 0,
    gameSpeed: config.initialSpeed,
    gameLoopId: null,
    isPaused: false,
    isGameOver: false,
    gridWidth: 0,
    gridHeight: 0,
    scoreAnimations: []
};

// DOM元素
let elements = {};

// 音频（可选）
let sounds = {
    eat: null,
    gameOver: null,
    specialEat: null
};

// 初始化游戏
function initGame() {
    // 获取DOM元素
    elements.canvas = document.getElementById('game-board');
    elements.ctx = elements.canvas.getContext('2d');
    elements.scoreElement = document.getElementById('score');
    elements.highScoreElement = document.getElementById('high-score');
    elements.gameOverScreen = document.getElementById('game-over');
    elements.finalScoreElement = document.getElementById('final-score');
    elements.startButton = document.getElementById('start-btn');
    elements.pauseButton = document.getElementById('pause-btn');
    elements.restartButton = document.getElementById('restart-btn');
    elements.playAgainButton = document.getElementById('play-again');
    elements.themeToggle = document.getElementById('theme-toggle');
    elements.difficultyButtons = document.querySelectorAll('.difficulty-btn');

    // 设置画布大小 - 响应式处理
    const containerWidth = window.innerWidth > 600 ? 400 : window.innerWidth - 40;
    const containerHeight = window.innerHeight > 600 ? 400 : window.innerHeight - 200;
    const size = Math.min(containerWidth, containerHeight);
    
    elements.canvas.width = size;
    elements.canvas.height = size;
    
    // 计算网格尺寸
    gameState.gridWidth = Math.floor(elements.canvas.width / config.gridSize);
    gameState.gridHeight = Math.floor(elements.canvas.height / config.gridSize);
    
    // 加载保存的设置
    loadSettings();
    
    // 更新最高分显示
    elements.highScoreElement.textContent = gameState.highScore;
    
    // 初始化音频（可选）
    initSounds();

    // 初始化蛇
    resetGame();

    // 添加事件监听器
    addEventListeners();
    
    // 响应式处理
    window.addEventListener('resize', handleResize);
    
    // 渲染初始状态
    render();
}

// 初始化音频
function initSounds() {
    // 尝试初始化音频上下文
    try {
        // 这里可以添加实际的音频文件，目前仅作为示例
        // sounds.eat = new Audio('sounds/eat.mp3');
        // sounds.specialEat = new Audio('sounds/special-eat.mp3');
        // sounds.gameOver = new Audio('sounds/game-over.mp3');
    } catch (e) {
        console.log('无法初始化音频:', e);
    }
}

// 重置游戏
function resetGame() {
    // 清除食物计时器
    if (gameState.foodTimer) {
        clearTimeout(gameState.foodTimer);
        gameState.foodTimer = null;
    }
    
    // 初始化蛇的位置
    gameState.snake = [
        { x: Math.floor(gameState.gridWidth / 2), y: Math.floor(gameState.gridHeight / 2) },
        { x: Math.floor(gameState.gridWidth / 2) - 1, y: Math.floor(gameState.gridHeight / 2) },
        { x: Math.floor(gameState.gridWidth / 2) - 2, y: Math.floor(gameState.gridHeight / 2) }
    ];
    
    // 重置方向
    gameState.direction = 'right';
    gameState.nextDirection = 'right';
    
    // 重置分数
    gameState.score = 0;
    elements.scoreElement.textContent = gameState.score;
    
    // 重置游戏速度（根据当前难度）
    const difficulty = config.difficulties[config.currentDifficulty];
    gameState.gameSpeed = difficulty.initialSpeed;
    
    // 重置游戏状态
    gameState.isPaused = false;
    gameState.isGameOver = false;
    
    // 清空分数动画
    gameState.scoreAnimations = [];
    
    // 隐藏游戏结束屏幕
    elements.gameOverScreen.style.display = 'none';
    
    // 生成初始食物
    generateFood();
}

// 生成食物
function generateFood() {
    // 清除之前的食物计时器
    if (gameState.foodTimer) {
        clearTimeout(gameState.foodTimer);
        gameState.foodTimer = null;
    }
    
    // 确定食物类型
    const random = Math.random();
    if (random < config.rareFoodChance) {
        gameState.foodType = 2;  // 稀有食物
    } else if (random < config.specialFoodChance + config.rareFoodChance) {
        gameState.foodType = 1;  // 特殊食物
    } else {
        gameState.foodType = 0;  // 普通食物
    }
    
    // 确保食物不会生成在蛇身上
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * gameState.gridWidth),
            y: Math.floor(Math.random() * gameState.gridHeight)
        };
    } while (gameState.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    
    gameState.food = newFood;
    
    // 如果是限时食物，设置计时器
    const foodConfig = config.foodTypes[gameState.foodType];
    if (foodConfig.duration !== Infinity) {
        gameState.foodTimer = setTimeout(() => {
            if (!gameState.isGameOver && !gameState.isPaused) {
                generateFood();
            }
        }, foodConfig.duration);
    }
}

// 移动蛇
function moveSnake() {
    // 更新方向
    gameState.direction = gameState.nextDirection;
    
    // 获取蛇头位置
    const head = { ...gameState.snake[0] };
    
    // 根据方向移动蛇头
    switch (gameState.direction) {
        case 'up':
            head.y -= 1;
            break;
        case 'down':
            head.y += 1;
            break;
        case 'left':
            head.x -= 1;
            break;
        case 'right':
            head.x += 1;
            break;
    }
    
    // 检查是否吃到食物
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
        // 获取当前食物配置
        const foodConfig = config.foodTypes[gameState.foodType];
        const points = foodConfig.points;
        
        // 增加分数
        gameState.score += points;
        elements.scoreElement.textContent = gameState.score;
        
        // 添加分数动画
        addScoreAnimation(gameState.food.x, gameState.food.y, points);
        
        // 更新最高分
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            elements.highScoreElement.textContent = gameState.highScore;
            localStorage.setItem('snakeHighScore', gameState.highScore);
        }
        
        // 播放音效
        if (gameState.foodType === 0 && sounds.eat) {
            sounds.eat.currentTime = 0;
            sounds.eat.play();
        } else if ((gameState.foodType === 1 || gameState.foodType === 2) && sounds.specialEat) {
            sounds.specialEat.currentTime = 0;
            sounds.specialEat.play();
        }
        
        // 生成新食物
        generateFood();
        
        // 游戏难度递进系统
        updateGameDifficulty();
    } else {
        // 移除蛇尾
        gameState.snake.pop();
    }
    
    // 将新蛇头添加到蛇身
    gameState.snake.unshift(head);
}

// 添加分数动画
function addScoreAnimation(x, y, points) {
    gameState.scoreAnimations.push({
        x: x * config.gridSize + config.gridSize / 2,
        y: y * config.gridSize + config.gridSize / 2,
        points: points,
        alpha: 1,
        yOffset: 0,
        life: 60 // 帧数
    });
}

// 更新游戏难度
function updateGameDifficulty() {
    // 根据分数调整游戏速度
    const speedFactor = Math.min(1, gameState.score / 500); // 最大加速100%
    const newSpeed = config.initialSpeed * (1 - speedFactor * 0.6); // 最多减少60%的延迟
    
    gameState.gameSpeed = Math.max(50, Math.floor(newSpeed));
}

// 检查碰撞
function checkCollision() {
    const head = gameState.snake[0];
    
    // 检查是否撞墙
    if (head.x < 0 || head.x >= gameState.gridWidth || head.y < 0 || head.y >= gameState.gridHeight) {
        return true;
    }
    
    // 检查是否撞到自己
    for (let i = 1; i < gameState.snake.length; i++) {
        if (head.x === gameState.snake[i].x && head.y === gameState.snake[i].y) {
            return true;
        }
    }
    
    return false;
}

// 渲染游戏
function render() {
    // 清空画布
    elements.ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    
    // 绘制网格（可选）
    drawGrid();
    
    // 绘制蛇
    drawSnake();
    
    // 绘制食物
    drawFood();
    
    // 绘制分数动画
    drawScoreAnimations();
    
    // 如果游戏暂停，显示暂停文字
    if (gameState.isPaused) {
        drawPauseOverlay();
    }
}

// 绘制分数动画
function drawScoreAnimations() {
    // 更新和绘制所有分数动画
    gameState.scoreAnimations = gameState.scoreAnimations.filter(anim => {
        // 更新动画状态
        anim.life--;
        anim.yOffset -= 1;
        anim.alpha = anim.life / 60;
        
        // 绘制动画
        elements.ctx.fillStyle = `rgba(255, 255, 255, ${anim.alpha})`;
        elements.ctx.font = 'bold 16px Arial';
        elements.ctx.textAlign = 'center';
        elements.ctx.fillText(
            '+' + anim.points,
            anim.x,
            anim.y + anim.yOffset
        );
        
        // 只保留还活着的动画
        return anim.life > 0;
    });
}

// 绘制暂停覆盖层
function drawPauseOverlay() {
    // 半透明背景
    elements.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    elements.ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
    
    // 暂停文字
    elements.ctx.fillStyle = 'white';
    elements.ctx.font = 'bold 30px Arial';
    elements.ctx.textAlign = 'center';
    elements.ctx.fillText(
        '暂停',
        elements.canvas.width / 2,
        elements.canvas.height / 2
    );
    
    elements.ctx.font = '16px Arial';
    elements.ctx.fillText(
        '按空格键继续',
        elements.canvas.width / 2,
        elements.canvas.height / 2 + 30
    );
}

// 绘制网格
function drawGrid() {
    elements.ctx.strokeStyle = '#ddd';
    elements.ctx.lineWidth = 0.5;
    
    // 绘制垂直线
    for (let x = 0; x <= gameState.gridWidth; x++) {
        elements.ctx.beginPath();
        elements.ctx.moveTo(x * config.gridSize, 0);
        elements.ctx.lineTo(x * config.gridSize, elements.canvas.height);
        elements.ctx.stroke();
    }
    
    // 绘制水平线
    for (let y = 0; y <= gameState.gridHeight; y++) {
        elements.ctx.beginPath();
        elements.ctx.moveTo(0, y * config.gridSize);
        elements.ctx.lineTo(elements.canvas.width, y * config.gridSize);
        elements.ctx.stroke();
    }
}

// 绘制蛇
function drawSnake() {
    gameState.snake.forEach((segment, index) => {
        // 设置颜色 - 蛇头和蛇身颜色不同
        if (index === 0) {
            elements.ctx.fillStyle = '#4CAF50'; // 蛇头绿色
        } else {
            elements.ctx.fillStyle = '#8BC34A'; // 蛇身浅绿色
        }
        
        // 绘制蛇的身体部分
        elements.ctx.fillRect(
            segment.x * config.gridSize,
            segment.y * config.gridSize,
            config.gridSize,
            config.gridSize
        );
        
        // 添加边框
        elements.ctx.strokeStyle = '#333';
        elements.ctx.lineWidth = 1;
        elements.ctx.strokeRect(
            segment.x * config.gridSize,
            segment.y * config.gridSize,
            config.gridSize,
            config.gridSize
        );
    });
}

// 绘制食物
function drawFood() {
    const foodConfig = config.foodTypes[gameState.foodType];
    elements.ctx.fillStyle = foodConfig.color;
    
    // 绘制食物基本形状
    elements.ctx.fillRect(
        gameState.food.x * config.gridSize,
        gameState.food.y * config.gridSize,
        config.gridSize,
        config.gridSize
    );
    
    // 为特殊食物添加视觉效果
    if (gameState.foodType !== 0) {
        // 添加闪烁效果
        const blinkRate = 1000; // 毫秒
        const blinkState = Math.floor(Date.now() / blinkRate) % 2;
        
        if (blinkState === 0) {
            elements.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            elements.ctx.fillRect(
                gameState.food.x * config.gridSize + 2,
                gameState.food.y * config.gridSize + 2,
                config.gridSize - 4,
                config.gridSize - 4
            );
        }
        
        // 显示分数
        elements.ctx.fillStyle = 'white';
        elements.ctx.font = '10px Arial';
        elements.ctx.textAlign = 'center';
        elements.ctx.fillText(
            '+' + foodConfig.points,
            gameState.food.x * config.gridSize + config.gridSize / 2,
            gameState.food.y * config.gridSize + config.gridSize / 2 + 3
        );
    }
    
    // 添加边框
    elements.ctx.strokeStyle = '#333';
    elements.ctx.lineWidth = 1;
    elements.ctx.strokeRect(
        gameState.food.x * config.gridSize,
        gameState.food.y * config.gridSize,
        config.gridSize,
        config.gridSize
    );
}

// 游戏循环
function gameLoop() {
    if (gameState.isPaused || gameState.isGameOver) return;
    
    moveSnake();
    
    if (checkCollision()) {
        gameOver();
        return;
    }
    
    render();
    
    // 设置下一次循环
    gameState.gameLoopId = setTimeout(gameLoop, gameState.gameSpeed);
}

// 游戏结束
function gameOver() {
    gameState.isGameOver = true;
    clearTimeout(gameState.gameLoopId);
    
    // 清除食物计时器
    if (gameState.foodTimer) {
        clearTimeout(gameState.foodTimer);
    }
    
    // 播放游戏结束音效
    if (sounds.gameOver) {
        sounds.gameOver.currentTime = 0;
        sounds.gameOver.play();
    }
    
    // 显示游戏结束屏幕
    elements.finalScoreElement.textContent = gameState.score;
    elements.gameOverScreen.style.display = 'block';
    
    // 记录游戏结果
    recordGameResult();
}

// 记录游戏结果
function recordGameResult() {
    // 简单的游戏结果分析
    const gameStats = {
        score: gameState.score,
        snakeLength: gameState.snake.length,
        date: new Date().toISOString()
    };
    
    // 可以将游戏结果存储到localStorage或发送到服务器
    console.log('游戏结果:', gameStats);
}

// 开始游戏
function startGame() {
    if (gameState.gameLoopId) {
        clearTimeout(gameState.gameLoopId);
    }
    
    gameState.isPaused = false;
    gameLoop();
}

// 暂停游戏
function pauseGame() {
    gameState.isPaused = !gameState.isPaused;
    
    if (!gameState.isPaused && !gameState.isGameOver) {
        gameLoop();
    }
}

// 添加事件监听器
function addEventListeners() {
    // 键盘控制
    document.addEventListener('keydown', handleKeyPress);
    
    // 按钮控制
    elements.startButton.addEventListener('click', startGame);
    elements.pauseButton.addEventListener('click', pauseGame);
    elements.restartButton.addEventListener('click', () => {
        resetGame();
        startGame();
    });
    elements.playAgainButton.addEventListener('click', () => {
        resetGame();
        startGame();
    });
    
    // 主题切换按钮
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // 难度选择按钮
    elements.difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const difficulty = button.dataset.difficulty;
            setDifficulty(difficulty);
        });
    });
    
    // 添加触摸控制
    addTouchControls();
}

// 处理窗口大小变化
function handleResize() {
    if (gameState.isGameOver) return;
    
    // 调整画布大小
    const containerWidth = window.innerWidth > 600 ? 400 : window.innerWidth - 40;
    const containerHeight = window.innerHeight > 600 ? 400 : window.innerHeight - 200;
    const size = Math.min(containerWidth, containerHeight);
    
    elements.canvas.width = size;
    elements.canvas.height = size;
    
    // 重新计算网格尺寸
    gameState.gridWidth = Math.floor(elements.canvas.width / config.gridSize);
    gameState.gridHeight = Math.floor(elements.canvas.height / config.gridSize);
    
    // 重新渲染
    render();
}

// 切换主题
function toggleTheme() {
    const body = document.body;
    const isDarkTheme = body.classList.toggle('dark-theme');
    
    // 保存主题设置
    localStorage.setItem('snakeTheme', isDarkTheme ? 'dark' : 'light');
    
    // 更新按钮文本
    elements.themeToggle.textContent = isDarkTheme ? '切换到亮色主题' : '切换到暗色主题';
}

// 设置难度
function setDifficulty(difficulty) {
    // 移除所有按钮的active类
    elements.difficultyButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // 激活选中的按钮
    const activeButton = document.querySelector(`.difficulty-btn[data-difficulty="${difficulty}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // 更新配置
    config.currentDifficulty = difficulty;
    
    // 保存难度设置
    localStorage.setItem('snakeDifficulty', difficulty);
    
    // 如果游戏没有开始，更新游戏速度
    if (!gameState.gameLoopId && !gameState.isGameOver) {
        const diffConfig = config.difficulties[difficulty];
        gameState.gameSpeed = diffConfig.initialSpeed;
    }
}

// 加载设置
function loadSettings() {
    // 加载主题设置
    const savedTheme = localStorage.getItem('snakeTheme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        elements.themeToggle.textContent = '切换到亮色主题';
    } else {
        elements.themeToggle.textContent = '切换到暗色主题';
    }
    
    // 加载难度设置
    const savedDifficulty = localStorage.getItem('snakeDifficulty');
    if (savedDifficulty && config.difficulties[savedDifficulty]) {
        setDifficulty(savedDifficulty);
    } else {
        setDifficulty('easy'); // 默认简单难度
    }
}

// 更新游戏难度
function updateGameDifficulty() {
    // 根据当前难度和分数调整游戏速度
    const difficulty = config.difficulties[config.currentDifficulty];
    const speedFactor = Math.min(1, gameState.score / 500); // 最大加速100%
    const newSpeed = difficulty.initialSpeed * (1 - speedFactor * 0.6); // 最多减少60%的延迟
    
    gameState.gameSpeed = Math.max(50, Math.floor(newSpeed));
}

// 添加触摸控制
function addTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;
    
    elements.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: false });
    
    elements.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });
    
    elements.canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        
        if (!e.changedTouches.length) return;
        
        const touch = e.changedTouches[0];
        const touchEndX = touch.clientX;
        const touchEndY = touch.clientY;
        
        // 计算滑动方向
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        
        // 确定主要滑动方向
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // 水平滑动
            if (diffX > 0 && gameState.direction !== 'left') {
                gameState.nextDirection = 'right';
            } else if (diffX < 0 && gameState.direction !== 'right') {
                gameState.nextDirection = 'left';
            }
        } else {
            // 垂直滑动
            if (diffY > 0 && gameState.direction !== 'up') {
                gameState.nextDirection = 'down';
            } else if (diffY < 0 && gameState.direction !== 'down') {
                gameState.nextDirection = 'up';
            }
        }
    }, { passive: false });
    
    // 添加虚拟方向键（移动设备）
    if (window.innerWidth < 768) {
        addVirtualButtons();
    }
}

// 添加虚拟方向键
function addVirtualButtons() {
    const virtualControls = document.createElement('div');
    virtualControls.className = 'virtual-controls';
    virtualControls.innerHTML = `
        <div class="virtual-btn" id="btn-up">↑</div>
        <div class="virtual-btn" id="btn-left">←</div>
        <div class="virtual-btn" id="btn-down">↓</div>
        <div class="virtual-btn" id="btn-right">→</div>
    `;
    
    document.body.appendChild(virtualControls);
    
    // 添加虚拟按钮样式
    const style = document.createElement('style');
    style.textContent = `
        .virtual-controls {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 200px;
            height: 200px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(3, 1fr);
            gap: 5px;
            z-index: 100;
        }
        .virtual-btn {
            background-color: rgba(0, 0, 0, 0.5);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 24px;
            border-radius: 50%;
            touch-action: manipulation;
            user-select: none;
        }
        #btn-up {
            grid-column: 2;
            grid-row: 1;
        }
        #btn-left {
            grid-column: 1;
            grid-row: 2;
        }
        #btn-down {
            grid-column: 2;
            grid-row: 3;
        }
        #btn-right {
            grid-column: 3;
            grid-row: 2;
        }
    `;
    document.head.appendChild(style);
    
    // 添加按钮事件
    document.getElementById('btn-up').addEventListener('click', () => {
        if (gameState.direction !== 'down') {
            gameState.nextDirection = 'up';
        }
    });
    
    document.getElementById('btn-left').addEventListener('click', () => {
        if (gameState.direction !== 'right') {
            gameState.nextDirection = 'left';
        }
    });
    
    document.getElementById('btn-down').addEventListener('click', () => {
        if (gameState.direction !== 'up') {
            gameState.nextDirection = 'down';
        }
    });
    
    document.getElementById('btn-right').addEventListener('click', () => {
        if (gameState.direction !== 'left') {
            gameState.nextDirection = 'right';
        }
    });
}

// 处理键盘按下事件
function handleKeyPress(event) {
    // 防止默认行为
    event.preventDefault();
    
    // 方向控制
    switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (gameState.direction !== 'down') {
                gameState.nextDirection = 'up';
            }
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (gameState.direction !== 'up') {
                gameState.nextDirection = 'down';
            }
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (gameState.direction !== 'right') {
                gameState.nextDirection = 'left';
            }
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (gameState.direction !== 'left') {
                gameState.nextDirection = 'right';
            }
            break;
        case ' ': // 空格键暂停/继续
            pauseGame();
            break;
    }
}

// 页面加载完成后初始化游戏
window.addEventListener('DOMContentLoaded', initGame);