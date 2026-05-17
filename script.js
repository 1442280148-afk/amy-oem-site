function toggleMenu(){

  document.getElementById("nav").classList.toggle("active");

}

/* SCROLL REVEAL */

window.addEventListener("scroll", reveal);

function reveal(){

  let reveals = document.querySelectorAll(".reveal");

  for(let i = 0; i < reveals.length; i++){

    let windowHeight = window.innerHeight;

    let revealTop = reveals[i].getBoundingClientRect().top;

    let revealPoint = 100;

    if(revealTop < windowHeight - revealPoint){

      reveals[i].classList.add("active");

    }

  }

}

reveal();
const slider = document.querySelector(".category-grid");

let scrollAmount = 0;

function autoSlide() {

  scrollAmount += 1;

  if (scrollAmount >= slider.scrollWidth - slider.clientWidth) {
    scrollAmount = 0;
  }

  slider.scrollTo({
    left: scrollAmount,
    behavior: "smooth"
  });

}

setInterval(autoSlide, 30);
