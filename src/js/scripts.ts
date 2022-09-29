
import paper from "paper"
import {UserPath, sUserPath, clientToServerPath, serverToClientPath} from "./UserPath";

//*********
//* Setup *
//*********

// Set up paper canvas
const paperView = new paper.PaperScope();
const canvas = <HTMLCanvasElement>document.getElementById('main-canvas');
const canvasHolder = <HTMLDivElement>canvas.parentElement;

// Set initial canvas size before adding paperView
paperView.setup(canvas);

// Track all paths currently in the scene
const paths: UserPath[] = []
let currentPath: UserPath | null

// Get button inputs
const clearBtn = <HTMLButtonElement>document.getElementById("clear");
const colorInput = <HTMLInputElement>document.getElementById("color-picker");
const widthInput = <HTMLInputElement>document.getElementById("width");
const signOutBtn = <HTMLButtonElement>document.getElementById("sign-out");


//**************
//* Networking *
//**************

/**
 * Submit a POST request with a new path to add to the database
 * @param userPath The path to post to the server
 */
function submitPath(userPath: UserPath) {
	const s_UserPath: sUserPath = clientToServerPath(userPath);
	const body = JSON.stringify(s_UserPath)

	fetch('/draw', {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: body
	}).catch(reason => console.log(reason));
}

function refreshPaths() {
	fetch('/canvas', { method: 'GET' })
		.then(response => response.json())
		.then(json => {
			// Clear canvas and replace with updated paths
			const updatedPaths: sUserPath[] = json;
			paperView.project.clear()
			for (const userPath of updatedPaths) {
				paths.push(serverToClientPath(userPath));
			}
		});
}

// Get paths at the beginning
refreshPaths();

// Refresh paths every 5 seconds
let refreshPaused = false;
setInterval(() => { if (!refreshPaused) refreshPaths() }, 5000);


//*********************
//* Utility Functions *
//*********************

// Boilerplate for a new path with stroke color and width
function initPath(): paper.Path {
	const newPath = new paper.Path();
	newPath.strokeColor = new paper.Color(colorInput.value);
	newPath.strokeWidth = parseInt(widthInput.value);
	newPath.strokeCap = "round"

	// newPath.fullySelected = true

	return newPath;
}

// Convert canvas local position to position in canvas
function getMousePos(x: number, y: number): paper.Point {
	const rect = canvas.getBoundingClientRect();
	const canvasRes = new paper.Point(canvas.width, canvas.height);
	return new paper.Point(x - rect.left - 15, y - rect.top - 15);
}

//***********************
//* Handle Mouse Events *
//***********************

// Check for mouse dragging
let leftMouseDown = false;
let middleMouseDown = false;
let rightMouseDown = false;
canvas.addEventListener("mousedown", ev => {
	switch (ev.button) {
		case 0: // Left mouse button
			leftMouseDown = true;

			// Init path
			currentPath = { path: initPath(), user: "cjacobson32", id: paths.length };
			paths.push(currentPath);
			currentPath.path.add(getMousePos(ev.x, ev.y));

			// Stop refreshing canvas
			refreshPaused = true;
			break;
		case 1: // Left mouse button
			middleMouseDown = true;
			break;
		case 2: // Left mouse button
			rightMouseDown = true;
			break;
	}
});
window.addEventListener("mouseup", ev => {
	switch (ev.button) {
		case 0: // Left mouse button
			leftMouseDown = false;

			if (currentPath !== null) {
				// Simplify line with fewer points
				currentPath.path.simplify();

				// If the path is empty, remove it immediately (this happens if the user just clicks)
				if (currentPath.path.segments.length <= 1) {
					paths.pop();
					currentPath.path.remove();
				}

				submitPath(currentPath);

				currentPath = null;

				// Resume refreshing canvas
				refreshPaths();
				refreshPaused = false;
			}
			break;
		case 1: // Middle mouse button
			middleMouseDown = false;
			break;
		case 2: // Right mouse button
			rightMouseDown = false;
			break;
	}
});

// Draw line when mouse is dragged
canvas.addEventListener("mousemove", ev => {
	if (leftMouseDown) {
		currentPath!.path.add(getMousePos(ev.x, ev.y));
	}
});

//***********************
//* Handle Other Events *
//***********************

// Refresh canvas when window focus changes
window.addEventListener('focus', ev => refreshPaths())

// .addEventListener('input')
