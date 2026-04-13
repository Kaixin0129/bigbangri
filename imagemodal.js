document.body.insertAdjacentHTML("beforeend", `
  <div id="imageModal" class="modal">
    <span class="close">&times;</span>
    <img id="modalImg" class="modal-content">
  </div>
`);

const style = document.createElement("style");
style.innerHTML = `
.modal {
  display: none;
  position: fixed;
  z-index: 9999;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.9);
}

.modal-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  max-width: 80%;
  max-height: 80%;
  border-radius: 10px;
  animation: zoomIn 0.3s ease forwards;
}

@keyframes zoomIn {
  to {
    transform: translate(-50%, -50%) scale(1);
  }
}

.close {
  position: absolute;
  top: 20px;
  right: 40px;
  color: white;
  font-size: 40px;
  cursor: pointer;
}

.city-item:hover {
  color: #33FFFF;
  cursor: pointer;
}
`;
document.head.appendChild(style);

function openImage(src) {
  const modal = document.getElementById("imageModal");
  const img = document.getElementById("modalImg");

  modal.style.display = "block";
  img.src = src;
}

function closeImage() {
  document.getElementById("imageModal").style.display = "none";
}

document.addEventListener("click", function(e) {
  if (e.target.id === "imageModal") closeImage();
  if (e.target.classList.contains("close")) closeImage();
});

window.openImage = openImage;