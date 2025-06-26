// ===============================
// ЛАБИРИНТ ПОГОНИ - GAME ENGINE
// ===============================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const minimapCtx = minimap.getContext('2d');

// Игровые константы
const GAME_CONFIG = {
    worldWidth: 2340, // Увеличено на 30% с 1800 до 2340
    worldHeight: 1175, // Поднята нижняя граница на пол блока (было 1200)
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    cellSize: 50,
    catchDistance: 45,
    roundTime: 120, // 2 минуты на раунд
    boosterLifetime: 15000, // 15 секунд
    boosterSpawnRate: 0.008, // Увеличено с 0.002 до 0.008 для более частого появления
    totalRounds: 5, // Добавляем общее количество раундов
    // Переменные для равномерного появления бустеров
    lastBoosterSpawnTime: 0,
    minBoosterInterval: 4000, // Минимальный интервал между бустерами (4 секунды)
    maxBoosterInterval: 6000, // Максимальный интервал между бустерами (6 секунд)
    targetBoosterCount: 6, // Уменьшаем целевое количество бустеров для более равномерного появления
    initialBoosterDelay: 2000 // Задержка перед первым бустером (2 секунды)
};

// Состояние игры
let gameState = {
    mode: 'start', // start, playing, ended
    startTime: 0,
    roundNumber: 1,
    winner: null,
    gameTime: 0,
    scores: { // Добавляем счет
        hunter: 0,
        prey: 0
    }
};

// Выбор персонажей
let characterSelection = {
    hunter: null, // 'punk' или 'businessman'
    prey: null    // 'punk' или 'businessman'
};

// Конфигурация игроков для текущей игры
let playerConfig = null;

// Динамические игроки (создаются в зависимости от выбора)
let hunterPlayer = null;
let preyPlayer = null;

// Игроки
const players = {
    punk: {
        x: 100,
        y: 100,
        width: 35,
        height: 45,
        speed: 0,
        maxSpeed: 7,
        acceleration: 0.6,
        angle: 0,
        boosts: new Map(),
        trail: [],
        isGhost: false,
        ghostCooldown: 0,
        actionPressed: false,
        lastSafeX: 100,
        lastSafeY: 100,
        // Свойства для анимации гиганта
        originalWidth: 35,
        originalHeight: 45,
        giantScale: 1,
        giantAnimationTime: 0,
        isGiant: false,
        lastWallBreakTime: 0
    },
    businessman: {
        x: GAME_CONFIG.worldWidth - 150,
        y: GAME_CONFIG.worldHeight - 150,
        width: 30,
        height: 40,
        speed: 0,
        maxSpeed: 7,
        acceleration: 0.5,
        angle: 0,
        boosts: new Map(),
        trail: [],
        isGhost: false,
        ghostCooldown: 0,
        actionPressed: false,
        lastSafeX: GAME_CONFIG.worldWidth - 150,
        lastSafeY: GAME_CONFIG.worldHeight - 150,
        // Свойства для анимации гиганта
        originalWidth: 30,
        originalHeight: 40,
        giantScale: 1,
        giantAnimationTime: 0,
        isGiant: false,
        lastWallBreakTime: 0
    },
    kok: {
        x: 100,
        y: 100,
        width: 32,
        height: 42,
        speed: 0,
        maxSpeed: 7,
        acceleration: 0.55,
        angle: 0,
        boosts: new Map(),
        trail: [],
        isGhost: false,
        ghostCooldown: 0,
        actionPressed: false,
        lastSafeX: 100,
        lastSafeY: 100,
        // Свойства для анимации гиганта
        originalWidth: 32,
        originalHeight: 42,
        giantScale: 1,
        giantAnimationTime: 0,
        isGiant: false,
        lastWallBreakTime: 0
    },
    maks: {
        x: 100,
        y: 100,
        width: 38, // На 20% шире чем у Степы (32 * 1.2 = 38.4, округляем до 38)
        height: 42,
        speed: 0,
        maxSpeed: 7,
        acceleration: 0.55,
        angle: 0,
        boosts: new Map(),
        trail: [],
        isGhost: false,
        ghostCooldown: 0,
        actionPressed: false,
        lastSafeX: 100,
        lastSafeY: 100,
        // Свойства для анимации гиганта
        originalWidth: 38,
        originalHeight: 42,
        giantScale: 1,
        giantAnimationTime: 0,
        isGiant: false,
        lastWallBreakTime: 0
    }
};

// Управление
const keys = {};
const controls = {
    punk: {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
        action: 'Slash'
    },
    businessman: {
        up: 'KeyW',
        down: 'KeyS',
        left: 'KeyA',
        right: 'KeyD',
        action: 'KeyE'
    },
    kok: {
        up: 'KeyW',
        down: 'KeyS',
        left: 'KeyA',
        right: 'KeyD',
        action: 'KeyE'
    },
    maks: {
        up: 'KeyW',
        down: 'KeyS',
        left: 'KeyA',
        right: 'KeyD',
        action: 'KeyE'
    }
};

// Лабиринт и объекты
let maze = [];
let boosters = [];
let particles = [];
let walls = [];

// Типы бустеров
const BOOSTER_TYPES = {
    speed: {
        color: '#00ff88',
        glowColor: 'rgba(0, 255, 136, 0.8)',
        symbol: '⚡',
        name: 'Скорость',
        duration: 5000
    },
    ghost: {
        color: '#9c88ff',
        glowColor: 'rgba(156, 136, 255, 0.8)',
        symbol: '👻',
        name: 'Призрак',
        duration: 4000
    },
    teleport: {
        color: '#ff6b35',
        glowColor: 'rgba(255, 107, 53, 0.8)',
        symbol: '🎯',
        name: 'Телепорт',
        duration: 0, // Мгновенный эффект
        distance: 450 // Увеличено с 300 до 450 (на 50% дальше)
    },
    giant: {
        color: '#ffd700',
        glowColor: 'rgba(255, 215, 0, 0.8)',
        symbol: '🦾',
        name: 'Гигант',
        duration: 3000
    }
};

// ===============================
// СОБЫТИЯ И МУЗЫКА
// ===============================

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    e.preventDefault();
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    e.preventDefault();
});

// Обработчик полноэкранного режима
document.addEventListener('keydown', (e) => {
    if (e.code === 'F11') {
        e.preventDefault();
        toggleFullscreen();
    }
});

function toggleFullscreen() {
    const gameContainer = document.querySelector('.game-container');
    if (!document.fullscreenElement) {
        if (gameContainer.requestFullscreen) {
            gameContainer.requestFullscreen();
        } else if (gameContainer.webkitRequestFullscreen) {
            gameContainer.webkitRequestFullscreen();
        } else if (gameContainer.msRequestFullscreen) {
            gameContainer.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// Обработчик изменения размера окна
window.addEventListener('resize', () => {
    if (document.fullscreenElement) {
        // Восстанавливаем оригинальные размеры
        canvas.width = 1680; // Увеличено на 20% с 1400 до 1680
        canvas.height = 900;
        
        // Обновляем конфигурацию игры
        GAME_CONFIG.canvasWidth = 1680; // Увеличено на 20% с 1400 до 1680
        GAME_CONFIG.canvasHeight = 900;
    }
});

// ===============================
// ДИНАМИЧЕСКАЯ МУЗЫКАЛЬНАЯ СИСТЕМА
// ===============================

// Новая функция для управления музыкой
function playMusic(type) {
    const music = document.getElementById('backgroundMusic');
    switch(type) {
        case 'chase': music.src = 'assets/music/chase.mp3'; break;
        case 'stealth': music.src = 'assets/music/stealth.mp3'; break;
        case 'victory': music.src = 'assets/music/victory.mp3'; break;
        case 'defeat': music.src = 'assets/music/defeat.mp3'; break;
    }
    music.play();
}

// Обновляем функцию playBackgroundMusic
function playBackgroundMusic() {
    playMusic('chase'); // Запускаем chase.mp3 по умолчанию
}

// ===============================
// ГЕНЕРАЦИЯ ЛАБИРИНТА
// ===============================

function generateMaze() {
    const cols = Math.floor(GAME_CONFIG.worldWidth / GAME_CONFIG.cellSize);
    const rows = Math.floor(GAME_CONFIG.worldHeight / GAME_CONFIG.cellSize);
    
    // Инициализация сетки
    maze = Array(rows).fill().map(() => Array(cols).fill(1));
    walls = [];
    
    // Алгоритм рекурсивного обхода для создания лабиринта
    function carvePassages(x, y) {
        maze[y][x] = 0;
        
        const directions = [
            [0, -2], [2, 0], [0, 2], [-2, 0]
        ].sort(() => Math.random() - 0.5);
        
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && maze[ny][nx] === 1) {
                maze[y + dy/2][x + dx/2] = 0;
                carvePassages(nx, ny);
            }
        }
    }
    
    // Начинаем с верхнего левого угла
    carvePassages(1, 1);
    
    // Убеждаемся что стартовые позиции свободны
    maze[1][1] = 0;
    maze[1][2] = 0;
    maze[2][1] = 0;
    
    const endX = cols - 2;
    const endY = rows - 2;
    maze[endY][endX] = 0;
    maze[endY-1][endX] = 0;
    maze[endY][endX-1] = 0;
    
    // Создаем дополнительные проходы для более интересного геймплея
    for (let i = 0; i < Math.floor(rows * cols * 0.08); i++) {
        const x = Math.floor(Math.random() * cols);
        const y = Math.floor(Math.random() * rows);
        if (maze[y] && maze[y][x] !== undefined) {
            maze[y][x] = 0;
        }
    }
    
    // Конвертируем в стены для коллизий
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (maze[y][x] === 1) {
                walls.push({
                    x: x * GAME_CONFIG.cellSize,
                    y: y * GAME_CONFIG.cellSize,
                    width: GAME_CONFIG.cellSize,
                    height: GAME_CONFIG.cellSize
                });
            }
        }
    }
}

// ===============================
// ЧАСТИЦЫ И ЭФФЕКТЫ
// ===============================

class Particle {
    constructor(x, y, color, velocity, life, size = 3) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = velocity;
        this.life = life;
        this.maxLife = life;
        this.size = size;
        this.gravity = Math.random() * 0.5;
    }

    update(deltaTime) {
        this.x += this.velocity.x * deltaTime / 16.67;
        this.y += this.velocity.y * deltaTime / 16.67;
        this.velocity.y += this.gravity;
        this.life -= deltaTime;
        this.size *= 0.99;
    }

    draw(ctx, offsetX, offsetY) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x - offsetX, this.y - offsetY, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function createParticles(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = Math.random() * 150 + 50;
        const velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        particles.push(new Particle(x, y, color, velocity, 2000, Math.random() * 6 + 2));
    }
}

// ===============================
// КОЛЛИЗИИ
// ===============================

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function checkWallCollision(player, newX, newY) {
    if (player.isGhost) return false;
    
    // Проверка границ мира с дополнительным отступом
    const borderMargin = 10;
    if (newX < borderMargin || 
        newY < borderMargin || 
        newX + player.width > GAME_CONFIG.worldWidth - borderMargin || 
        newY + player.height > GAME_CONFIG.worldHeight - borderMargin) {
        return true;
    }
    
    const testRect = {
        x: newX + 5, // Увеличенный отступ
        y: newY + 5,
        width: player.width - 10,
        height: player.height - 10
    };
    
    return walls.some(wall => checkCollision(testRect, wall));
}

function getDistanceBetweenPlayers() {
    if (!hunterPlayer || !preyPlayer) return 1000;
    
    const dx = hunterPlayer.x - preyPlayer.x;
    const dy = hunterPlayer.y - preyPlayer.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// ===============================
// БУСТЕРЫ
// ===============================

function spawnBooster() {
    const cols = Math.floor(GAME_CONFIG.worldWidth / GAME_CONFIG.cellSize);
    const rows = Math.floor(GAME_CONFIG.worldHeight / GAME_CONFIG.cellSize);
    
    let attempts = 0;
    let x, y;
    
    do {
        const col = Math.floor(Math.random() * cols);
        const row = Math.floor(Math.random() * rows);
        x = col * GAME_CONFIG.cellSize + GAME_CONFIG.cellSize / 2 - 15;
        y = row * GAME_CONFIG.cellSize + GAME_CONFIG.cellSize / 2 - 15;
        attempts++;
    } while (
        // Проверяем что позиция не в стене
        (maze[Math.floor(y / GAME_CONFIG.cellSize)] && 
         maze[Math.floor(y / GAME_CONFIG.cellSize)][Math.floor(x / GAME_CONFIG.cellSize)] === 1) ||
        // Проверяем что позиция не за границей игровой зоны (оставляем отступ 100px от границы)
        y > GAME_CONFIG.worldHeight - 150 ||
        attempts < 50
    );
    
    const types = Object.keys(BOOSTER_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    
    boosters.push({
        x: x,
        y: y,
        width: 30,
        height: 30,
        type: type,
        collected: false,
        rotation: 0,
        pulse: 0,
        lifetime: GAME_CONFIG.boosterLifetime,
        opacity: 1
    });
}

function updateBoosters(deltaTime) {
    boosters = boosters.filter(booster => {
        if (booster.collected) return false;
        
        booster.lifetime -= deltaTime;
        booster.rotation += 0.05;
        booster.pulse += 0.1;
        
        // Эффект исчезновения
        if (booster.lifetime < 3000) {
            booster.opacity = booster.lifetime / 3000;
        }
        
        return booster.lifetime > 0;
    });
}

function checkBoosterCollisions(player) {
    boosters.forEach(booster => {
        if (!booster.collected && checkCollision(player, booster)) {
            booster.collected = true;
            
            const boosterType = BOOSTER_TYPES[booster.type];
            
            // Создаем частицы
            createParticles(
                booster.x + booster.width / 2,
                booster.y + booster.height / 2,
                boosterType.color,
                20
            );
            
            // Специальная обработка для телепорта
            if (booster.type === 'teleport') {
                // Телепорт применяется мгновенно
                teleportPlayer(player);
            } else if (booster.type === 'giant') {
                // Гигант применяется с эффектом разрушения стен
                player.boosts.set(booster.type, {
                    duration: boosterType.duration,
                    startTime: Date.now()
                });
                
                // Создаем эффект активации гиганта
                createParticles(
                    player.x + player.width / 2,
                    player.y + player.height / 2,
                    BOOSTER_TYPES.giant.color,
                    30
                );
            } else {
                // Для остальных бустеров применяем эффект
                player.boosts.set(booster.type, {
                    duration: boosterType.duration,
                    startTime: Date.now()
                });
            }
        }
    });
}

// ===============================
// ТЕЛЕПОРТАЦИЯ
// ===============================

function teleportPlayer(player) {
    // Всегда телепортируем в направлении, куда смотрит персонаж
    const teleportDirection = {
        x: Math.cos(player.angle),
        y: Math.sin(player.angle)
    };
    
    const teleportDistance = BOOSTER_TYPES.teleport.distance;
    const targetX = player.x + teleportDirection.x * teleportDistance;
    const targetY = player.y + teleportDirection.y * teleportDistance;
    
    // Проверяем, что целевая позиция находится в пределах мира
    const clampedX = Math.max(0, Math.min(GAME_CONFIG.worldWidth - player.width, targetX));
    const clampedY = Math.max(0, Math.min(GAME_CONFIG.worldHeight - player.height, targetY));
    
    // Проверяем коллизии со стенами
    if (!checkWallCollision(player, clampedX, clampedY)) {
        // Создаем эффект исчезновения в исходной позиции
        createParticles(
            player.x + player.width / 2,
            player.y + player.height / 2,
            BOOSTER_TYPES.teleport.color,
            30
        );
        
        // Телепортируем игрока
        player.x = clampedX;
        player.y = clampedY;
        player.lastSafeX = clampedX;
        player.lastSafeY = clampedY;
        
        // Создаем эффект появления в новой позиции
        createParticles(
            player.x + player.width / 2,
            player.y + player.height / 2,
            BOOSTER_TYPES.teleport.color,
            30
        );
        
        return true; // Успешная телепортация
    } else {
        // Если целевая позиция заблокирована, ищем ближайшую свободную позицию
        const directions = [];
        const steps = 24; // Увеличиваем количество направлений для лучшего поиска
        
        // Создаем спиральный паттерн поиска с разными дистанциями
        for (let i = 0; i < steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            // Используем разные дистанции: от 60% до 120% от базовой дистанции
            const distanceMultiplier = 0.6 + (i / steps) * 0.6;
            const distance = teleportDistance * distanceMultiplier;
            directions.push({
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance
            });
        }
        
        // Сортируем направления по расстоянию от текущей позиции (ближайшие сначала)
        directions.sort((a, b) => {
            const distA = Math.hypot(a.x, a.y);
            const distB = Math.hypot(b.x, b.y);
            return distA - distB;
        });
        
        // Ищем безопасную позицию
        for (const dir of directions) {
            const testX = player.x + dir.x;
            const testY = player.y + dir.y;
            const clampedTestX = Math.max(0, Math.min(GAME_CONFIG.worldWidth - player.width, testX));
            const clampedTestY = Math.max(0, Math.min(GAME_CONFIG.worldHeight - player.height, testY));
            
            if (!checkWallCollision(player, clampedTestX, clampedTestY)) {
                // Создаем эффект исчезновения
                createParticles(
                    player.x + player.width / 2,
                    player.y + player.height / 2,
                    BOOSTER_TYPES.teleport.color,
                    30
                );
                
                // Телепортируем игрока
                player.x = clampedTestX;
                player.y = clampedTestY;
                player.lastSafeX = clampedTestX;
                player.lastSafeY = clampedTestY;
                
                // Создаем эффект появления
                createParticles(
                    player.x + player.width / 2,
                    player.y + player.height / 2,
                    BOOSTER_TYPES.teleport.color,
                    30
                );
                
                return true; // Успешная телепортация
            }
        }
        
        // Если не нашли безопасную позицию, попробуем телепортироваться на минимальную дистанцию
        const minDistance = 100;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const testX = player.x + Math.cos(angle) * minDistance;
            const testY = player.y + Math.sin(angle) * minDistance;
            const clampedTestX = Math.max(0, Math.min(GAME_CONFIG.worldWidth - player.width, testX));
            const clampedTestY = Math.max(0, Math.min(GAME_CONFIG.worldHeight - player.height, testY));
            
            if (!checkWallCollision(player, clampedTestX, clampedTestY)) {
                // Создаем эффект исчезновения
                createParticles(
                    player.x + player.width / 2,
                    player.y + player.height / 2,
                    BOOSTER_TYPES.teleport.color,
                    20
                );
                
                // Телепортируем игрока
                player.x = clampedTestX;
                player.y = clampedTestY;
                player.lastSafeX = clampedTestX;
                player.lastSafeY = clampedTestY;
                
                // Создаем эффект появления
                createParticles(
                    player.x + player.width / 2,
                    player.y + player.height / 2,
                    BOOSTER_TYPES.teleport.color,
                    20
                );
                
                return true; // Успешная телепортация на минимальную дистанцию
            }
        }
    }
    
    return false; // Не удалось телепортироваться
}

// ===============================
// ОБНОВЛЕНИЕ ИГРОКА
// ===============================

function updatePlayer(player, controls, deltaTime, characterType) {
    // Обновляем кулдаун призрака/телепорта
    if (player.ghostCooldown > 0) {
        player.ghostCooldown -= deltaTime;
    }
    
    // Обработка кнопки действия
    if (keys[controls.action] && !player.actionPressed && player.ghostCooldown <= 0) {
        player.actionPressed = true;
        player.ghostCooldown = 5000; // 5 секунд кулдаун
        
        // Разные способности в зависимости от типа персонажа
        if (characterType === 'punk') {
            // Призрак для панка
            player.boosts.set('ghost', {
                duration: 1000,
                startTime: Date.now()
            });
            
            // Создаем эффект активации призрака
            createParticles(
                player.x + player.width / 2,
                player.y + player.height / 2,
                '#9c88ff',
                15
            );
        } else if (characterType === 'businessman') {
            // Телепортация для бизнесмена
            if (teleportPlayer(player)) {
                player.ghostCooldown = 5000; // 5 секунд кулдаун для телепорта
                // Создаём эффект активации телепорта
                createParticles(
                    player.x + player.width / 2,
                    player.y + player.height / 2,
                    BOOSTER_TYPES.teleport.color,
                    20
                );
            }
        } else if (characterType === 'kok') {
            // Ускорение для Степы Кок
            player.boosts.set('speed', {
                duration: 2000, // 2 секунды ускорения
                startTime: Date.now()
            });
            
            // Создаем эффект активации ускорения
            createParticles(
                player.x + player.width / 2,
                player.y + player.height / 2,
                '#00ff88',
                20
            );
        } else if (characterType === 'maks') {
            // Гигант для Макса Здорового
            player.boosts.set('giant', {
                duration: 1500, // 1.5 секунды гиганта
                startTime: Date.now()
            });
            
            // Создаем эффект активации гиганта
            createParticles(
                player.x + player.width / 2,
                player.y + player.height / 2,
                '#ffd700', // Желтый цвет как у бустера гиганта
                25
            );
            
            // Кулдаун 5 секунд для Макса
            player.ghostCooldown = 5000;
        }
    }
    
    // Сброс флага кнопки когда отпускают
    if (!keys[controls.action]) {
        player.actionPressed = false;
    }
    
    // Обновляем бустеры
    for (const [type, boost] of player.boosts) {
        boost.duration -= deltaTime;
        if (boost.duration <= 0) {
            player.boosts.delete(type);
        }
    }
    
    // Обновляем анимацию гиганта
    if (player.boosts.has('giant')) {
        player.isGiant = true;
        player.giantAnimationTime += deltaTime;
        
        // Плавная анимация увеличения до 2x размера
        const animationDuration = 500; // 0.5 секунды на анимацию
        if (player.giantAnimationTime <= animationDuration) {
            const progress = player.giantAnimationTime / animationDuration;
            player.giantScale = 1 + progress; // От 1x до 2x
        } else {
            player.giantScale = 2; // Максимальный размер 2x
        }
        
        // Обновляем размеры игрока
        player.width = player.originalWidth * player.giantScale;
        player.height = player.originalHeight * player.giantScale;
        
        // Постоянное разрушение стен во время действия бустера
        // Проверяем каждые 200ms для плавности
        if (!player.lastWallBreakTime || Date.now() - player.lastWallBreakTime > 200) {
            breakWalls(player);
            player.lastWallBreakTime = Date.now();
        }
    } else {
        // Возвращаем к нормальному размеру
        if (player.isGiant) {
            player.isGiant = false;
            player.giantAnimationTime = 0;
            player.giantScale = 1;
            player.width = player.originalWidth;
            player.height = player.originalHeight;
            player.lastWallBreakTime = 0; // Сбрасываем таймер
        }
    }
    
    // Применяем эффекты бустеров
    player.maxSpeed = player.characterType === 'punk' ? 7 : 
                     player.characterType === 'businessman' ? 7 : 7;
    player.isGhost = false;
    
    if (player.boosts.has('speed')) {
        if (player.characterType === 'kok') {
            player.maxSpeed *= 1.3; // Ускорение в 1.3 раза для Степы Кок
        } else {
            player.maxSpeed *= 1.6; // Обычное ускорение для бустеров
        }
    }
    if (player.boosts.has('ghost')) {
        player.isGhost = true;
    }
    
    // Управление
    let moveX = 0;
    let moveY = 0;
    
    if (keys[controls.left]) moveX -= 1;
    if (keys[controls.right]) moveX += 1;
    if (keys[controls.up]) moveY -= 1;
    if (keys[controls.down]) moveY += 1;
    
    // Нормализация диагонального движения
    if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.707;
        moveY *= 0.707;
    }
    
    // Применение движения
    if (moveX !== 0 || moveY !== 0) {
        player.speed = Math.min(player.speed + player.acceleration, player.maxSpeed);
        player.angle = Math.atan2(moveY, moveX);
    } else {
        player.speed = Math.max(player.speed - player.acceleration * 2, 0);
    }
    
    // Вычисление новой позиции с более мягкой проверкой коллизий
    const moveSpeed = player.speed;
    const newX = player.x + Math.cos(player.angle) * moveSpeed;
    const newY = player.y + Math.sin(player.angle) * moveSpeed;
    
    // Сохраняем последнюю безопасную позицию
    if (!checkWallCollision(player, player.x, player.y)) {
        player.lastSafeX = player.x;
        player.lastSafeY = player.y;
    }
    
    // Проверка коллизий со стенами с отступом
    const margin = 2; // Отступ от стен
    if (!checkWallCollision(player, newX, player.y)) {
        player.x = newX;
    } else {
        // Попытка скольжения по стене
        if (!checkWallCollision(player, player.x + Math.cos(player.angle) * moveSpeed * 0.3, player.y)) {
            player.x += Math.cos(player.angle) * moveSpeed * 0.3;
        }
    }
    
    if (!checkWallCollision(player, player.x, newY)) {
        player.y = newY;
    } else {
        // Попытка скольжения по стене
        if (!checkWallCollision(player, player.x, player.y + Math.sin(player.angle) * moveSpeed * 0.3)) {
            player.y += Math.sin(player.angle) * moveSpeed * 0.3;
        }
    }
    
    // Проверка на застревание в стене после призрака
    if (!player.isGhost && checkWallCollision(player, player.x, player.y)) {
        // Сначала пробуем вернуться на последнюю безопасную позицию
        if (!checkWallCollision(player, player.lastSafeX, player.lastSafeY)) {
            player.x = player.lastSafeX;
            player.y = player.lastSafeY;
        } else {
            // Если не получилось, используем улучшенный механизм выталкивания
            const directions = [];
            const steps = 64; // Увеличиваем количество направлений для более точного поиска
            const maxDistance = 150; // Увеличиваем максимальное расстояние для поиска безопасной позиции
            
            // Создаем спиральный паттерн направлений с более плотной сеткой
            for (let i = 0; i < steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                const distance = (i / steps) * maxDistance;
                directions.push({
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance
                });
            }
            
            // Добавляем дополнительные направления для более точного поиска
            for (let i = 0; i < 32; i++) {
                const angle = (i / 32) * Math.PI * 2;
                directions.push({
                    x: Math.cos(angle) * 30,
                    y: Math.sin(angle) * 30
                });
            }
            
            // Добавляем направления к центру карты для случаев застревания в углах
            const centerX = GAME_CONFIG.worldWidth / 2;
            const centerY = GAME_CONFIG.worldHeight / 2;
            const toCenterX = centerX - player.x;
            const toCenterY = centerY - player.y;
            const centerDistance = Math.hypot(toCenterX, toCenterY);
            
            if (centerDistance > 0) {
                directions.push({
                    x: (toCenterX / centerDistance) * 100,
                    y: (toCenterY / centerDistance) * 100
                });
            }
            
            // Сортируем направления по расстоянию от текущей позиции
            directions.sort((a, b) => {
                const distA = Math.hypot(a.x, a.y);
                const distB = Math.hypot(b.x, b.y);
                return distA - distB;
            });
            
            let foundSafePosition = false;
            
            // Пробуем вытолкнуть в каждом направлении
            for (const dir of directions) {
                const testX = player.x + dir.x;
                const testY = player.y + dir.y;
                
                // Ограничиваем позицию в пределах мира
                const clampedX = Math.max(20, Math.min(GAME_CONFIG.worldWidth - player.width - 20, testX));
                const clampedY = Math.max(20, Math.min(GAME_CONFIG.worldHeight - player.height - 20, testY));
                
                if (!checkWallCollision(player, clampedX, clampedY)) {
                    player.x = clampedX;
                    player.y = clampedY;
                    player.lastSafeX = clampedX;
                    player.lastSafeY = clampedY;
                    foundSafePosition = true;
                    break;
                }
            }
            
            // Если не нашли безопасную позицию, используем принудительное выталкивание
            if (!foundSafePosition) {
                // Пробуем вытолкнуть в 8 основных направлениях с большей силой
                const forceDirections = [
                    {x: -80, y: 0}, {x: 80, y: 0}, {x: 0, y: -80}, {x: 0, y: 80},
                    {x: -56, y: -56}, {x: 56, y: -56}, {x: -56, y: 56}, {x: 56, y: 56}
                ];
                
                for (const dir of forceDirections) {
                    const testX = player.x + dir.x;
                    const testY = player.y + dir.y;
                    
                    // Ограничиваем позицию в пределах мира
                    const clampedX = Math.max(20, Math.min(GAME_CONFIG.worldWidth - player.width - 20, testX));
                    const clampedY = Math.max(20, Math.min(GAME_CONFIG.worldHeight - player.height - 20, testY));
                    
                    if (!checkWallCollision(player, clampedX, clampedY)) {
                        player.x = clampedX;
                        player.y = clampedY;
                        player.lastSafeX = clampedX;
                        player.lastSafeY = clampedY;
                        foundSafePosition = true;
                        break;
                    }
                }
                
                // Последняя попытка - телепортация на случайную позицию в центре карты
                if (!foundSafePosition) {
                    let attempts = 0;
                    while (attempts < 100) {
                        // Генерируем позицию ближе к центру карты
                        const centerX = GAME_CONFIG.worldWidth / 2;
                        const centerY = GAME_CONFIG.worldHeight / 2;
                        const radius = Math.min(GAME_CONFIG.worldWidth, GAME_CONFIG.worldHeight) / 4;
                        
                        const randomAngle = Math.random() * Math.PI * 2;
                        const randomRadius = Math.random() * radius;
                        
                        const randomX = centerX + Math.cos(randomAngle) * randomRadius;
                        const randomY = centerY + Math.sin(randomAngle) * randomRadius;
                        
                        // Ограничиваем позицию в пределах мира
                        const clampedX = Math.max(20, Math.min(GAME_CONFIG.worldWidth - player.width - 20, randomX));
                        const clampedY = Math.max(20, Math.min(GAME_CONFIG.worldHeight - player.height - 20, randomY));
                        
                        if (!checkWallCollision(player, clampedX, clampedY)) {
                            player.x = clampedX;
                            player.y = clampedY;
                            player.lastSafeX = clampedX;
                            player.lastSafeY = clampedY;
                            foundSafePosition = true;
                            break;
                        }
                        attempts++;
                    }
                }
            }
            
            // Если всё ещё не нашли безопасную позицию, принудительно телепортируем в центр карты
            if (!foundSafePosition) {
                const centerX = GAME_CONFIG.worldWidth / 2;
                const centerY = GAME_CONFIG.worldHeight / 2;
                player.x = centerX;
                player.y = centerY;
                player.lastSafeX = centerX;
                player.lastSafeY = centerY;
            }
        }
    }
    
    // Ограничения мира с дополнительным отступом
    const worldMargin = 20;
    player.x = Math.max(worldMargin, Math.min(GAME_CONFIG.worldWidth - player.width - worldMargin, player.x));
    player.y = Math.max(worldMargin, Math.min(GAME_CONFIG.worldHeight - player.height - worldMargin, player.y));
    
    // Обновление следа
    if (player.speed > 2) {
        player.trail.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            life: 800,
            opacity: 1
        });
    }
    
    player.trail = player.trail.filter(point => {
        point.life -= deltaTime;
        point.opacity = point.life / 800;
        return point.life > 0;
    });
}

// ===============================
// ОТРИСОВКА
// ===============================

function drawBackground(ctx, offsetX, offsetY) {
    // Градиентный фон
    const gradient = ctx.createRadialGradient(
        GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight / 2, 0,
        GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight / 2, GAME_CONFIG.canvasWidth
    );
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f0f23');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_CONFIG.canvasWidth, GAME_CONFIG.canvasHeight);
    
    // Видимая граница внизу экрана (за пределами игровой зоны)
    const borderY = GAME_CONFIG.worldHeight - offsetY;
    if (borderY > 0 && borderY < GAME_CONFIG.canvasHeight) {
        // Градиентная граница
        const borderGradient = ctx.createLinearGradient(0, borderY, 0, borderY + 20);
        borderGradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)');
        borderGradient.addColorStop(0.5, 'rgba(255, 0, 0, 0.4)');
        borderGradient.addColorStop(1, 'rgba(255, 0, 0, 0.1)');
        
        ctx.fillStyle = borderGradient;
        ctx.fillRect(0, borderY, GAME_CONFIG.canvasWidth, 20);
        
        // Неоновая линия
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, borderY);
        ctx.lineTo(GAME_CONFIG.canvasWidth, borderY);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

function drawMaze(ctx, offsetX, offsetY) {
    walls.forEach(wall => {
        const x = wall.x - offsetX;
        const y = wall.y - offsetY;
        
        if (x > -GAME_CONFIG.cellSize && x < GAME_CONFIG.canvasWidth && 
            y > -GAME_CONFIG.cellSize && y < GAME_CONFIG.canvasHeight) {
            
            // Градиент для стен
            const gradient = ctx.createLinearGradient(x, y, x + wall.width, y + wall.height);
            gradient.addColorStop(0, '#2c3e50');
            gradient.addColorStop(0.5, '#34495e');
            gradient.addColorStop(1, '#2c3e50');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, wall.width, wall.height);
            
            // Неоновые границы
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 10;
            ctx.strokeRect(x, y, wall.width, wall.height);
            ctx.shadowBlur = 0;
        }
    });
}

function drawPlayer(ctx, player, offsetX, offsetY) {
    const x = player.x + player.width / 2 - offsetX;
    const y = player.y + player.height / 2 - offsetY;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(player.angle + Math.PI / 2);
    
    // Эффект призрака
    if (player.isGhost) {
        ctx.globalAlpha = 0.6;
        ctx.shadowColor = '#9c88ff';
        ctx.shadowBlur = 20;
    }
    
    // Эффект гиганта
    if (player.isGiant) {
        ctx.shadowColor = BOOSTER_TYPES.giant.glowColor;
        ctx.shadowBlur = 30;
        ctx.globalAlpha = 0.9;
        
        // Добавляем эффект дрожания для гиганта
        const shake = Math.sin(Date.now() * 0.01) * 2;
        ctx.translate(shake, shake);
    }
    
    // Масштабирование для гиганта
    if (player.giantScale > 1) {
        ctx.scale(player.giantScale, player.giantScale);
    }
    
    if (player.characterType === 'punk') {
        // Панк с ирокезом - увеличенный и детализированный
        // Тело
        ctx.fillStyle = '#1e3799';
        ctx.fillRect(-18, -12, 36, 40);
        
        // Голова
        ctx.fillStyle = '#feca57';
        ctx.fillRect(-15, -30, 30, 25);
        
        // Ирокез
        ctx.fillStyle = '#2c2c54';
        ctx.fillRect(-4, -42, 8, 18);
        
        // Детали лица
        ctx.fillStyle = '#000';
        ctx.fillRect(-10, -25, 4, 4);
        ctx.fillRect(6, -25, 4, 4);
        
        // Рот
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-6, -18, 12, 3);
        
        // Руки
        ctx.fillStyle = '#feca57';
        ctx.fillRect(-25, -8, 10, 18);
        ctx.fillRect(15, -8, 10, 18);
        
        // Ноги
        ctx.fillStyle = '#2c2c54';
        ctx.fillRect(-12, 28, 10, 18);
        ctx.fillRect(2, 28, 10, 18);
        
    } else if (player.characterType === 'businessman') {
        // Бизнесмен - детализированный
        // Тело (костюм)
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-15, -10, 30, 38);
        
        // Рубашка
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(-12, -8, 24, 30);
        
        // Галстук
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-3, -8, 6, 25);
        
        // Голова
        ctx.fillStyle = '#feca57';
        ctx.fillRect(-12, -27, 24, 22);
        
        // Волосы
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(-12, -30, 24, 10);
        
        // Борода
        ctx.fillStyle = '#654321';
        ctx.fillRect(-10, -10, 20, 8);
        
        // Глаза
        ctx.fillStyle = '#000';
        ctx.fillRect(-8, -22, 3, 3);
        ctx.fillRect(5, -22, 3, 3);
        
        // Руки
        ctx.fillStyle = '#feca57';
        ctx.fillRect(-20, -5, 8, 15);
        ctx.fillRect(12, -5, 8, 15);
        
        // Ноги
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-10, 28, 8, 15);
        ctx.fillRect(2, 28, 8, 15);
    } else if (player.characterType === 'kok') {
        // Степа Кок - новый персонаж
        // Тело (темно-серая кофта)
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(-16, -10, 32, 38);
        
        // Руки
        ctx.fillStyle = '#feca57';
        ctx.fillRect(-22, -8, 8, 16);
        ctx.fillRect(14, -8, 8, 16);
        
        // Голова
        ctx.fillStyle = '#feca57';
        ctx.fillRect(-12, -25, 24, 20);
        
        // Волнистые волосы средней длины
        ctx.fillStyle = '#8b4513';
        ctx.beginPath();
        ctx.arc(-8, -28, 6, 0, Math.PI * 2);
        ctx.arc(-2, -30, 5, 0, Math.PI * 2);
        ctx.arc(4, -29, 6, 0, Math.PI * 2);
        ctx.arc(10, -27, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Зеленые глаза
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(-8, -20, 3, 3);
        ctx.fillRect(5, -20, 3, 3);
        
        // Рот
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-4, -15, 8, 2);
        
        // Цепочка с подвеской на шее
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -5, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(-2, -3, 4, 6);
        
        // Ноги (темно-синие джинсы)
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(-10, 28, 8, 15);
        ctx.fillRect(2, 28, 8, 15);
        
        // Кеды
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-12, 43, 12, 4);
        ctx.fillRect(0, 43, 12, 4);
    } else if (player.characterType === 'maks') {
        // Макс Здоровый - новый персонаж
        // Тело (темно-синяя кофта)
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(-19, -10, 38, 38);
        
        // Руки
        ctx.fillStyle = '#feca57';
        ctx.fillRect(-25, -8, 10, 16);
        ctx.fillRect(15, -8, 10, 16);
        
        // Голова
        ctx.fillStyle = '#feca57';
        ctx.fillRect(-15, -25, 30, 20);
        
        // Светло-русые короткие волосы
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(-15, -30, 30, 8);
        
        // Голубые глаза
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(-10, -18, 4, 4);
        ctx.fillRect(6, -18, 4, 4);
        
        // Массивная челюсть
        ctx.fillStyle = '#feca57';
        ctx.fillRect(-12, -8, 24, 6);
        
        // Рот
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-5, -12, 10, 2);
        
        // Ноги (светло-серые треники)
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(-12, 28, 10, 15);
        ctx.fillRect(2, 28, 10, 15);
        
        // Белые кросы
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-15, 43, 15, 4);
        ctx.fillRect(0, 43, 15, 4);
    }
    
    ctx.restore();
    
    // След
    player.trail.forEach(point => {
        ctx.save();
        ctx.globalAlpha = point.opacity * 0.7;
        ctx.fillStyle = player.characterType === 'punk' ? '#ff4757' : 
                       player.characterType === 'businessman' ? '#3742fa' : 
                       player.characterType === 'kok' ? '#00ff88' : '#ffd700';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(point.x - offsetX, point.y - offsetY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawBooster(ctx, booster, offsetX, offsetY) {
    if (booster.collected) return;
    
    const x = booster.x + booster.width / 2 - offsetX;
    const y = booster.y + booster.height / 2 - offsetY;
    
    if (x < -50 || x > GAME_CONFIG.canvasWidth + 50 || 
        y < -50 || y > GAME_CONFIG.canvasHeight + 50) return;
    
    const boosterType = BOOSTER_TYPES[booster.type];
    const size = 15 + Math.sin(booster.pulse) * 4;
    
    ctx.save();
    ctx.globalAlpha = booster.opacity;
    ctx.translate(x, y);
    ctx.rotate(booster.rotation);
    
    // Специальные эффекты для телепорта
    if (booster.type === 'teleport') {
        // Дополнительное свечение для телепорта
        ctx.shadowColor = boosterType.glowColor;
        ctx.shadowBlur = 35;
        
        // Внешний круг с пульсацией
        const outerSize = size + 8 + Math.sin(booster.pulse * 2) * 6;
        ctx.strokeStyle = boosterType.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, outerSize, 0, Math.PI * 2);
        ctx.stroke();
        
        // Средний круг
        const middleSize = size + 4;
        ctx.strokeStyle = boosterType.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = booster.opacity * 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, middleSize, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.globalAlpha = booster.opacity;
    }
    
    // Специальные эффекты для гиганта
    if (booster.type === 'giant') {
        // Усиленное свечение для гиганта
        ctx.shadowColor = boosterType.glowColor;
        ctx.shadowBlur = 40;
        
        // Внешний круг с пульсацией
        const outerSize = size + 12 + Math.sin(booster.pulse * 1.5) * 8;
        ctx.strokeStyle = boosterType.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, outerSize, 0, Math.PI * 2);
        ctx.stroke();
        
        // Средний круг
        const middleSize = size + 6;
        ctx.strokeStyle = boosterType.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = booster.opacity * 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, middleSize, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.globalAlpha = booster.opacity;
        
        // Эффект дрожания для гиганта
        const shake = Math.sin(booster.pulse * 3) * 2;
        ctx.translate(shake, shake);
    }
    
    // Свечение
    ctx.shadowColor = boosterType.glowColor;
    ctx.shadowBlur = 25;
    
    // Основной круг
    ctx.fillStyle = boosterType.color;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    
    // Внутренний символ
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(boosterType.symbol, 0, 0);
    
    ctx.restore();
}

function drawMinimap() {
    const minimapWidth = minimap.width;
    const minimapHeight = minimap.height;
    
    // Вычисляем масштаб на основе пропорций игрового мира
    const scaleX = minimapWidth / GAME_CONFIG.worldWidth;
    const scaleY = minimapHeight / GAME_CONFIG.worldHeight;
    const scale = Math.min(scaleX, scaleY); // Используем меньший масштаб для сохранения пропорций
    
    // Вычисляем отступы для центрирования
    const offsetX = (minimapWidth - GAME_CONFIG.worldWidth * scale) / 2;
    const offsetY = (minimapHeight - GAME_CONFIG.worldHeight * scale) / 2;
    
    minimapCtx.clearRect(0, 0, minimapWidth, minimapHeight);
    
    // Фон миникарты
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    minimapCtx.fillRect(0, 0, minimapWidth, minimapHeight);
    
    // Рамка
    minimapCtx.strokeStyle = '#00ff88';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(1, 1, minimapWidth - 2, minimapHeight - 2);
    
    // Стены
    minimapCtx.fillStyle = '#334155';
    walls.forEach(wall => {
        minimapCtx.fillRect(
            wall.x * scale + offsetX,
            wall.y * scale + offsetY,
            Math.max(1, wall.width * scale),
            Math.max(1, wall.height * scale)
        );
    });
    
    // Бустеры
    boosters.forEach(booster => {
        if (!booster.collected) {
            minimapCtx.save();
            minimapCtx.strokeStyle = '#ffd700';
            minimapCtx.lineWidth = 2;
            minimapCtx.shadowColor = '#ffd700';
            minimapCtx.shadowBlur = 8;
            minimapCtx.beginPath();
            minimapCtx.arc(
                booster.x * scale + offsetX,
                booster.y * scale + offsetY,
                5, 0, Math.PI * 2
            );
            minimapCtx.stroke();
            minimapCtx.shadowBlur = 0;
            minimapCtx.fillStyle = '#fff200';
            minimapCtx.beginPath();
            minimapCtx.arc(
                booster.x * scale + offsetX,
                booster.y * scale + offsetY,
                3, 0, Math.PI * 2
            );
            minimapCtx.fill();
            minimapCtx.restore();
        }
    });
    
    // Охотник (красная точка)
    if (hunterPlayer) {
        minimapCtx.fillStyle = '#ef4444';
        minimapCtx.shadowColor = '#ef4444';
        minimapCtx.shadowBlur = 8;
        minimapCtx.beginPath();
        minimapCtx.arc(
            hunterPlayer.x * scale + offsetX,
            hunterPlayer.y * scale + offsetY,
            4, 0, Math.PI * 2
        );
        minimapCtx.fill();
        minimapCtx.shadowBlur = 0;
    }
    
    // Добыча (синяя точка)
    if (preyPlayer) {
        minimapCtx.fillStyle = '#3b82f6';
        minimapCtx.shadowColor = '#3b82f6';
        minimapCtx.shadowBlur = 8;
        minimapCtx.beginPath();
        minimapCtx.arc(
            preyPlayer.x * scale + offsetX,
            preyPlayer.y * scale + offsetY,
            4, 0, Math.PI * 2
        );
        minimapCtx.fill();
        minimapCtx.shadowBlur = 0;
    }
}

function render() {
    // Разделенный экран
    const splitY = GAME_CONFIG.canvasHeight / 2;

    // Верхняя половина - вид охотника
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, GAME_CONFIG.canvasWidth, splitY);
    ctx.clip();

    // Верхняя камера всегда следует за охотником
    if (hunterPlayer && typeof hunterPlayer.x === 'number' && typeof hunterPlayer.y === 'number') {
        const offsetX1 = hunterPlayer.x - GAME_CONFIG.canvasWidth / 2;
        const offsetY1 = hunterPlayer.y - splitY / 2;

        drawBackground(ctx, offsetX1, offsetY1);
        drawMaze(ctx, offsetX1, offsetY1);
        boosters.forEach(booster => drawBooster(ctx, booster, offsetX1, offsetY1));
        particles.forEach(particle => particle.draw(ctx, offsetX1, offsetY1));
        if (hunterPlayer) drawPlayer(ctx, hunterPlayer, offsetX1, offsetY1);
        if (preyPlayer) drawPlayer(ctx, preyPlayer, offsetX1, offsetY1);
    }
    ctx.restore();

    // Разделительная линия
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(0, splitY);
    ctx.lineTo(GAME_CONFIG.canvasWidth, splitY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Нижняя половина - вид добычи
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, splitY, GAME_CONFIG.canvasWidth, splitY);
    ctx.clip();

    // Нижняя камера всегда следует за добычей
    if (preyPlayer && typeof preyPlayer.x === 'number' && typeof preyPlayer.y === 'number') {
        const offsetX2 = preyPlayer.x - GAME_CONFIG.canvasWidth / 2;
        const offsetY2 = preyPlayer.y - splitY / 2 - splitY;

        drawBackground(ctx, offsetX2, offsetY2);
        drawMaze(ctx, offsetX2, offsetY2);
        boosters.forEach(booster => drawBooster(ctx, booster, offsetX2, offsetY2));
        particles.forEach(particle => particle.draw(ctx, offsetX2, offsetY2));
        if (hunterPlayer) drawPlayer(ctx, hunterPlayer, offsetX2, offsetY2);
        if (preyPlayer) drawPlayer(ctx, preyPlayer, offsetX2, offsetY2);
    }
    ctx.restore();

    // Миникарта
    if (gameState.mode === 'playing') {
        drawMinimap();
    }
}

// ===============================
// УПРАВЛЕНИЕ ИГРОЙ
// ===============================

function startGame() {
    // Проверяем, что персонажи выбраны
    if (!characterSelection.hunter || !characterSelection.prey) {
        alert('Пожалуйста, выберите персонажей для обеих ролей!');
        return;
    }
    
    document.getElementById('startScreen').classList.add('hide');
    gameState.mode = 'playing';
    gameState.startTime = Date.now();
    gameState.gameTime = 0;

    // Показываем игровые элементы
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        gameContainer.classList.remove('start-screen-active');
        gameContainer.classList.add('game-active');
    }

    // Принудительно показываем кулдауны
    document.querySelectorAll('.cooldown-indicator').forEach(el => {
        el.style.display = 'block';
    });

    // Инициализируем названия способностей
    setTimeout(() => {
        updateCooldownLabels();
        // Debug: проверяем классы
        console.log('Game started, container classes:', gameContainer.className);
    }, 100);
    
    // Сбрасываем таймер бустеров для нового раунда
    // Устанавливаем время так, чтобы первый бустер появился после initialBoosterDelay
    GAME_CONFIG.lastBoosterSpawnTime = Date.now() - GAME_CONFIG.minBoosterInterval + GAME_CONFIG.initialBoosterDelay;
    
    // Получаем конфигурацию игроков
    playerConfig = getPlayerConfig();
    
    // Показываем обозначения ролей
    showRoleIndicators();
    
    // Скрываем информацию об управлении во время игры
    hideControlsInfo();
    
    // Генерация нового лабиринта
    generateMaze();
    
    // Случайные стартовые позиции для игроков
    function getRandomSpawnPoint() {
        let x, y;
        const margin = 100; // Увеличенный отступ от границ
        let attempts = 0;
        
        do {
            x = Math.random() * (GAME_CONFIG.worldWidth - 2 * margin) + margin;
            y = Math.random() * (GAME_CONFIG.worldHeight - 2 * margin) + margin;
            attempts++;
        } while (checkWallCollision({x: x, y: y, width: 35, height: 40}, x, y) && attempts < 100);
        
        // Если не нашли безопасную позицию, используем центр карты
        if (attempts >= 100) {
            x = GAME_CONFIG.worldWidth / 2;
            y = GAME_CONFIG.worldHeight / 2;
        }
        
        return {x, y};
    }
    
    // Обеспечиваем что игроки появляются на разумном расстоянии друг от друга
    const hunterSpawn = getRandomSpawnPoint();
    let preySpawn;
    do {
        preySpawn = getRandomSpawnPoint();
    } while (Math.hypot(preySpawn.x - hunterSpawn.x, preySpawn.y - hunterSpawn.y) < 300);
    
    // Размещаем игроков в зависимости от их конфигурации
    if (playerConfig.hunter.character === 'punk') {
        players.punk.x = hunterSpawn.x;
        players.punk.y = hunterSpawn.y;
    } else if (playerConfig.hunter.character === 'businessman') {
        players.businessman.x = hunterSpawn.x;
        players.businessman.y = hunterSpawn.y;
    } else if (playerConfig.hunter.character === 'kok') {
        players.kok.x = hunterSpawn.x;
        players.kok.y = hunterSpawn.y;
    } else if (playerConfig.hunter.character === 'maks') {
        players.maks.x = hunterSpawn.x;
        players.maks.y = hunterSpawn.y;
    }
    
    if (playerConfig.prey.character === 'punk') {
        players.punk.x = preySpawn.x;
        players.punk.y = preySpawn.y;
    } else if (playerConfig.prey.character === 'businessman') {
        players.businessman.x = preySpawn.x;
        players.businessman.y = preySpawn.y;
    } else if (playerConfig.prey.character === 'kok') {
        players.kok.x = preySpawn.x;
        players.kok.y = preySpawn.y;
    } else if (playerConfig.prey.character === 'maks') {
        players.maks.x = preySpawn.x;
        players.maks.y = preySpawn.y;
    }
    
    // Создаем отдельные копии игроков для избежания конфликтов
    if (playerConfig.hunter.character === 'punk') {
        hunterPlayer = createPlayerCopy(players.punk, 'punk');
        hunterPlayer.x = hunterSpawn.x;
        hunterPlayer.y = hunterSpawn.y;
    } else if (playerConfig.hunter.character === 'businessman') {
        hunterPlayer = createPlayerCopy(players.businessman, 'businessman');
        hunterPlayer.x = hunterSpawn.x;
        hunterPlayer.y = hunterSpawn.y;
    } else if (playerConfig.hunter.character === 'kok') {
        hunterPlayer = createPlayerCopy(players.kok, 'kok');
        hunterPlayer.x = hunterSpawn.x;
        hunterPlayer.y = hunterSpawn.y;
    } else if (playerConfig.hunter.character === 'maks') {
        hunterPlayer = createPlayerCopy(players.maks, 'maks');
        hunterPlayer.x = hunterSpawn.x;
        hunterPlayer.y = hunterSpawn.y;
    }
    
    if (playerConfig.prey.character === 'punk') {
        preyPlayer = createPlayerCopy(players.punk, 'punk');
        preyPlayer.x = preySpawn.x;
        preyPlayer.y = preySpawn.y;
    } else if (playerConfig.prey.character === 'businessman') {
        preyPlayer = createPlayerCopy(players.businessman, 'businessman');
        preyPlayer.x = preySpawn.x;
        preyPlayer.y = preySpawn.y;
    } else if (playerConfig.prey.character === 'kok') {
        preyPlayer = createPlayerCopy(players.kok, 'kok');
        preyPlayer.x = preySpawn.x;
        preyPlayer.y = preySpawn.y;
    } else if (playerConfig.prey.character === 'maks') {
        preyPlayer = createPlayerCopy(players.maks, 'maks');
        preyPlayer.x = preySpawn.x;
        preyPlayer.y = preySpawn.y;
    }
    
    // Очистка бустеров и частиц
    boosters = [];
    particles = [];
    
    // Очистка эффектов для новых игроков
    if (hunterPlayer) {
        hunterPlayer.boosts.clear();
        hunterPlayer.trail = [];
        hunterPlayer.ghostCooldown = 0;
        hunterPlayer.actionPressed = false;
    }
    
    if (preyPlayer) {
        preyPlayer.boosts.clear();
        preyPlayer.trail = [];
        preyPlayer.ghostCooldown = 0;
        preyPlayer.actionPressed = false;
    }
    
    // Стартовые бустеры в зависимости от типа персонажа
    // Убираем стартовый призрак - теперь он будет только при активации способности
    
    // Создание начальных бустеров
    for (let i = 0; i < 5; i++) {
        spawnBooster();
    }
    
    playBackgroundMusic();
}

function endGame(winner) {
    stopBackgroundMusic();
    gameState.mode = 'ended';
    gameState.winner = winner;

    // Скрываем игровые элементы при окончании игры
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        gameContainer.classList.remove('game-active');
    }

    // Принудительно скрываем кулдауны
    document.querySelectorAll('.cooldown-indicator').forEach(el => {
        el.style.display = 'none';
    });
    
    // Скрываем обозначения ролей
    hideRoleIndicators();
    
    // Показываем информацию об управлении
    showControlsInfo();
    
    // Определяем, кто победил
    const hunterCharacter = characterSelection.hunter;
    const preyCharacter = characterSelection.prey;
    
    // Обновляем счет
    if (winner === 'hunter') {
        gameState.scores.hunter = (gameState.scores.hunter || 0) + 1;
    } else {
        gameState.scores.prey = (gameState.scores.prey || 0) + 1;
    }
    
    // Запускаем новую музыку в зависимости от победителя
    // Определяем кто победил по персонажу, а не по роли
    let winningCharacter = null;
    if (winner === 'hunter') {
        winningCharacter = hunterCharacter; // Персонаж охотника
    } else {
        winningCharacter = preyCharacter; // Персонаж добычи
    }
    
    // Проигрываем звук в зависимости от персонажа
    if (winningCharacter === 'punk') {
        // Саня победил - проигрываем звук победы охотника
        playMusic('victory');
    } else if (winningCharacter === 'businessman') {
        // Леха победил - проигрываем звук победы добычи
        playMusic('defeat');
    } else if (winningCharacter === 'kok') {
        // Степа Кок победил - проигрываем его победный звук
        const kokEndSound = document.getElementById('kokEndSound');
        if (kokEndSound) {
            kokEndSound.currentTime = 0;
            kokEndSound.play();
        }
    } else if (winningCharacter === 'maks') {
        // Макс Здоровый победил - проигрываем его звук
        const maksSound = document.getElementById('maksSound');
        if (maksSound) {
            maksSound.currentTime = 0;
            maksSound.play();
        }
    }
    
    const endScreen = document.getElementById('endScreen');
    const winnerText = document.getElementById('winnerText');
    const gameResult = document.getElementById('gameResult');
    
    // Создаем canvas для отрисовки лица победителя
    const winnerFaceCanvas = document.createElement('canvas');
    winnerFaceCanvas.className = 'evil-face';
    winnerFaceCanvas.width = 200;
    winnerFaceCanvas.height = 200;
    winnerFaceCanvas.style.width = '200px';
    winnerFaceCanvas.style.height = '200px';
    
    const faceCtx = winnerFaceCanvas.getContext('2d');
    
    // Обновляем текст с учетом выбранных персонажей
    if (winner === 'hunter') {
        const hunterName = hunterCharacter === 'punk' ? 'Саня' : 
                          hunterCharacter === 'businessman' ? 'Леха' : 
                          hunterCharacter === 'kok' ? 'Степа' : 'Макс';
        const preyName = preyCharacter === 'punk' ? 'Саня' : 
                        preyCharacter === 'businessman' ? 'Леха' : 
                        preyCharacter === 'kok' ? 'Степа' : 'Макс';
        winnerText.textContent = `🎯 ОХОТНИК ПОБЕДИЛ РАУНД!`;
        winnerText.style.color = '#00ff88';
        gameResult.textContent = `${hunterName} поймал ${preyName} за ${Math.floor(gameState.gameTime / 1000)} секунд!`;
        gameResult.innerHTML += `<br>Счет: Охотник ${gameState.scores.hunter || 0} - ${gameState.scores.prey || 0} Добыча`;
        
        if (hunterCharacter === 'punk') {
            drawPunkWinnerFace(faceCtx);
            winnerFaceCanvas.style.filter = 'drop-shadow(0 0 30px #ff4757)';
        } else if (hunterCharacter === 'businessman') {
            drawBusinessmanWinnerFace(faceCtx);
            winnerFaceCanvas.style.filter = 'drop-shadow(0 0 30px #3742fa)';
        } else if (hunterCharacter === 'kok') {
            drawKokWinnerFace(faceCtx); // Используем лицо Степы Кок
            winnerFaceCanvas.style.filter = 'drop-shadow(0 0 30px #00ff88)';
        } else if (hunterCharacter === 'maks') {
            drawMaksWinnerFace(faceCtx); // Используем лицо Макса Здорового
            winnerFaceCanvas.style.filter = 'drop-shadow(0 0 30px #ffd700)';
        }
    } else {
        const hunterName = hunterCharacter === 'punk' ? 'Саня' : 
                          hunterCharacter === 'businessman' ? 'Леха' : 
                          hunterCharacter === 'kok' ? 'Степа' : 'Макс';
        const preyName = preyCharacter === 'punk' ? 'Саня' : 
                        preyCharacter === 'businessman' ? 'Леха' : 
                        preyCharacter === 'kok' ? 'Степа' : 'Макс';
        winnerText.textContent = `🏃‍♂️ ДОБЫЧА ВЫЖИЛА В РАУНДЕ!`;
        winnerText.style.color = '#ff6b35';
        gameResult.textContent = `${preyName} успешно убегал от ${hunterName} целых 2 минуты!`;
        gameResult.innerHTML += `<br>Счет: Охотник ${gameState.scores.hunter || 0} - ${gameState.scores.prey || 0} Добыча`;
        
        if (preyCharacter === 'punk') {
            drawPunkWinnerFace(faceCtx);
            winnerFaceCanvas.style.filter = 'drop-shadow(0 0 30px #ff4757)';
        } else if (preyCharacter === 'businessman') {
            drawBusinessmanWinnerFace(faceCtx);
            winnerFaceCanvas.style.filter = 'drop-shadow(0 0 30px #3742fa)';
        } else if (preyCharacter === 'kok') {
            drawKokWinnerFace(faceCtx);
            winnerFaceCanvas.style.filter = 'drop-shadow(0 0 30px #00ff88)';
        } else if (preyCharacter === 'maks') {
            drawMaksWinnerFace(faceCtx);
            winnerFaceCanvas.style.filter = 'drop-shadow(0 0 30px #ffd700)';
        }
    }
    
    // Проверяем, закончилась ли игра
    if (gameState.roundNumber >= GAME_CONFIG.totalRounds) {
        const finalWinner = (gameState.scores.hunter || 0) > (gameState.scores.prey || 0) ? 'hunter' : 'prey';
        winnerText.textContent = finalWinner === 'hunter' ? '🏆 ОХОТНИК ВЫИГРАЛ ИГРУ!' : '🏆 ДОБЫЧА ВЫИГРАЛА ИГРУ!';
        gameResult.innerHTML = `Финальный счет: Охотник ${gameState.scores.hunter || 0} - ${gameState.scores.prey || 0} Добыча`;
        
        // Скрываем кнопку реванша только в конце игры
        document.querySelector('button[onclick="nextRound()"]').style.display = 'none';
    } else {
        // Показываем кнопку реванша для всех остальных раундов
        document.querySelector('button[onclick="nextRound()"]').style.display = 'block';
    }
    
    // Добавляем лицо к экрану
    document.body.appendChild(winnerFaceCanvas);
    
    // Удаляем лицо через 3 секунды
    setTimeout(() => {
        if (winnerFaceCanvas.parentNode) {
            winnerFaceCanvas.parentNode.removeChild(winnerFaceCanvas);
        }
    }, 3000);
    
    endScreen.classList.remove('hide');
    
    // Создание праздничных частиц
    for (let i = 0; i < 100; i++) {
        const color = winner === 'hunter' ? '#00ff88' : '#ff6b35';
        createParticles(
            Math.random() * GAME_CONFIG.worldWidth,
            Math.random() * GAME_CONFIG.worldHeight,
            color,
            1
        );
    }
}

function nextRound() {
    document.getElementById('endScreen').classList.add('hide');
    gameState.roundNumber++;
    
    // Скрываем информацию об управлении перед новым раундом
    hideControlsInfo();

    // Показываем игровые элементы снова
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        gameContainer.classList.add('game-active');
    }
    
    // Запускаем новый раунд с теми же персонажами (реванш)
    startGame();
}

function restartGame() {
    stopBackgroundMusic();
    document.getElementById('endScreen').classList.add('hide');
    gameState.roundNumber = 1;
    gameState.scores = { hunter: 0, prey: 0 }; // Сбрасываем счет
    document.querySelector('button[onclick="nextRound()"]').style.display = 'block'; // Показываем кнопку следующего раунда
    
    // Сбрасываем выбор персонажей
    characterSelection.hunter = null;
    characterSelection.prey = null;
    
    // Убираем выделение с выбранных персонажей
    document.querySelectorAll('.character-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Возвращаемся на стартовый экран выбора персонажей
    document.getElementById('startScreen').classList.remove('hide');
    
    // Показываем информацию об управлении на экране старта
    showControlsInfo();
    
    // Скрываем игровые элементы
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        gameContainer.classList.add('start-screen-active');
        gameContainer.classList.remove('game-active');
        // Debug: проверяем классы
        console.log('Game restarted, container classes:', gameContainer.className);
    }

    // Принудительно скрываем кулдауны
    document.querySelectorAll('.cooldown-indicator').forEach(el => {
        el.style.display = 'none';
    });
    
    // Сбрасываем состояние игры
    gameState.mode = 'start';
    playerConfig = null;
    hunterPlayer = null;
    preyPlayer = null;
    
    // Очищаем бустеры и частицы
    boosters = [];
    particles = [];
}

// ===============================
// ЛИЦА ПОБЕДИТЕЛЕЙ
// ===============================

function drawPunkWinnerFace(ctx) {
    const centerX = 100, centerY = 100;
    
    // Лицо
    ctx.fillStyle = '#feca57';
    ctx.fillRect(centerX - 40, centerY - 35, 80, 70);
    
    // Ирокез
    ctx.fillStyle = '#ff6b7a';
    ctx.fillRect(centerX - 20, centerY - 60, 40, 30);
    
    // Глаза
    ctx.fillStyle = '#2c2c54';
    ctx.fillRect(centerX - 25, centerY - 20, 8, 12);
    ctx.fillRect(centerX + 17, centerY - 20, 8, 12);
    
    // Улыбка
    ctx.fillRect(centerX - 20, centerY + 5, 40, 8);
    
    // Куртка
    ctx.fillStyle = '#1e3799';
    ctx.fillRect(centerX - 45, centerY + 35, 90, 50);
}

function drawBusinessmanWinnerFace(ctx) {
    const centerX = 100, centerY = 100;
    
    // Лицо
    ctx.fillStyle = '#f8c291';
    ctx.fillRect(centerX - 35, centerY - 30, 70, 60);
    
    // Волосы
    ctx.fillStyle = '#2c2c54';
    ctx.fillRect(centerX - 35, centerY - 45, 70, 20);
    
    // Глаза
    ctx.fillRect(centerX - 20, centerY - 15, 6, 8);
    ctx.fillRect(centerX + 14, centerY - 15, 6, 8);
    
    // Улыбка
    ctx.fillRect(centerX - 15, centerY + 5, 30, 6);
    
    // Костюм
    ctx.fillRect(centerX - 40, centerY + 35, 80, 50);
    
    // Галстук
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(centerX - 8, centerY + 30, 16, 40);
}

function drawKokWinnerFace(ctx) {
    const centerX = 100, centerY = 100;
    
    // Лицо
    ctx.fillStyle = '#feca57';
    ctx.fillRect(centerX - 35, centerY - 30, 70, 60);
    
    // Волнистые волосы
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.arc(centerX - 20, centerY - 45, 8, 0, Math.PI * 2);
    ctx.arc(centerX - 8, centerY - 48, 7, 0, Math.PI * 2);
    ctx.arc(centerX + 4, centerY - 47, 8, 0, Math.PI * 2);
    ctx.arc(centerX + 16, centerY - 44, 7, 0, Math.PI * 2);
    ctx.fill();
    
    // Зеленые глаза
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(centerX - 20, centerY - 15, 6, 8);
    ctx.fillRect(centerX + 14, centerY - 15, 6, 8);
    
    // Улыбка
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(centerX - 15, centerY + 5, 30, 6);
    
    // Темно-серая кофта
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(centerX - 40, centerY + 35, 80, 50);
    
    // Цепочка
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY + 10, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(centerX - 3, centerY + 8, 6, 8);
}

function drawMaksWinnerFace(ctx) {
    const centerX = 100, centerY = 100;
    
    // Лицо
    ctx.fillStyle = '#feca57';
    ctx.fillRect(centerX - 40, centerY - 30, 80, 60);
    
    // Светло-русые короткие волосы
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(centerX - 40, centerY - 40, 80, 15);
    
    // Голубые глаза
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(centerX - 25, centerY - 15, 8, 10);
    ctx.fillRect(centerX + 17, centerY - 15, 8, 10);
    
    // Массивная челюсть
    ctx.fillStyle = '#feca57';
    ctx.fillRect(centerX - 30, centerY + 5, 60, 8);
    
    // Улыбка
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(centerX - 20, centerY + 15, 40, 4);
    
    // Темно-синяя кофта
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(centerX - 45, centerY + 35, 90, 50);
    
    // Светло-серые треники
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(centerX - 35, centerY + 85, 30, 25);
    ctx.fillRect(centerX + 5, centerY + 85, 30, 25);
    
    // Белые кросы
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(centerX - 40, centerY + 110, 40, 6);
    ctx.fillRect(centerX, centerY + 110, 40, 6);
}

// Запуск игры
requestAnimationFrame(gameLoop);

// Изменяем длительность режима призрака с 5 секунд на 1 секунду
if (gameState.businessmanGhostMode && Date.now() - gameState.businessmanGhostModeStart > 1000) {
    gameState.businessmanGhostMode = false;
}

// ===============================
// ВЫБОР ПЕРСОНАЖЕЙ
// ===============================

function selectCharacter(role, character) {
    // Проигрываем звук в зависимости от выбранного персонажа
    if (character === 'punk') {
        // Звук для Сани
        const sanyaSound = document.getElementById('sanyaSound');
        if (sanyaSound) {
            sanyaSound.currentTime = 0;
            sanyaSound.play();
        }
    } else if (character === 'businessman') {
        // Звук для Лехи
        const lehaSound = document.getElementById('lehaSound');
        if (lehaSound) {
            lehaSound.currentTime = 0;
            lehaSound.play();
        }
    } else if (character === 'kok') {
        // Звук для Степы Кок
        const kokSound = document.getElementById('kokSound');
        if (kokSound) {
            kokSound.currentTime = 0;
            kokSound.play();
        }
    } else if (character === 'maks') {
        // Звук для Макса Здорового
        const maksSound = document.getElementById('maksSound');
        if (maksSound) {
            maksSound.currentTime = 0;
            maksSound.play();
        }
    }
    
    // Убираем предыдущий выбор для этой роли
    const roleSections = document.querySelectorAll('.role-section');
    roleSections.forEach(section => {
        const options = section.querySelectorAll('.character-option');
        options.forEach(option => {
            if (option.onclick && option.onclick.toString().includes(role)) {
                option.classList.remove('selected');
            }
        });
    });
    
    // Выбираем новый персонаж
    characterSelection[role] = character;
    
    // Добавляем визуальное выделение
    const selectedOption = document.querySelector(`.character-option[onclick*="${role}"][onclick*="${character}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    // Обновляем информацию об управлении
    updateControlsInfo();
    
    // Проверяем, можно ли активировать кнопку старта
    checkStartButton();
}

function checkStartButton() {
    const startButton = document.getElementById('startButton');
    if (characterSelection.hunter && characterSelection.prey) {
        startButton.classList.add('active');
    } else {
        startButton.classList.remove('active');
    }
}

function getPlayerConfig() {
    // Определяем, кто за кого играет
    const hunterCharacter = characterSelection.hunter;
    const preyCharacter = characterSelection.prey;
    
    // Назначаем управления на основе роли (всегда одинаково)
    // Охотник всегда использует WASD + E
    // Добыча всегда использует стрелки + /
    const hunterControls = controls.businessman; // WASD + E для охотника
    const preyControls = controls.punk; // Стрелки + / для добычи
    
    return {
        hunter: {
            character: hunterCharacter,
            controls: hunterControls,
            isPunk: hunterCharacter === 'punk'
        },
        prey: {
            character: preyCharacter,
            controls: preyControls,
            isPunk: preyCharacter === 'punk'
        }
    };
}

// ===============================
// УПРАВЛЕНИЕ ОБОЗНАЧЕНИЯМИ РОЛЕЙ
// ===============================

function showRoleIndicators() {
    if (playerConfig) {
        const hunterName = playerConfig.hunter.character === 'punk' ? 'Саня' : 
                          playerConfig.hunter.character === 'businessman' ? 'Леха' : 
                          playerConfig.hunter.character === 'kok' ? 'Степа' : 'Макс';
        const preyName = playerConfig.prey.character === 'punk' ? 'Саня' : 
                        playerConfig.prey.character === 'businessman' ? 'Леха' : 
                        playerConfig.prey.character === 'kok' ? 'Степа' : 'Макс';
        
        toggleUI('hunterIndicator', true);
        toggleUI('preyIndicator', true);
        
        const hunterIndicator = document.getElementById('hunterIndicator');
        const preyIndicator = document.getElementById('preyIndicator');
        
        if (hunterIndicator) hunterIndicator.textContent = `🎯 ОХОТНИК - ${hunterName}`;
        if (preyIndicator) preyIndicator.textContent = `🏃‍♂️ ДОБЫЧА - ${preyName}`;
    }
}

function hideRoleIndicators() {
    toggleUI('hunterIndicator', false);
    toggleUI('preyIndicator', false);
}

// ===============================
// УПРАВЛЕНИЕ ИНФОРМАЦИЕЙ ОБ УПРАВЛЕНИИ
// ===============================

function showControlsInfo() {
    const controlsInfo = document.querySelector('.game-controls-info');
    if (controlsInfo) controlsInfo.style.display = 'block';
}

function hideControlsInfo() {
    const controlsInfo = document.querySelector('.game-controls-info');
    if (controlsInfo) controlsInfo.style.display = 'none';
}

function updateControlsInfo() {
    const hunterTitle = document.querySelector('.role-section:first-child .role-title');
    const preyTitle = document.querySelector('.role-section:last-child .role-title');
    
    if (!hunterTitle || !preyTitle) return;
    
    // Всегда показываем одинаковые управления
    hunterTitle.textContent = '🎯 ОХОТНИК: WASD + E';
    preyTitle.textContent = '🏃‍♂️ ДОБЫЧА: Стрелки + /';
}

// ===============================
// ИНИЦИАЛИЗАЦИЯ
// ===============================

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Скрываем обозначения ролей при загрузке
    hideRoleIndicators();
    
    // Показываем информацию об управлении на экране старта
    showControlsInfo();
    
    // Обновляем информацию об управлении
    updateControlsInfo();
    
    // Проверяем кнопку старта
    checkStartButton();
    
    // Запускаем игровой цикл
    requestAnimationFrame(gameLoop);
});

// ===============================
// СОЗДАНИЕ КОПИЙ ИГРОКОВ
// ===============================

function createPlayerCopy(originalPlayer, characterType) {
    return {
        x: originalPlayer.x,
        y: originalPlayer.y,
        width: originalPlayer.width,
        height: originalPlayer.height,
        speed: originalPlayer.speed,
        maxSpeed: originalPlayer.maxSpeed,
        acceleration: originalPlayer.acceleration,
        angle: originalPlayer.angle,
        isGhost: false,
        ghostCooldown: 0,
        actionPressed: false,
        boosts: new Map(),
        trail: [],
        lastSafeX: originalPlayer.x,
        lastSafeY: originalPlayer.y,
        characterType: characterType,
        // Свойства для анимации гиганта
        originalWidth: originalPlayer.originalWidth || originalPlayer.width,
        originalHeight: originalPlayer.originalHeight || originalPlayer.height,
        giantScale: 1,
        giantAnimationTime: 0,
        isGiant: false,
        lastWallBreakTime: 0
    };
}

// ===============================
// UI ФУНКЦИИ
// ===============================

function toggleUI(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

// ===============================
// ЛОМАНИЕ СТЕН (ГИГАНТ)
// ===============================

function breakWalls(player) {
    const breakRadius = 80; // Радиус разрушения стен
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    
    // Создаем эффект разрушения только если есть стены для разрушения
    let wallsDestroyed = 0;
    
    // Проверяем все стены в радиусе
    const wallsToRemove = [];
    for (let i = walls.length - 1; i >= 0; i--) {
        const wall = walls[i];
        const wallCenterX = wall.x + wall.width / 2;
        const wallCenterY = wall.y + wall.height / 2;
        
        const distance = Math.hypot(
            playerCenterX - wallCenterX,
            playerCenterY - wallCenterY
        );
        
        if (distance <= breakRadius) {
            // Создаем эффект разрушения стены с разными цветами
            const colors = ['#8B4513', '#A0522D', '#CD853F', '#D2691E']; // Коричневые оттенки
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            
            createParticles(
                wallCenterX,
                wallCenterY,
                randomColor,
                15 + Math.random() * 10 // Случайное количество частиц
            );
            
            // Добавляем золотые искры
            createParticles(
                wallCenterX,
                wallCenterY,
                '#FFD700',
                5 + Math.random() * 5
            );
            
            wallsToRemove.push(i);
            wallsDestroyed++;
        }
    }
    
    // Удаляем стены
    for (const index of wallsToRemove) {
        walls.splice(index, 1);
    }
    
    // Создаем эффект разрушения в центре игрока только если разрушили стены
    if (wallsDestroyed > 0) {
        createParticles(
            playerCenterX,
            playerCenterY,
            BOOSTER_TYPES.giant.color,
            20
        );
    }
    
    return wallsDestroyed > 0;
}

// Остановить фоновую музыку
function stopBackgroundMusic() {
    const music = document.getElementById('backgroundMusic');
    if (music) {
        music.pause();
        music.currentTime = 0;
    }
}

let lastTime = 0;
function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    if (gameState.mode === 'playing' && playerConfig) {
        gameState.gameTime += deltaTime;

        // Обновление игроков
        if (hunterPlayer) {
            updatePlayer(hunterPlayer, playerConfig.hunter.controls, deltaTime, playerConfig.hunter.character);
        }
        if (preyPlayer) {
            updatePlayer(preyPlayer, playerConfig.prey.controls, deltaTime, playerConfig.prey.character);
        }

        // Проверка бустеров
        if (hunterPlayer) checkBoosterCollisions(hunterPlayer);
        if (preyPlayer) checkBoosterCollisions(preyPlayer);

        // Обновление бустеров
        updateBoosters(deltaTime);

        // Более равномерное создание новых бустеров
        const currentTimeMs = Date.now();
        const activeBoosters = boosters.filter(b => !b.collected).length;
        const gameTimeElapsed = currentTimeMs - gameState.startTime;
        const gameTimeSeconds = gameTimeElapsed / 1000;

        // Увеличиваем частоту появления бустеров после 15 секунд
        let currentMinInterval = GAME_CONFIG.minBoosterInterval;
        let currentMaxInterval = GAME_CONFIG.maxBoosterInterval;
        
        if (gameTimeSeconds > 15) {
            // После 15 секунд бустеры появляются в 2 раза чаще
            currentMinInterval = GAME_CONFIG.minBoosterInterval / 2; // 2 секунды вместо 4
            currentMaxInterval = GAME_CONFIG.maxBoosterInterval / 2; // 3 секунды вместо 6
        }

        if (activeBoosters < GAME_CONFIG.targetBoosterCount &&
            gameTimeElapsed > GAME_CONFIG.initialBoosterDelay &&
            currentTimeMs - GAME_CONFIG.lastBoosterSpawnTime > currentMinInterval) {

            const spawnInterval = currentMinInterval +
                Math.random() * (currentMaxInterval - currentMinInterval);

            if (currentTimeMs - GAME_CONFIG.lastBoosterSpawnTime > spawnInterval) {
                spawnBooster();
                GAME_CONFIG.lastBoosterSpawnTime = currentTimeMs;
            }
        }

        // Обновление частиц
        particles = particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });

        // Обновляем эффекты напряжения
        updateTensionEffects();

        // Проверка победы
        const distance = getDistanceBetweenPlayers();
        if (distance < GAME_CONFIG.catchDistance) {
            endGame('hunter');
            return;
        } else if (gameState.gameTime > GAME_CONFIG.roundTime * 1000) {
            endGame('prey');
            return;
        }
    }

    updateUI(currentTime);
    render();
    requestAnimationFrame(gameLoop);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Принудительно скрываем кулдауны при загрузке
    document.querySelectorAll('.cooldown-indicator').forEach(el => {
        el.style.display = 'none';
    });
});

// Запуск игрового цикла
requestAnimationFrame(gameLoop);

function updateUI(currentTime = 0) {
    // Обновление таймера
    const elapsed = Math.floor(gameState.gameTime / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const totalMinutes = Math.floor(GAME_CONFIG.roundTime / 60);
    const totalSeconds = GAME_CONFIG.roundTime % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const timer = document.getElementById('gameTimer');
    if (timer) timer.textContent = timeString;

    // Обновление счета
    const hunterScore = document.getElementById('punkScore');
    const preyScore = document.getElementById('businessmanScore');
    if (hunterScore) hunterScore.textContent = gameState.scores.hunter || 0;
    if (preyScore) preyScore.textContent = gameState.scores.prey || 0;

    // Кулдауны (если есть)
    const punkCooldownBar = document.getElementById('punkCooldown');
    const businessmanCooldownBar = document.getElementById('businessmanCooldown');
    if (punkCooldownBar && hunterPlayer) {
        const hunterCooldownPercent = Math.max(0, (5000 - hunterPlayer.ghostCooldown) / 5000 * 100);
        punkCooldownBar.style.width = `${hunterCooldownPercent}%`;
    }
    if (businessmanCooldownBar && preyPlayer) {
        const preyCooldownPercent = Math.max(0, (5000 - preyPlayer.ghostCooldown) / 5000 * 100);
        businessmanCooldownBar.style.width = `${preyCooldownPercent}%`;
    }

    // Обновляем названия способностей в индикаторах кулдауна
    updateCooldownLabels();


}



function updateCooldownLabels() {
    // Обновляем название способности охотника
    const hunterLabel = document.querySelector('.hunter-cooldown-indicator .cooldown-label');
    if (hunterLabel && playerConfig && playerConfig.hunter) {
        let abilityName = '';
        const hunterCharacter = playerConfig.hunter.character;
        
        switch(hunterCharacter) {
            case 'punk':
                abilityName = 'Призрак';
                break;
            case 'businessman':
                abilityName = 'Телепорт';
                break;
            case 'kok':
                abilityName = 'Ускорение';
                break;
            case 'maks':
                abilityName = 'Гигант';
                break;
        }
        
        hunterLabel.textContent = `🎯 Охотник: ${abilityName} (E)`;
    }

    // Обновляем название способности добычи
    const preyLabel = document.querySelector('.prey-cooldown-indicator .cooldown-label');
    if (preyLabel && playerConfig && playerConfig.prey) {
        let abilityName = '';
        const preyCharacter = playerConfig.prey.character;
        
        switch(preyCharacter) {
            case 'punk':
                abilityName = 'Призрак';
                break;
            case 'businessman':
                abilityName = 'Телепорт';
                break;
            case 'kok':
                abilityName = 'Ускорение';
                break;
            case 'maks':
                abilityName = 'Гигант';
                break;
        }
        
        preyLabel.textContent = `🏃‍♂️ Добыча: ${abilityName} (/)`;
    }
}

function updateTensionEffects() {
    // Рассчитываем напряжение по расстоянию между игроками
    const distance = getDistanceBetweenPlayers();
    const maxDistance = Math.sqrt(GAME_CONFIG.worldWidth * GAME_CONFIG.worldWidth + GAME_CONFIG.worldHeight * GAME_CONFIG.worldHeight);
    const tension = Math.max(0, 1 - (distance / (maxDistance / 3))); // Чем ближе, тем больше напряжение

    // Обновляем полосу напряжения
    const tensionFill = document.getElementById('tensionFill');
    const tensionIndicator = document.getElementById('tensionIndicator');
    if (tensionFill) tensionFill.style.width = `${tension * 100}%`;

    // Визуальные эффекты при высоком напряжении
    if (tensionIndicator) {
        if (tension > 0.7) {
            tensionIndicator.classList.add('tension-high');
        } else {
            tensionIndicator.classList.remove('tension-high');
        }
    }
}
