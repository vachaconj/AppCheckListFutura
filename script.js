
document.getElementById("checklistForm").addEventListener("submit", function (e) {
  e.preventDefault();
  document.getElementById("mensaje").textContent = "Checklist enviado correctamente. ¡Gracias!";
  this.reset();
});
