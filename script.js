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

const bwImage = document.getElementById("page-bw");
const colorImage = document.getElementById("page-color");

function preloadImages() {

    pages.forEach(page => {

        const bw = new Image();
        bw.src = page.bw;

        const color = new Image();
        color.src = page.color;

    });

}

function showPage(index) {

    bwImage.style.opacity = 0;

    setTimeout(() => {

        bwImage.src = pages[index].bw;
        colorImage.src = pages[index].color;

        bwImage.style.opacity = 1;

    }, 150);

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

// ----------クリック----------

document.addEventListener("click", nextPage);

// ----------キーボード----------

document.addEventListener("keydown", (event) => {

    if (event.key === "ArrowRight") {

        nextPage();

    }

    if (event.key === "ArrowLeft") {

        prevPage();

    }

});

// ----------スワイプ----------

let touchStartX = 0;

document.addEventListener("touchstart", (event) => {

    touchStartX = event.touches[0].clientX;

});

document.addEventListener("touchend", (event) => {

    const touchEndX = event.changedTouches[0].clientX;

    const diff = touchEndX - touchStartX;

    if (diff < -50) {

        nextPage();

    }

    if (diff > 50) {

        prevPage();

    }

});

preloadImages();
showPage(currentPage);
