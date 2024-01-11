//document.addEventListener("DOMContentLoaded", function() {
	gameState = aggregateObjectProperties(emptyGameState);

	let popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
	let popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
		return new bootstrap.Popover(popoverTriggerEl);
	})
	let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
	let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
		return new bootstrap.Tooltip(tooltipTriggerEl);
	})

	window.requestAnimationFrame(updateFrameClock);
	window.onload = loadGame();
	//setInterval(saveGame(), 10000);
//});
