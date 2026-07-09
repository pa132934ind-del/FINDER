const pages = [
    {
        bw: "images/CoMETIK/01/bw.jpg",
        color: "images/CoMETIK/01/color.jpg"
    },
    {
        bw: "images/CoMETIK/02/bw.jpg",
        color: "images/CoMETIK/02/color.jpg"
    },
    {
        bw: "images/CoMETIK/03/bw.jpg",
        color: "images/CoMETIK/03/color.jpg"
    },
    {
        bw: "images/SHHis/04/bw.jpg",
        color: "images/SHHis/04/color.jpg"
    },
    {
        bw: "images/SHHis/05/bw.jpg",
        color: "images/SHHis/05/color.jpg"
    }
];

let currentPage = 0;

const viewer = document.getElementById("viewer");
const bwImage = document.getElementById("page-bw");
const colorImage = document.getElementById("page-color");

let isChanging = false;

// 色窓の最大サイズ。置きっぱなしでもこれ以上は広がらない。
const MAX_RADIUS = 150;

// 通常時の見える範囲。
const NORMAL_RADIUS = 120;

// タップ・クリック時だけ少し大きくする。
const TAP_RADIUS = 158;

// 小さいほど、カーソルに遅れて水っぽく追従する。
const FOLLOW_SPEED = 0.03;

// 半径が広がる速度。小さいほどじわっと広がる。
const RADIUS_GROW_SPEED = 0.005;

// 半径が消える速度。
const RADIUS_SHRINK_SPEED = 0.08;

// 境目の暗さ。強すぎたら0.28くらいに下げる。
const EDGE_OPACITY = 0.10;

let targetX = 0;
let targetY = 0;
let targetViewerX = 0;
let targetViewerY = 0;
let targetRadius = 0;

let currentX = 0;
let currentY = 0;
let currentViewerX = 0;
let currentViewerY = 0;
let currentRadius = 0;

let pointerStarted = false;

let pointerDown = false;
let pointerStartX = 0;
let pointerStartY = 0;

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

        image.onload = () => resolve(src);
        image.onerror = () => resolve(null);

        image.src = src;
    });
}

function setColorTarget(clientX, clientY, radius = NORMAL_RADIUS) {
    const imageRect = colorImage.getBoundingClientRect();
    const viewerRect = viewer.getBoundingClientRect();

    const localX = clientX - imageRect.left;
    const localY = clientY - imageRect.top;

    const viewerX = clientX - viewerRect.left;
    const viewerY = clientY - viewerRect.top;

    if (
        localX < 0 ||
        localY < 0 ||
        localX > imageRect.width ||
        localY > imageRect.height
    ) {
        hideColorTarget();
        return;
    }

    targetX = localX;
    targetY = localY;

    targetViewerX = viewerX;
    targetViewerY = viewerY;

    targetRadius = Math.min(radius, MAX_RADIUS);

    if (!pointerStarted) {
        currentX = targetX;
        currentY = targetY;

        currentViewerX = targetViewerX;
        currentViewerY = targetViewerY;

        currentRadius = 0;
        pointerStarted = true;
    }
}

function hideColorTarget() {
    targetRadius = 0;
}

function applyWaterMask() {
    currentX += (targetX - currentX) * FOLLOW_SPEED;
    currentY += (targetY - currentY) * FOLLOW_SPEED;

    currentViewerX += (targetViewerX - currentViewerX) * FOLLOW_SPEED;
    currentViewerY += (targetViewerY - currentViewerY) * FOLLOW_SPEED;

    const radiusSpeed =
        targetRadius > currentRadius
            ? RADIUS_GROW_SPEED
            : RADIUS_SHRINK_SPEED;

    currentRadius += (targetRadius - currentRadius) * radiusSpeed;

    const time = performance.now() / 1000;
    const r = currentRadius;

    const wobbleX1 = Math.cos(time * 1.7) * r * 0.05;
    const wobbleY1 = Math.sin(time * 1.9) * r * 0.04;

    const wobbleX2 = Math.cos(time * 2.3 + 1.2) * r * 0.20;
    const wobbleY2 = Math.sin(time * 2.0 + 0.6) * r * 0.14;

    const wobbleX3 = Math.cos(time * 1.5 + 2.4) * r * 0.18;
    const wobbleY3 = Math.sin(time * 2.7 + 1.8) * r * 0.18;

    const wobbleX4 = Math.cos(time * 2.9 + 3.1) * r * 0.24;
    const wobbleY4 = Math.sin(time * 1.8 + 2.2) * r * 0.12;

    colorImage.style.setProperty("--x1", `${currentX + wobbleX1}px`);
    colorImage.style.setProperty("--y1", `${currentY + wobbleY1}px`);
    colorImage.style.setProperty("--r1", `${r}px`);

    colorImage.style.setProperty("--x2", `${currentX + wobbleX2}px`);
    colorImage.style.setProperty("--y2", `${currentY + wobbleY2}px`);
    colorImage.style.setProperty("--r2", `${r * 0.76}px`);

    colorImage.style.setProperty("--x3", `${currentX - wobbleX3}px`);
    colorImage.style.setProperty("--y3", `${currentY + wobbleY3}px`);
    colorImage.style.setProperty("--r3", `${r * 0.62}px`);

    colorImage.style.setProperty("--x4", `${currentX + wobbleX4}px`);
    colorImage.style.setProperty("--y4", `${currentY - wobbleY4}px`);
    colorImage.style.setProperty("--r4", `${r * 0.46}px`);

    const edgeOpacity = Math.min(r / 90, 1) * EDGE_OPACITY;

    viewer.style.setProperty("--edge-opacity", edgeOpacity);

    viewer.style.setProperty("--ex1", `${currentViewerX + wobbleX1}px`);
    viewer.style.setProperty("--ey1", `${currentViewerY + wobbleY1}px`);
    viewer.style.setProperty("--er1", `${r * 1.05}px`);

    viewer.style.setProperty("--ex2", `${currentViewerX + wobbleX2}px`);
    viewer.style.setProperty("--ey2", `${currentViewerY + wobbleY2}px`);
    viewer.style.setProperty("--er2", `${r * 0.82}px`);

    viewer.style.setProperty("--ex3", `${currentViewerX - wobbleX3}px`);
    viewer.style.setProperty("--ey3", `${currentViewerY + wobbleY3}px`);
    viewer.style.setProperty("--er3", `${r * 0.68}px`);

    requestAnimationFrame(applyWaterMask);
}

async function showPage(index, direction = 1) {
    if (isChanging) return;

    isChanging = true;
    hideColorTarget();

    bwImage.style.opacity = 0;
    colorImage.style.opacity = 0;

    bwImage.style.transform = `translateX(${direction * 14}px) scale(.985)`;
    colorImage.style.transform = `translateX(${direction * 14}px) scale(.985)`;

    await wait(170);

    const bwSrc = await loadImage(pages[index].bw);
    const colorSrc = await loadImage(pages[index].color);

    if (bwSrc) {
        bwImage.src = bwSrc;
    }

    if (colorSrc) {
        colorImage.src = colorSrc;
    } else if (bwSrc) {
        colorImage.src = bwSrc;
    }

    bwImage.style.transform = `translateX(${-direction * 14}px) scale(.985)`;
    colorImage.style.transform = `translateX(${-direction * 14}px) scale(.985)`;

    await wait(30);

    bwImage.style.opacity = 1;
    colorImage.style.opacity = 1;

    bwImage.style.transform = "translateX(0) scale(1)";
    colorImage.style.transform = "translateX(0) scale(1)";

    await wait(280);

    isChanging = false;
}

function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
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

viewer.addEventListener("pointermove", (event) => {
    setColorTarget(event.clientX, event.clientY, NORMAL_RADIUS);
});

viewer.addEventListener("pointerleave", () => {
    hideColorTarget();
});

viewer.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;

    pointerDown = true;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;

    setColorTarget(event.clientX, event.clientY, TAP_RADIUS);
});

viewer.addEventListener("pointerup", (event) => {
    if (!pointerDown) return;

    pointerDown = false;

    const diffX = event.clientX - pointerStartX;
    const diffY = event.clientY - pointerStartY;

    setColorTarget(event.clientX, event.clientY, TAP_RADIUS);

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

document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
        nextPage();
    }

    if (event.key === "ArrowLeft") {
        prevPage();
    }
});

preloadImages();
applyWaterMask();
showPage(currentPage, 1);