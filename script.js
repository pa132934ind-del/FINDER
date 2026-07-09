const pages = [
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
    }
];

let currentPage = 0;

const viewer = document.getElementById("viewer");
const bwImage = document.getElementById("page-bw");
const colorImage = document.getElementById("page-color");
const canvas = document.getElementById("effect-canvas");

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
let pointerStartX = 0;
let pointerStartY = 0;

let lastPointerX = 0;
let lastPointerY = 0;
let lastMoveTime = performance.now();

let cometParticles = [];
let sparkleParticles = [];

let focusRadius = 0;
let focusClarity = 0;
let focusCircleSeeds = [];

const settings = {
    comet: {
        headRadius: 38,
        headMaskAlpha: 0.72,

        // 軽量化：粒数と残り方を少し抑える
        tailFade: 0.962,
        followSpeed: 0.16,
        particleLimit: 80,

        // ブラーは弱めにして処理を軽くする
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
    }
};

function currentEffect() {
    return pages[currentPage]?.effect || "focus";
}

function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    viewW = window.innerWidth;
    viewH = window.innerHeight;

    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);

    maskCanvas.width = Math.floor(viewW * dpr);
    maskCanvas.height = Math.floor(viewH * dpr);

    canvas.style.width = `${viewW}px`;
    canvas.style.height = `${viewH}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resizeCanvas);

function preloadImages() {
    pages.forEach(page => {
        const bw = new Image();
        bw.src = page.bw;

        const color = new Image();
        color.src = page.color;
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

function getImageRect() {
    return bwImage.getBoundingClientRect();
}

function getCometMaxTailLength() {
    const rect = getImageRect();

    if (rect.width > 0) {
        return rect.width * 0.36;
    }

    return viewW * 0.36;
}

function isInsideImage(x, y) {
    const rect = getImageRect();

    return (
        x >= rect.left &&
        y >= rect.top &&
        x <= rect.right &&
        y <= rect.bottom
    );
}

function resetEffect() {
    pointerVisible = false;
    pointerStarted = false;

    cometParticles = [];
    sparkleParticles = [];

    focusRadius = 0;
    focusClarity = 0;
    focusCircleSeeds = createFocusCircleSeeds();

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

function updatePointer(x, y) {
    if (!isInsideImage(x, y)) {
        pointerVisible = false;
        return;
    }

    const dx = pointerStarted ? x - lastPointerX : 0;
    const dy = pointerStarted ? y - lastPointerY : 0;

    pointerX = x;
    pointerY = y;
    pointerVisible = true;

    if (!pointerStarted) {
        followerX = x;
        followerY = y;

        lastPointerX = x;
        lastPointerY = y;

        pointerStarted = true;
    }

    const dist = Math.hypot(dx, dy);

    if (dist > 1.5) {
        lastMoveTime = performance.now();
    }

    if (currentEffect() === "comet") {
        addCometParticle(x, y, dx, dy, dist);
    }

    if (currentEffect() === "focus") {
        maybeAddSparkle(x, y);
    }

    lastPointerX = x;
    lastPointerY = y;
}

function addCometParticle(x, y, dx, dy, speed) {
    // 軽量化：細かすぎる移動では粒を増やさない
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

        // 逆三角の広がり
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

function render() {
    ctx.clearRect(0, 0, viewW, viewH);
    maskCtx.clearRect(0, 0, viewW, viewH);

    updateFollower();

    if (colorImage.complete && colorImage.naturalWidth > 0) {
        if (currentEffect() === "comet") {
            drawCometMask(maskCtx);
        }

        if (currentEffect() === "focus") {
            drawFocusMask(maskCtx);
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
}

function drawColorThroughMask() {
    const rect = getImageRect();

    if (rect.width <= 0 || rect.height <= 0) return;

    ctx.save();

    ctx.drawImage(
        colorImage,
        rect.left,
        rect.top,
        rect.width,
        rect.height
    );

    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(maskCanvas, 0, 0, viewW, viewH);

    ctx.restore();
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

        // 単純な逆三角尾＋軽いブラー
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

    /*
        SHHis：
        移動時はまばら。
        ピントが合うほど中央へ集まって、ほぼ重なる。
    */
    const gather = clamp(clarity, 0, 1);

    // clarityが高いほど、配置のズレと動きを小さくする
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
}

function drawCometHighlights() {
    if (!pointerVisible) return;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // タップ面の点を消して、ぼやけた光だけにする
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
}

async function showPage(index, direction = 1) {
    if (isChanging) return;

    isChanging = true;
    resetEffect();

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

    currentPage++;

    if (currentPage >= pages.length) {
        currentPage = 0;
    }

    showPage(currentPage, 1);
}

function prevPage() {
    if (isChanging) return;

    currentPage--;

    if (currentPage < 0) {
        currentPage = pages.length - 1;
    }

    showPage(currentPage, -1);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

viewer.addEventListener("pointermove", event => {
    updatePointer(event.clientX, event.clientY);
});

viewer.addEventListener("pointerleave", () => {
    pointerVisible = false;
});

viewer.addEventListener("pointerdown", event => {
    if (event.button !== undefined && event.button !== 0) return;

    pointerDown = true;

    pointerStartX = event.clientX;
    pointerStartY = event.clientY;

    updatePointer(event.clientX, event.clientY);
});

viewer.addEventListener("pointerup", event => {
    if (!pointerDown) return;

    pointerDown = false;

    const diffX = event.clientX - pointerStartX;
    const diffY = event.clientY - pointerStartY;

    updatePointer(event.clientX, event.clientY);

    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < 0) {
            nextPage();
        } else {
            prevPage();
        }

        return;
    }

    if (Math.abs(diffX) < 12 && Math.abs(diffY) < 12) {
        setTimeout(() => {
            nextPage();
        }, 120);
    }
});

viewer.addEventListener("pointercancel", () => {
    pointerVisible = false;
    pointerDown = false;
});

document.addEventListener("keydown", event => {
    if (event.key === "ArrowRight") {
        nextPage();
    }

    if (event.key === "ArrowLeft") {
        prevPage();
    }
});

resizeCanvas();
preloadImages();
render();
showPage(currentPage, 1);