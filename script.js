const COVER_BASE_PATH = "images/cover/cover";

const pages = [
    {
        unit: "cover",
        effect: "cover",
        bw: `${COVER_BASE_PATH}/bw.jpg`,
        color: `${COVER_BASE_PATH}/color.jpg`
    },

    {
        unit: "CoMETIK",
        effect: "comet",
        bw: "images/CoMETIK/01/bw.jpg",
        color: "images/CoMETIK/01/color.jpg"
    },
    {
        unit: "CoMETIK",
        effect: "comet",
        bw: "images/CoMETIK/02/bw.jpg",
        color: "images/CoMETIK/02/color.jpg"
    },
    {
        unit: "CoMETIK",
        effect: "comet",
        bw: "images/CoMETIK/03/bw.jpg",
        color: "images/CoMETIK/03/color.jpg"
    },

    {
        unit: "SHHis",
        effect: "focus",
        bw: "images/SHHis/04/bw.jpg",
        color: "images/SHHis/04/color.jpg"
    },
    {
        unit: "SHHis",
        effect: "focus",
        bw: "images/SHHis/05/bw.jpg",
        color: "images/SHHis/05/color.jpg"
    },

    {
        unit: "noctchill",
        effect: "water",
        bw: "images/noctchill/06/bw.jpg",
        color: "images/noctchill/06/color.jpg"
    },
    {
        unit: "noctchill",
        effect: "water",
        bw: "images/noctchill/07/bw.jpg",
        color: "images/noctchill/07/color.jpg"
    },
    {
        unit: "noctchill",
        effect: "water",
        bw: "images/noctchill/08/bw.jpg",
        color: "images/noctchill/08/color.jpg"
    },
    {
        unit: "noctchill",
        effect: "water",
        bw: "images/noctchill/09/bw.jpg",
        color: "images/noctchill/09/color.jpg"
    },

    {
        unit: "straylight",
        effect: "glitch",
        bw: "images/straylight/10/bw.jpg",
        color: "images/straylight/10/color.jpg"
    },

    {
        unit: "afterword",
        effect: "static",
        bw: "images/afterword/afterword/bw.jpg",
        color: "images/afterword/afterword/bw.jpg"
    }
];

/*
    coverのi位置調整。
*/
const COVER_I_X = 0.494;
const COVER_I_Y = 0.357;

/*
    coverの透明ボタンサイズ。
*/
const COVER_BUTTON_SIZE = 0.135;

/*
    iに近づいた時の反応範囲。
*/
const COVER_HOT_RADIUS = 0.105;

/*
    coverで何も操作されなかった時にヒントを出すまでの時間。
*/
const COVER_HINT_DELAY = 4200;

/*
    ヒントの位置。
*/
const COVER_HINT_OFFSET_Y = 0.160;

let currentPage = 0;

const viewer = document.getElementById("viewer");
const bwImage = document.getElementById("page-bw");
const colorImage = document.getElementById("page-color");
const canvas = document.getElementById("effect-canvas");

const coverSuisai = document.getElementById("cover-suisai");
const coverIMain = document.getElementById("cover-i-main");
const coverIRed = document.getElementById("cover-i-red");
const coverIBlue = document.getElementById("cover-i-blue");
const coverStartButton = document.getElementById("cover-start-button");
const coverHint = document.getElementById("cover-hint");

const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");

if (coverSuisai) {
    coverSuisai.src = `${COVER_BASE_PATH}/cover_suisai.png`;
}

if (coverIMain) {
    coverIMain.src = `${COVER_BASE_PATH}/cover_i.png`;
}

if (coverIRed) {
    coverIRed.src = `${COVER_BASE_PATH}/cover_i.png`;
}

if (coverIBlue) {
    coverIBlue.src = `${COVER_BASE_PATH}/cover_i.png`;
}

const ctx = canvas.getContext("2d");
const maskCanvas = document.createElement("canvas");
const maskCtx = maskCanvas.getContext("2d");

let viewW = 0;
let viewH = 0;
let dpr = 1;

let isChanging = false;

let pointerVisible = false;
let pointerX = 0;
let pointerY = 0;
let followerX = 0;
let followerY = 0;
let pointerStarted = false;

let pointerDown = false;

let lastPointerX = 0;
let lastPointerY = 0;
let lastMoveTime = performance.now();

let lastWaterSpawnX = 0;
let lastWaterSpawnY = 0;
let lastDropTime = 0;

let cometParticles = [];
let sparkleParticles = [];
let waterParticles = [];
let waterDrops = [];
let waterRipples = [];

let focusRadius = 0;
let focusClarity = 0;
let focusCircleSeeds = [];

let coverIX = 0;
let coverIY = 0;
let coverHotness = 0;
let coverTargetHotness = 0;

let nextGlitchTime = performance.now() + 1800 + Math.random() * 2600;
let glitchUntil = 0;

let lastCoverInteractionTime = performance.now();

const settings = {
    comet: {
        headRadius: 38,
        headMaskAlpha: 0.72,
        tailFade: 0.962,
        followSpeed: 0.16,
        particleLimit: 80,
        tailBlur: 5
    },

    focus: {
        movingRadius: 78,
        stillRadius: 152,
        stillGrowSpeed: 0.045,
        moveShrinkSpeed: 0.055,
        followSpeed: 0.075,
        claritySpeed: 0.05,
        sparkleChance: 0.055
    },

    water: {
        baseRadius: 102,
        maxRadius: 210,
        followSpeed: 0.040,
        particleLimit: 58,
        bloomFade: 0.965,
        blur: 13,
        spawnDistance: 6,
        rippleLimit: 12,
        dropLimit: 4
    },

    glitch: {
        followSpeed: 0.18,
        windowWidth: 280,
        windowHeight: 125,
        blockSize: 22,
        edgeJitter: 4,
        rgbShift: 12
    }
};

function currentEffect() {
    return pages[currentPage]?.effect || "focus";
}

function isCoverPage() {
    return pages[currentPage]?.unit === "cover";
}

function getImageRect() {
    return bwImage.getBoundingClientRect();
}

function syncCanvasToImage() {
    const imageRect = getImageRect();
    const viewerRect = viewer.getBoundingClientRect();

    if (
        imageRect.width <= 0 ||
        imageRect.height <= 0 ||
        !Number.isFinite(imageRect.width) ||
        !Number.isFinite(imageRect.height)
    ) {
        return;
    }

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    const nextW = imageRect.width;
    const nextH = imageRect.height;

    const left = imageRect.left - viewerRect.left;
    const top = imageRect.top - viewerRect.top;

    const widthChanged = Math.abs(nextW - viewW) > 0.5;
    const heightChanged = Math.abs(nextH - viewH) > 0.5;

    viewW = nextW;
    viewH = nextH;

    canvas.style.left = `${left}px`;
    canvas.style.top = `${top}px`;
    canvas.style.width = `${viewW}px`;
    canvas.style.height = `${viewH}px`;

    if (
        widthChanged ||
        heightChanged ||
        canvas.width !== Math.floor(viewW * dpr) ||
        canvas.height !== Math.floor(viewH * dpr)
    ) {
        canvas.width = Math.floor(viewW * dpr);
        canvas.height = Math.floor(viewH * dpr);

        maskCanvas.width = Math.floor(viewW * dpr);
        maskCanvas.height = Math.floor(viewH * dpr);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        ctx.clearRect(0, 0, viewW, viewH);
        maskCtx.clearRect(0, 0, viewW, viewH);
    }

    syncCoverElements(imageRect, viewerRect);
}

function syncCoverElements(imageRect, viewerRect) {
    const isCover = isCoverPage();

    viewer.classList.toggle("is-cover", isCover);

    if (!isCover) {
        viewer.classList.remove("is-cover-hot");
        viewer.classList.remove("is-cover-glitch");
        viewer.classList.remove("is-cover-hint");

        coverTargetHotness = 0;
        coverHotness = 0;

        return;
    }

    const left = imageRect.left - viewerRect.left;
    const top = imageRect.top - viewerRect.top;

    const layers = [
        coverSuisai,
        coverIMain,
        coverIRed,
        coverIBlue
    ];

    layers.forEach(layer => {
        if (!layer) return;

        layer.style.left = `${left}px`;
        layer.style.top = `${top}px`;
        layer.style.width = `${viewW}px`;
        layer.style.height = `${viewH}px`;
    });

    coverIX = viewW * COVER_I_X;
    coverIY = viewH * COVER_I_Y;

    if (coverStartButton) {
        const buttonSize = Math.min(viewW, viewH) * COVER_BUTTON_SIZE;

        coverStartButton.style.left = `${left + coverIX - buttonSize / 2}px`;
        coverStartButton.style.top = `${top + coverIY - buttonSize / 2}px`;
        coverStartButton.style.width = `${buttonSize}px`;
        coverStartButton.style.height = `${buttonSize}px`;
    }

    if (coverHint) {
        const hintLeft = left + coverIX;
        const hintTop = top + coverIY + Math.min(viewW, viewH) * COVER_HINT_OFFSET_Y;

        coverHint.style.left = `${hintLeft}px`;
        coverHint.style.top = `${hintTop}px`;
    }
}

window.addEventListener("resize", () => {
    syncCanvasToImage();
});

function preloadImages() {
    pages.forEach(page => {
        const bw = new Image();
        bw.src = page.bw;

        const color = new Image();
        color.src = page.color;
    });

    [
        `${COVER_BASE_PATH}/cover_suisai.png`,
        `${COVER_BASE_PATH}/cover_i.png`
    ].forEach(src => {
        const image = new Image();
        image.src = src;
    });
}

function loadImage(src) {
    return new Promise(resolve => {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);

        image.src = src;
    });
}

function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function getCometMaxTailLength() {
    if (viewW > 0) {
        return viewW * 0.36;
    }

    return window.innerWidth * 0.36;
}

function isInsideImage(clientX, clientY) {
    const rect = getImageRect();

    return (
        clientX >= rect.left &&
        clientY >= rect.top &&
        clientX <= rect.right &&
        clientY <= rect.bottom
    );
}

function toLocalPoint(clientX, clientY) {
    const rect = getImageRect();

    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function resetEffect() {
    pointerVisible = false;
    pointerStarted = false;

    cometParticles = [];
    sparkleParticles = [];
    waterParticles = [];
    waterDrops = [];
    waterRipples = [];

    focusRadius = 0;
    focusClarity = 0;
    focusCircleSeeds = createFocusCircleSeeds();

    lastWaterSpawnX = 0;
    lastWaterSpawnY = 0;
    lastDropTime = 0;

    coverTargetHotness = 0;
    coverHotness = 0;

    viewer.classList.remove("is-cover-hot");
    viewer.classList.remove("is-cover-glitch");
    viewer.classList.remove("is-cover-hint");

    lastCoverInteractionTime = performance.now();

    ctx.clearRect(0, 0, viewW, viewH);
    maskCtx.clearRect(0, 0, viewW, viewH);
}

function createFocusCircleSeeds() {
    const baseAngles = [
        Math.PI * 0.08,
        Math.PI * 0.56,
        Math.PI * 1.02,
        Math.PI * 1.42,
        Math.PI * 1.78
    ];

    return baseAngles.map((angle, index) => ({
        angle: angle + (Math.random() - 0.5) * 0.22,
        speed: 0.35 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        offsetScale: 0.7 + Math.random() * 0.5,
        pulse: 0.85 + Math.random() * 0.35,
        index
    }));
}

function updatePointer(clientX, clientY) {
    if (!isInsideImage(clientX, clientY)) {
        pointerVisible = false;
        coverTargetHotness = 0;
        return;
    }

    const local = toLocalPoint(clientX, clientY);

    const dx = pointerStarted ? local.x - lastPointerX : 0;
    const dy = pointerStarted ? local.y - lastPointerY : 0;

    pointerX = local.x;
    pointerY = local.y;
    pointerVisible = true;

    if (!pointerStarted) {
        followerX = local.x;
        followerY = local.y;

        lastPointerX = local.x;
        lastPointerY = local.y;

        lastWaterSpawnX = local.x;
        lastWaterSpawnY = local.y;

        pointerStarted = true;
    }

    const dist = Math.hypot(dx, dy);

    if (dist > 1.5) {
        lastMoveTime = performance.now();
    }

    if (currentEffect() === "cover") {
        lastCoverInteractionTime = performance.now();
        viewer.classList.remove("is-cover-hint");

        updateCoverHotness(local.x, local.y);
    }

    if (currentEffect() === "comet") {
        addCometParticle(local.x, local.y, dx, dy, dist);
    }

    if (currentEffect() === "focus") {
        maybeAddSparkle(local.x, local.y);
    }

    if (currentEffect() === "water") {
        addWaterParticle(local.x, local.y, dist);

        if (pointerDown) {
            maybeSpawnWaterDrop(local.x, local.y);
        }
    }

    lastPointerX = local.x;
    lastPointerY = local.y;
}

function updateCoverHotness(x, y) {
    if (!isCoverPage()) {
        coverTargetHotness = 0;
        return;
    }

    const distance = Math.hypot(x - coverIX, y - coverIY);
    const radius = Math.min(viewW, viewH) * COVER_HOT_RADIUS;

    coverTargetHotness = 1 - clamp((distance - radius * 0.20) / radius, 0, 1);
}

function addCometParticle(x, y, dx, dy, speed) {
    if (speed < 2.0) return;

    const angle = Math.atan2(dy, dx);
    const maxTail = getCometMaxTailLength();
    const tailLength = clamp(speed * 15, 100, maxTail);

    cometParticles.push({
        x,
        y,
        angle,
        speed,
        length: tailLength,
        nearWidth: clamp(20 + speed * 0.12, 22, 42),
        farWidth: clamp(58 + speed * 0.34, 62, 112),
        life: 1,
        seed: Math.random()
    });

    if (cometParticles.length > settings.comet.particleLimit) {
        cometParticles.shift();
    }
}

function maybeAddSparkle(x, y) {
    if (!pointerVisible) return;
    if (focusClarity < 0.22) return;
    if (Math.random() > settings.focus.sparkleChance) return;

    const radius = 30 + Math.random() * focusRadius * 0.75;
    const angle = Math.random() * Math.PI * 2;

    sparkleParticles.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        size: 4 + Math.random() * 9,
        life: 1,
        rotate: Math.random() * Math.PI
    });

    if (sparkleParticles.length > 35) {
        sparkleParticles.shift();
    }
}

function addWaterParticle(x, y, speed) {
    const moved = Math.hypot(x - lastWaterSpawnX, y - lastWaterSpawnY);

    if (moved < settings.water.spawnDistance && speed < 2.5) return;

    waterParticles.push({
        x,
        y,
        radius: clamp(settings.water.baseRadius + speed * 1.8, 82, settings.water.maxRadius),
        life: 1,
        seed: Math.random() * Math.PI * 2
    });

    lastWaterSpawnX = x;
    lastWaterSpawnY = y;

    if (waterParticles.length > settings.water.particleLimit) {
        waterParticles.shift();
    }
}

function maybeSpawnWaterDrop(x, y) {
    const now = performance.now();

    if (now - lastDropTime < 560) return;

    lastDropTime = now;

    waterDrops.push({
        x,
        y,
        startY: y - Math.min(viewH * 0.18, 130),
        t: 0,
        life: 1
    });

    if (waterDrops.length > settings.water.dropLimit) {
        waterDrops.shift();
    }
}

function spawnRipple(x, y) {
    waterRipples.push({
        x,
        y,
        radius: 14,
        life: 1
    });

    waterParticles.push({
        x,
        y,
        radius: settings.water.maxRadius * 0.82,
        life: 1,
        seed: Math.random() * Math.PI * 2
    });

    if (waterRipples.length > settings.water.rippleLimit) {
        waterRipples.shift();
    }
}

function render() {
    syncCanvasToImage();

    ctx.clearRect(0, 0, viewW, viewH);
    maskCtx.clearRect(0, 0, viewW, viewH);

    updateFollower();
    updateCoverState();
    updateCoverGlitch();
    updateCoverHint();

    if (colorImage.complete && colorImage.naturalWidth > 0 && viewW > 0 && viewH > 0) {
        if (currentEffect() === "cover") {
            drawCoverMask(maskCtx);
        }

        if (currentEffect() === "comet") {
            drawCometMask(maskCtx);
        }

        if (currentEffect() === "focus") {
            drawFocusMask(maskCtx);
        }

        if (currentEffect() === "water") {
            drawWaterMask(maskCtx);
        }

        if (currentEffect() === "glitch") {
            drawGlitchMask(maskCtx);
        }

        drawColorThroughMask();
        drawHighlights();
    }

    decayParticles();

    requestAnimationFrame(render);
}

function updateFollower() {
    if (!pointerStarted) return;

    const effect = currentEffect();

    if (effect === "cover") {
        followerX += (pointerX - followerX) * 0.16;
        followerY += (pointerY - followerY) * 0.16;
    }

    if (effect === "comet") {
        followerX += (pointerX - followerX) * settings.comet.followSpeed;
        followerY += (pointerY - followerY) * settings.comet.followSpeed;
    }

    if (effect === "focus") {
        followerX += (pointerX - followerX) * settings.focus.followSpeed;
        followerY += (pointerY - followerY) * settings.focus.followSpeed;

        const stillTime = performance.now() - lastMoveTime;
        const stillness = pointerVisible
            ? clamp(stillTime / 950, 0, 1)
            : 0;

        const targetRadius = pointerVisible
            ? settings.focus.movingRadius + (settings.focus.stillRadius - settings.focus.movingRadius) * stillness
            : 0;

        const radiusSpeed =
            targetRadius > focusRadius
                ? settings.focus.stillGrowSpeed
                : settings.focus.moveShrinkSpeed;

        focusRadius += (targetRadius - focusRadius) * radiusSpeed;

        const targetClarity = pointerVisible ? stillness : 0;
        focusClarity += (targetClarity - focusClarity) * settings.focus.claritySpeed;
    }

    if (effect === "water") {
        followerX += (pointerX - followerX) * settings.water.followSpeed;
        followerY += (pointerY - followerY) * settings.water.followSpeed;
    }

    if (effect === "glitch") {
        followerX += (pointerX - followerX) * settings.glitch.followSpeed;
        followerY += (pointerY - followerY) * settings.glitch.followSpeed;
    }
}

function updateCoverState() {
    if (!isCoverPage()) {
        coverHotness += (0 - coverHotness) * 0.18;
        viewer.classList.remove("is-cover-hot");
        return;
    }

    coverHotness += (coverTargetHotness - coverHotness) * 0.14;

    if (coverHotness > 0.12) {
        viewer.classList.add("is-cover-hot");
    } else {
        viewer.classList.remove("is-cover-hot");
    }
}

function updateCoverGlitch() {
    const now = performance.now();

    if (!isCoverPage()) {
        viewer.classList.remove("is-cover-glitch");
        return;
    }

    if (now > nextGlitchTime) {
        glitchUntil = now + 90 + Math.random() * 140;
        nextGlitchTime = now + 2200 + Math.random() * 4200;
    }

    if (now < glitchUntil) {
        viewer.classList.add("is-cover-glitch");
    } else {
        viewer.classList.remove("is-cover-glitch");
    }
}

function updateCoverHint() {
    if (!isCoverPage()) {
        viewer.classList.remove("is-cover-hint");
        return;
    }

    const now = performance.now();
    const isIdle = now - lastCoverInteractionTime > COVER_HINT_DELAY;

    if (isIdle && coverHotness < 0.12) {
        viewer.classList.add("is-cover-hint");
    } else {
        viewer.classList.remove("is-cover-hint");
    }
}

function drawColorThroughMask() {
    if (viewW <= 0 || viewH <= 0) return;

    ctx.save();

    ctx.drawImage(
        colorImage,
        0,
        0,
        viewW,
        viewH
    );

    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(maskCanvas, 0, 0, viewW, viewH);

    ctx.restore();
}

function drawCoverMask(targetCtx) {
    if (!pointerVisible && coverHotness <= 0.01) return;

    if (pointerVisible) {
        const cursorRadius = Math.min(viewW, viewH) * 0.170;

        const cursorGradient = targetCtx.createRadialGradient(
            followerX,
            followerY,
            cursorRadius * 0.08,
            followerX,
            followerY,
            cursorRadius
        );

        cursorGradient.addColorStop(0, "rgba(0,0,0,0.52)");
        cursorGradient.addColorStop(0.42, "rgba(0,0,0,0.32)");
        cursorGradient.addColorStop(0.72, "rgba(0,0,0,0.14)");
        cursorGradient.addColorStop(1, "rgba(0,0,0,0)");

        targetCtx.fillStyle = cursorGradient;
        targetCtx.beginPath();
        targetCtx.arc(followerX, followerY, cursorRadius, 0, Math.PI * 2);
        targetCtx.fill();
    }

    if (coverHotness > 0.01) {
        const iRadius = Math.min(viewW, viewH) * (0.075 + coverHotness * 0.045);

        const iGradient = targetCtx.createRadialGradient(
            coverIX,
            coverIY,
            iRadius * 0.10,
            coverIX,
            coverIY,
            iRadius
        );

        iGradient.addColorStop(0, `rgba(0,0,0,${0.34 * coverHotness})`);
        iGradient.addColorStop(0.46, `rgba(0,0,0,${0.16 * coverHotness})`);
        iGradient.addColorStop(1, "rgba(0,0,0,0)");

        targetCtx.fillStyle = iGradient;
        targetCtx.beginPath();
        targetCtx.arc(coverIX, coverIY, iRadius, 0, Math.PI * 2);
        targetCtx.fill();
    }
}

function drawCometMask(targetCtx) {
    targetCtx.save();

    cometParticles.forEach(p => {
        const alpha = p.life;
        const len = p.length * alpha;

        const nearHalf = p.nearWidth * 0.35 * alpha;
        const farHalf = p.farWidth * alpha;

        targetCtx.save();
        targetCtx.translate(p.x, p.y);
        targetCtx.rotate(p.angle);

        targetCtx.filter = `blur(${settings.comet.tailBlur}px)`;

        const gradient = targetCtx.createLinearGradient(-len, 0, 8, 0);
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(0.18, `rgba(0,0,0,${0.20 * alpha})`);
        gradient.addColorStop(0.55, `rgba(0,0,0,${0.50 * alpha})`);
        gradient.addColorStop(1, `rgba(0,0,0,${0.82 * alpha})`);

        targetCtx.fillStyle = gradient;

        targetCtx.beginPath();
        targetCtx.moveTo(8, -nearHalf);
        targetCtx.lineTo(-len, -farHalf);
        targetCtx.lineTo(-len, farHalf);
        targetCtx.lineTo(8, nearHalf);
        targetCtx.closePath();
        targetCtx.fill();

        targetCtx.filter = "none";
        targetCtx.restore();
    });

    if (pointerVisible) {
        drawRadialMask(
            targetCtx,
            followerX,
            followerY,
            settings.comet.headRadius,
            settings.comet.headMaskAlpha
        );
    }

    targetCtx.restore();
}

function drawFocusMask(targetCtx) {
    if (focusRadius < 1) return;

    const r = focusRadius;
    const clarity = focusClarity;
    const time = performance.now() / 1000;

    const gather = clamp(clarity, 0, 1);

    const spreadScale = 1 - gather * 0.78;
    const driftScale = 1 - gather * 0.86;

    const baseCircles = [
        { bx: 0, by: 0, rr: 0.52, a: 0.30 + clarity * 0.20 },
        { bx: 0.26, by: -0.08, rr: 0.44, a: 0.22 + clarity * 0.18 },
        { bx: -0.22, by: 0.16, rr: 0.42, a: 0.20 + clarity * 0.16 },
        { bx: 0.04, by: 0.30, rr: 0.34, a: 0.16 + clarity * 0.14 },
        { bx: -0.02, by: -0.27, rr: 0.31, a: 0.14 + clarity * 0.12 }
    ];

    targetCtx.save();

    baseCircles.forEach((circle, i) => {
        const seed = focusCircleSeeds[i] || {
            angle: i,
            speed: 1,
            phase: i,
            offsetScale: 1,
            pulse: 1
        };

        const driftAmount = (8 + r * 0.06) * seed.offsetScale * driftScale;
        const driftWave = Math.sin(time * seed.speed + seed.phase);
        const driftX = Math.cos(seed.angle) * driftAmount * driftWave;
        const driftY = Math.sin(seed.angle) * driftAmount * driftWave;

        const pulseAmount = 0.035 * seed.pulse * (0.45 + driftScale * 0.55);
        const pulse = 1 + Math.sin(time * (0.7 + seed.speed * 0.2) + seed.phase) * pulseAmount;

        const cx = followerX + circle.bx * r * spreadScale + driftX;
        const cy = followerY + circle.by * r * spreadScale + driftY;
        const cr = circle.rr * r * pulse;

        targetCtx.fillStyle = `rgba(0,0,0,${circle.a})`;
        targetCtx.beginPath();
        targetCtx.arc(cx, cy, cr, 0, Math.PI * 2);
        targetCtx.fill();
    });

    targetCtx.restore();
}

function drawWaterMask(targetCtx) {
    targetCtx.save();
    targetCtx.filter = `blur(${settings.water.blur}px)`;

    waterParticles.forEach(p => {
        const alpha = p.life;
        const r = p.radius * (0.9 + (1 - alpha) * 0.22);

        const g1 = targetCtx.createRadialGradient(
            p.x,
            p.y,
            r * 0.10,
            p.x,
            p.y,
            r
        );

        g1.addColorStop(0, `rgba(0,0,0,${0.56 * alpha})`);
        g1.addColorStop(0.42, `rgba(0,0,0,${0.34 * alpha})`);
        g1.addColorStop(1, "rgba(0,0,0,0)");

        targetCtx.fillStyle = g1;
        targetCtx.beginPath();
        targetCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
        targetCtx.fill();

        const ox = Math.cos(p.seed) * r * 0.18;
        const oy = Math.sin(p.seed) * r * 0.14;

        const g2 = targetCtx.createRadialGradient(
            p.x + ox,
            p.y + oy,
            r * 0.05,
            p.x + ox,
            p.y + oy,
            r * 0.78
        );

        g2.addColorStop(0, `rgba(0,0,0,${0.30 * alpha})`);
        g2.addColorStop(1, "rgba(0,0,0,0)");

        targetCtx.fillStyle = g2;
        targetCtx.beginPath();
        targetCtx.arc(p.x + ox, p.y + oy, r * 0.78, 0, Math.PI * 2);
        targetCtx.fill();
    });

    waterRipples.forEach(rp => {
        const alpha = rp.life;
        const r = rp.radius;

        const g = targetCtx.createRadialGradient(
            rp.x,
            rp.y,
            r * 0.08,
            rp.x,
            rp.y,
            r
        );

        g.addColorStop(0, `rgba(0,0,0,${0.34 * alpha})`);
        g.addColorStop(0.58, `rgba(0,0,0,${0.18 * alpha})`);
        g.addColorStop(1, "rgba(0,0,0,0)");

        targetCtx.fillStyle = g;
        targetCtx.beginPath();
        targetCtx.arc(rp.x, rp.y, r, 0, Math.PI * 2);
        targetCtx.fill();
    });

    if (pointerVisible) {
        const leaderR = clamp(settings.water.baseRadius + 44, 116, 172);

        const g = targetCtx.createRadialGradient(
            followerX,
            followerY,
            leaderR * 0.12,
            followerX,
            followerY,
            leaderR
        );

        g.addColorStop(0, "rgba(0,0,0,0.58)");
        g.addColorStop(0.42, "rgba(0,0,0,0.34)");
        g.addColorStop(1, "rgba(0,0,0,0)");

        targetCtx.fillStyle = g;
        targetCtx.beginPath();
        targetCtx.arc(followerX, followerY, leaderR, 0, Math.PI * 2);
        targetCtx.fill();
    }

    targetCtx.filter = "none";
    targetCtx.restore();
}

function drawGlitchMask(targetCtx) {
    if (!pointerVisible) return;

    const time = performance.now() / 1000;

    const block = settings.glitch.blockSize;
    const jitter = settings.glitch.edgeJitter;

    const w = clamp(settings.glitch.windowWidth, 280, viewW * 0.76);
    const h = clamp(settings.glitch.windowHeight, 112, viewH * 0.28);

    const baseX = Math.round((followerX - w / 2) / block) * block;
    const baseY = Math.round((followerY - h / 2) / block) * block;

    const cols = Math.max(8, Math.round(w / block));
    const rows = Math.max(5, Math.round(h / block));

    const mainW = cols * block;
    const mainH = rows * block;

    targetCtx.save();

    /*
        ガタガタに崩れた四角い覗き穴。
        行ごとに左右端をずらして、ただの長方形に見えないようにする。
    */
    for (let row = 0; row < rows; row++) {
        const y = baseY + row * block;

        let leftInset = Math.floor((Math.sin(time * 1.3 + row * 0.82) + 1) * 0.9);
        let rightInset = Math.floor((Math.cos(time * 1.15 + row * 0.77) + 1) * 0.9);

        if (row === 0 || row === rows - 1) {
            leftInset = Math.min(jitter, leftInset + 1);
            rightInset = Math.min(jitter, rightInset + 1);
        }

        const startX = baseX + leftInset * block;
        const width = mainW - (leftInset + rightInset) * block;

        if (width > 0) {
            targetCtx.fillStyle = "rgba(0,0,0,1)";
            targetCtx.fillRect(startX, y, width, block);
        }
    }

    /*
        上下に少しだけ飛び出しブロック。
    */
    for (let col = 0; col < cols; col++) {
        const x = baseX + col * block;

        const topBlocks = Math.max(
            0,
            Math.floor((Math.sin(time * 2.0 + col * 0.68) + 1) * 0.9) - 1
        );

        const bottomBlocks = Math.max(
            0,
            Math.floor((Math.cos(time * 1.85 + col * 0.73) + 1) * 0.9) - 1
        );

        if ((col % 2 === 0 || col % 5 === 0) && topBlocks > 0) {
            targetCtx.fillStyle = "rgba(0,0,0,0.30)";
            targetCtx.fillRect(
                x,
                baseY - topBlocks * block,
                block,
                topBlocks * block
            );
        }

        if ((col % 3 === 0 || col % 4 === 0) && bottomBlocks > 0) {
            targetCtx.fillStyle = "rgba(0,0,0,0.28)";
            targetCtx.fillRect(
                x,
                baseY + mainH,
                block,
                bottomBlocks * block
            );
        }
    }

    /*
        左右にも少しだけ崩れ。
    */
    for (let row = 0; row < rows; row++) {
        const y = baseY + row * block;

        const leftBlocks = Math.max(
            0,
            Math.floor((Math.sin(time * 1.55 + row * 0.92) + 1) * 0.9) - 1
        );

        const rightBlocks = Math.max(
            0,
            Math.floor((Math.cos(time * 1.42 + row * 0.88) + 1) * 0.9) - 1
        );

        if (row % 2 === 0 && leftBlocks > 0) {
            targetCtx.fillStyle = "rgba(0,0,0,0.24)";
            targetCtx.fillRect(
                baseX - leftBlocks * block,
                y,
                leftBlocks * block,
                block
            );
        }

        if (row % 2 === 1 && rightBlocks > 0) {
            targetCtx.fillStyle = "rgba(0,0,0,0.24)";
            targetCtx.fillRect(
                baseX + mainW,
                y,
                rightBlocks * block,
                block
            );
        }
    }

    targetCtx.restore();
}

function drawRadialMask(targetCtx, x, y, radius, alpha = 1) {
    const gradient = targetCtx.createRadialGradient(
        x,
        y,
        radius * 0.08,
        x,
        y,
        radius
    );

    gradient.addColorStop(0, `rgba(0,0,0,${alpha})`);
    gradient.addColorStop(0.55, `rgba(0,0,0,${alpha * 0.62})`);
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    targetCtx.fillStyle = gradient;

    targetCtx.beginPath();
    targetCtx.arc(x, y, radius, 0, Math.PI * 2);
    targetCtx.fill();
}

function drawHighlights() {
    const effect = currentEffect();

    if (effect === "comet") {
        drawCometHighlights();
    }

    if (effect === "focus") {
        drawFocusHighlights();
    }

    if (effect === "water") {
        drawWaterHighlights();
    }

    if (effect === "glitch") {
        drawGlitchHighlights();
    }
}

function drawCometHighlights() {
    if (!pointerVisible) return;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const glow = ctx.createRadialGradient(
        followerX,
        followerY,
        0,
        followerX,
        followerY,
        72
    );

    glow.addColorStop(0, "rgba(255,255,255,.18)");
    glow.addColorStop(0.38, "rgba(255,255,255,.075)");
    glow.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(followerX, followerY, 72, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawFocusHighlights() {
    const r = focusRadius;
    const clarity = focusClarity;
    const time = performance.now() / 1000;

    if (r > 1) {
        ctx.save();

        ctx.globalAlpha = 0.18 + clarity * 0.16;
        ctx.strokeStyle = "rgba(255,255,255,.35)";
        ctx.lineWidth = 1;

        const gather = clamp(clarity, 0, 1);
        const spreadScale = 1 - gather * 0.78;
        const driftScale = 1 - gather * 0.86;

        const outlineBase = [
            { bx: 0, by: 0, rr: 0.52 },
            { bx: 0.26, by: -0.08, rr: 0.44 },
            { bx: -0.22, by: 0.16, rr: 0.42 }
        ];

        outlineBase.forEach((circle, i) => {
            const seed = focusCircleSeeds[i] || {
                angle: i,
                speed: 1,
                phase: i,
                offsetScale: 1,
                pulse: 1
            };

            const driftAmount = (8 + r * 0.06) * seed.offsetScale * driftScale;
            const driftWave = Math.sin(time * seed.speed + seed.phase);
            const driftX = Math.cos(seed.angle) * driftAmount * driftWave;
            const driftY = Math.sin(seed.angle) * driftAmount * driftWave;

            const pulseAmount = 0.035 * seed.pulse * (0.45 + driftScale * 0.55);
            const pulse = 1 + Math.sin(time * (0.7 + seed.speed * 0.2) + seed.phase) * pulseAmount;

            const cx = followerX + circle.bx * r * spreadScale + driftX;
            const cy = followerY + circle.by * r * spreadScale + driftY;
            const cr = circle.rr * r * pulse;

            ctx.beginPath();
            ctx.arc(cx, cy, cr, 0, Math.PI * 2);
            ctx.stroke();
        });

        ctx.restore();
    }

    sparkleParticles.forEach(p => {
        const alpha = p.life * focusClarity;

        if (alpha <= 0.02) return;

        ctx.save();

        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotate);

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "rgba(255,255,255,.55)";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(p.size, 0);
        ctx.moveTo(0, -p.size);
        ctx.lineTo(0, p.size);
        ctx.stroke();

        ctx.restore();
    });
}

function drawWaterHighlights() {
    if (!pointerVisible && waterDrops.length === 0 && waterRipples.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    if (pointerVisible) {
        const glow = ctx.createRadialGradient(
            followerX,
            followerY,
            0,
            followerX,
            followerY,
            150
        );

        glow.addColorStop(0, "rgba(255,255,255,.20)");
        glow.addColorStop(0.40, "rgba(255,255,255,.08)");
        glow.addColorStop(1, "rgba(255,255,255,0)");

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(followerX, followerY, 150, 0, Math.PI * 2);
        ctx.fill();
    }

    waterDrops.forEach(drop => {
        const y = drop.startY + (drop.y - drop.startY) * easeIn(drop.t);

        ctx.globalAlpha = drop.life * 0.42;
        ctx.fillStyle = "rgba(255,255,255,.7)";

        ctx.beginPath();
        ctx.ellipse(drop.x, y, 3.2, 9.5, 0, 0, Math.PI * 2);
        ctx.fill();
    });

    waterRipples.forEach(rp => {
        const alpha = rp.life;

        ctx.globalAlpha = alpha * 0.32;
        ctx.strokeStyle = "rgba(255,255,255,.75)";
        ctx.lineWidth = 1.4;

        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.radius * 0.48, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = alpha * 0.16;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.radius * 0.78, 0, Math.PI * 2);
        ctx.stroke();
    });

    ctx.restore();
}

function drawGlitchHighlights() {
    if (!pointerVisible) return;

    const time = performance.now() / 1000;

    const block = settings.glitch.blockSize;
    const shift = settings.glitch.rgbShift;

    const w = clamp(settings.glitch.windowWidth, 280, viewW * 0.76);
    const h = clamp(settings.glitch.windowHeight, 112, viewH * 0.28);

    const baseX = Math.round((followerX - w / 2) / block) * block;
    const baseY = Math.round((followerY - h / 2) / block) * block;

    const cols = Math.max(8, Math.round(w / block));
    const rows = Math.max(5, Math.round(h / block));

    const mainW = cols * block;
    const mainH = rows * block;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    /*
        RGBずれした大きめの塊。
        小粒ではなく、周辺で大きな面がズレる感じ。
    */
    const slabLayers = [
        { dx: -shift, dy: 0, color: "rgba(255, 70, 110, 0.18)" },
        { dx: shift, dy: 0, color: "rgba(80, 220, 255, 0.18)" },
        { dx: 0, dy: 0, color: "rgba(255, 255, 255, 0.08)" }
    ];

    slabLayers.forEach((layer, index) => {
        const phase = time * (1.2 + index * 0.15);

        ctx.fillStyle = layer.color;

        ctx.fillRect(
            baseX - block * 2 + Math.sin(phase * 1.4) * 10 + layer.dx,
            baseY - block * 2 + layer.dy,
            mainW * 0.72,
            block * 1.2
        );

        ctx.fillRect(
            baseX + mainW * 0.22 + Math.cos(phase * 1.25) * 12 + layer.dx,
            baseY + mainH + block * 0.8 + layer.dy,
            mainW * 0.68,
            block * 1.2
        );

        ctx.fillRect(
            baseX - block * 1.6 + layer.dx,
            baseY + block * 0.4 + Math.sin(phase * 1.1) * 8 + layer.dy,
            block * 1.1,
            mainH * 0.55
        );

        ctx.fillRect(
            baseX + mainW + block * 0.5 + layer.dx,
            baseY + mainH * 0.18 + Math.cos(phase * 1.05) * 8 + layer.dy,
            block * 1.1,
            mainH * 0.58
        );
    });

    /*
        ガタガタの辺に沿って、RGBのズレ線。
    */
    for (let row = 0; row < rows; row++) {
        const y = baseY + row * block;

        const leftInset = Math.floor((Math.sin(time * 1.3 + row * 0.82) + 1) * 0.9);
        const rightInset = Math.floor((Math.cos(time * 1.15 + row * 0.77) + 1) * 0.9);

        const leftX = baseX + leftInset * block;
        const rightX = baseX + mainW - rightInset * block;
        const width = mainW - (leftInset + rightInset) * block;

        ctx.fillStyle = "rgba(255, 70, 110, 0.22)";
        ctx.fillRect(leftX - shift, y, block * 0.9, block * 0.18);

        ctx.fillStyle = "rgba(80, 220, 255, 0.22)";
        ctx.fillRect(rightX + shift - block * 0.9, y + block * 0.82, block * 0.9, block * 0.18);
        
    }

    /*
        中央は薄く明るくして「覗いている」感じを残す。
    */
    const glow = ctx.createLinearGradient(
        baseX,
        baseY,
        baseX,
        baseY + mainH
    );

    glow.addColorStop(0, "rgba(255,255,255,0.02)");
    glow.addColorStop(0.5, "rgba(255,255,255,0.06)");
    glow.addColorStop(1, "rgba(255,255,255,0.02)");

    ctx.fillStyle = glow;
    ctx.fillRect(baseX, baseY, mainW, mainH);

    ctx.restore();
}

function decayParticles() {
    cometParticles.forEach(p => {
        p.life *= settings.comet.tailFade;
    });
    cometParticles = cometParticles.filter(p => p.life > 0.018);

    sparkleParticles.forEach(p => {
        p.life *= 0.94;
        p.rotate += 0.025;
    });
    sparkleParticles = sparkleParticles.filter(p => p.life > 0.035);

    waterParticles.forEach(p => {
        p.life *= settings.water.bloomFade;
        p.radius *= 1.004;
    });
    waterParticles = waterParticles.filter(p => p.life > 0.038);

    waterDrops.forEach(drop => {
        drop.t += 0.045;
        drop.life *= 0.98;

        if (drop.t >= 1 && !drop.done) {
            drop.done = true;
            spawnRipple(drop.x, drop.y);
        }
    });
    waterDrops = waterDrops.filter(drop => drop.t < 1.08);

    waterRipples.forEach(rp => {
        rp.life *= 0.935;
        rp.radius += 5.2;
    });
    waterRipples = waterRipples.filter(rp => rp.life > 0.035);
}

async function showPage(index, direction = 1) {
    if (isChanging) return;

    isChanging = true;
    currentPage = index;

    resetEffect();
    syncCanvasToImage();

    bwImage.style.opacity = 0;
    canvas.style.opacity = 0;

    bwImage.style.transform = `translateX(${direction * 14}px) scale(.985)`;
    canvas.style.transform = `translateX(${direction * 14}px) scale(.985)`;

    await wait(160);

    const bw = await loadImage(pages[index].bw);
    const color = await loadImage(pages[index].color);

    if (bw) {
        bwImage.src = bw.src;
    }

    if (color) {
        colorImage.src = color.src;
    } else if (bw) {
        colorImage.src = bw.src;
    }

    await wait(50);
    syncCanvasToImage();

    bwImage.style.transform = `translateX(${-direction * 14}px) scale(.985)`;
    canvas.style.transform = `translateX(${-direction * 14}px) scale(.985)`;

    await wait(40);

    bwImage.style.opacity = 1;
    canvas.style.opacity = 1;

    bwImage.style.transform = "translateX(0) scale(1)";
    canvas.style.transform = "translateX(0) scale(1)";

    await wait(280);

    isChanging = false;
}

function nextPage() {
    if (isChanging) return;

    let next = currentPage + 1;

    if (next >= pages.length) {
        next = 0;
    }

    showPage(next, 1);
}

function prevPage() {
    if (isChanging) return;

    let prev = currentPage - 1;

    if (prev < 0) {
        prev = pages.length - 1;
    }

    showPage(prev, -1);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function easeIn(t) {
    return t * t;
}

/* 鑑賞操作 */
viewer.addEventListener("pointermove", event => {
    event.preventDefault();
    updatePointer(event.clientX, event.clientY);
}, { passive: false });

viewer.addEventListener("pointerdown", event => {
    if (event.button !== undefined && event.button !== 0) return;

    event.preventDefault();

    pointerDown = true;
    updatePointer(event.clientX, event.clientY);

    if (currentEffect() === "water" && pointerVisible) {
        maybeSpawnWaterDrop(pointerX, pointerY);
    }
}, { passive: false });

viewer.addEventListener("pointerup", event => {
    event.preventDefault();

    pointerDown = false;
    updatePointer(event.clientX, event.clientY);
}, { passive: false });

viewer.addEventListener("pointerleave", () => {
    pointerVisible = false;
    coverTargetHotness = 0;
});

viewer.addEventListener("pointercancel", () => {
    pointerVisible = false;
    pointerDown = false;
    coverTargetHotness = 0;
});

/* 長押し・コピー対策 */
document.addEventListener("contextmenu", event => {
    event.preventDefault();
});

/* coverのiを押したら開始 */
if (coverStartButton) {
    coverStartButton.addEventListener("pointermove", event => {
        event.preventDefault();
        event.stopPropagation();

        updatePointer(event.clientX, event.clientY);
    }, { passive: false });

    coverStartButton.addEventListener("pointerdown", event => {
        event.preventDefault();
        event.stopPropagation();

        pointerDown = true;
        updatePointer(event.clientX, event.clientY);
        coverTargetHotness = 1;
        lastCoverInteractionTime = performance.now();
        viewer.classList.remove("is-cover-hint");
    }, { passive: false });

    coverStartButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        if (isCoverPage()) {
            nextPage();
        }
    });
}

/* 矢印ボタン */
prevButton.addEventListener("pointerdown", event => {
    event.preventDefault();
    event.stopPropagation();
});

nextButton.addEventListener("pointerdown", event => {
    event.preventDefault();
    event.stopPropagation();
});

prevButton.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    prevPage();
});

nextButton.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    nextPage();
});

/* キーボード */
document.addEventListener("keydown", event => {
    if (event.key === "ArrowRight" && !isCoverPage()) {
        nextPage();
    }

    if (event.key === "ArrowLeft" && !isCoverPage()) {
        prevPage();
    }
});

preloadImages();
render();
showPage(0, 1);