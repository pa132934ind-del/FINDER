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

// 色が見える最大サイズ
const maxRadius = 120;

// 通常時は小さめの覗き穴
const normalRadius = 95;

// タップ・クリック時だけ少し広がる
const tapRadius = 145;

function preloadImages() {
    pages.forEach(page => {
        const bw = new Image();
        bw.src = page.bw;

        const color = new Image();
        color.src = page.color;
    });
}

function setColorWindow(x, y, radius = normalRadius) {
    const rect = viewer.getBoundingClientRect();

    const localX = x - rect.left;
    const localY = y - rect.top;

    colorImage.style.setProperty("--x", `${localX}px`);
    colorImage.style.setProperty("--y", `${localY}px`);
    colorImage.style.setProperty("--r", `${Math.min(radius, maxRadius)}px`);
}

function hideColorWindow() {
    colorImage.style.setProperty("--r", "0px");
}

function showPage(index) {
    if (isChanging) return;
    isChanging = true;

    bwImage.style.opacity = 0;
    colorImage.style.opacity = 0;
    bwImage.style.transform = "scale(.985)";
    colorImage.style.transform = "scale(.985)";

    setTimeout(() => {
        bwImage.src = pages[index].bw;
        colorImage.src = pages[index].color;

        hideColorWindow();

        bwImage.onload = () => {
            bwImage.style.opacity = 1;
            colorImage.style.opacity = 1;
            bwImage.style.transform = "scale(1)";
            colorImage.style.transform = "scale(1)";
            isChanging = false;
        };
    }, 160);
}

function nextPage() {
    currentPage++;

    if (currentPage >= pages.length) {
        currentPage = 0;
    }

    showPage(currentPage);
}

function prevPage() {
    currentPage--;

    if (currentPage < 0) {
        currentPage = pages.length - 1;
    }

    showPage(currentPage);
}

// PC：カーソル位置だけ色
viewer.addEventListener("pointermove", (event) => {
    setColorWindow(event.clientX, event.clientY, normalRadius);
});

// PC：外れたら色を消す
viewer.addEventListener("pointerleave", () => {
    hideColorWindow();
});

// クリック時：少しだけ広がってページ送り
viewer.addEventListener("click", (event) => {
    setColorWindow(event.clientX, event.clientY, tapRadius);

    setTimeout(() => {
        nextPage();
    }, 120);
});

// キーボード
document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
        nextPage();
    }

    if (event.key === "ArrowLeft") {
        prevPage();
    }
});

// スマホ：タッチした場所だけ色
let touchStartX = 0;
let touchStartY = 0;

viewer.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];

    touchStartX = touch.clientX;
    touchStartY = touch.clientY;

    setColorWindow(touch.clientX, touch.clientY, tapRadius);
});

viewer.addEventListener("touchmove", (event) => {
    const touch = event.touches[0];

    setColorWindow(touch.clientX, touch.clientY, normalRadius);
});

viewer.addEventListener("touchend", (event) => {
    const touch = event.changedTouches[0];

    const diffX = touch.clientX - touchStartX;
    const diffY = touch.clientY - touchStartY;

    hideColorWindow();

    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < 0) {
            nextPage();
        } else {
            prevPage();
        }
    }
});

preloadImages();
showPage(currentPage);