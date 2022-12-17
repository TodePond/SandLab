//======//
// CELL //
//======//
const Cell = class {
	constructor(options = {}) {
		Object.assign(this, {
			position: [0.0, 0.0],
			dimensions: [1.0, 1.0],
			colour: GREY,
			...options,
		})
	}

	set(image, camera, properties = {}) {
		Object.assign(this, properties)
		this.draw(image, camera)
	}

	draw(image, camera) {
		const [x, y] = camera.get(this.position).map(Math.floor)
		const [width, height] = camera.get(this.dimensions).map(Math.ceil)

		for (let i = x; i < x + width; i++) {
			for (let j = y; j < y + height; j++) {
				setPixel(image, i, j, this.colour)
			}
		}
	}
}

//=======//
// WORLD //
//=======//
class World {
	constructor() {
		this.cells = new Set()
		this.add(new Cell())
	}

	add(cell) {
		this.cells.add(cell)
	}

	delete(cell) {
		this.cells.delete(cell)
	}

	draw(imageData, camera) {
		for (const cell of this.cells) {
			cell.draw(imageData, camera)
		}
	}
}

//===============//
// SPLIT / MERGE //
//===============//
const split = (cell, [rows, columns]) => {
	const [x, y] = cell.position
	const [width, height] = cell.dimensions

	const cells = []
	for (let i = 0; i < rows; i++) {
		for (let j = 0; j < columns; j++) {
			const splitCell = new Cell({
				position: [x + (i * width) / rows, y + (j * height) / columns],
				dimensions: [width / rows, height / columns],
				colour: cell.colour,
			})

			cells.push(splitCell)
		}
	}

	return cells
}

// From an array of cells, return a single cell that encompasses all of them
// This assumes that the cells are all connected via touching
// The cells can be in any order and can have different dimensions
const merge = (cells, colour) => {
	if (cells.length === 0) {
		throw new Error("Cannot merge 0 cells")
	}

	// Get the minimum and maximum x and y values
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity

	for (const cell of cells) {
		const [x, y] = cell.position
		const [width, height] = cell.dimensions

		minX = Math.min(minX, x)
		minY = Math.min(minY, y)
		maxX = Math.max(maxX, x + width)
		maxY = Math.max(maxY, y + height)
	}

	return new Cell({
		position: [minX, minY],
		dimensions: [maxX - minX, maxY - minY],
		colour,
	})
}

//=======//
// IMAGE //
//=======//
const setPixel = (image, x, y, colour) => {
	const index = (x + y * image.width) * 4

	for (let i = 0; i < 3; i++) {
		image.data[index + i] = colour[i]
	}
}

const getPixelIndex = (image, x, y) => {
	return (x + y * image.width) * 4
}

// Function that sets the alpha channel of every pixel
const setImageAlpha = (image, alpha) => {
	for (let i = 3; i < image.data.length; i += 4) {
		image.data[i] = alpha
	}
}

//------ NO GLOBALS ABOVE THIS LINE ------//

//========//
// GLOBAL //
//========//
const global = {
	world: new World(),
	camera: new View(),
	image: undefined,
}

//===========//
// GAME LOOP //
//===========//
const stage = new Stage({ speed: 0.1 })

stage.start = (context) => {
	const { canvas } = context
	canvas.style["background-color"] = VOID
}

stage.resize = (context) => {
	const { world, camera } = global
	const { canvas } = context

	// Resize camera
	camera.resize([canvas.width, canvas.height])

	// Resize image
	const image = context.createImageData(canvas.width, canvas.height)
	setImageAlpha(image, 255)
	global.image = image

	// Redraw world
	world.draw(image, camera)
	context.putImageData(image, 0, 0)
}

stage.tick = (context) => {
	const { image } = global
	context.putImageData(image, 0, 0)
}

stage.update = (context) => {
	const { world, camera, image } = global

	// Update cells
	const cells = [...world.cells]
	for (const cell of cells) {
		if (cell.colour === BLACK) {
		} else if (cell.colour === YELLOW) {
		} else if (cell.colour === GREY) {
			const splitCells = split(cell, [8, 8])
			world.delete(cell)
			for (const splitCell of splitCells) {
				splitCell.set(image, camera, { colour: BLACK })
				world.add(splitCell)
			}
		}
	}
}

Object.assign(window, global)
