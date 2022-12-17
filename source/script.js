//======//
// CELL //
//======//
const Cell = class {
	constructor(options = {}) {
		Object.assign(this, {
			position: [0.0, 0.0],
			dimensions: [1.0, 1.0],
			splash: BLACK.number,
			colour: BLACK,
			...options,
		})
	}

	draw(image) {
		const [x, y] = [this.position.x * image.width, this.position.y * image.height].map(Math.floor)
		const [width, height] = [this.dimensions[0] * image.width, this.dimensions[1] * image.height].map(Math.floor)

		const left = x
		const right = x + width
		const top = y
		const bottom = y + height

		let i = getPixelIndex(image, left, top)

		// Set the image data of every pixel in the cell
		// The border is 1 pixel thick and void coloured
		const BORDER_WIDTH = Math.min(5, Math.floor(Math.min(width, height) / 10))
		for (let y = top; y <= bottom; y++) {
			for (let x = left; x <= right; x++) {
				const isBorder =
					x < left + BORDER_WIDTH ||
					x > right - BORDER_WIDTH ||
					y < top + BORDER_WIDTH ||
					y > bottom - BORDER_WIDTH

				const colour = isBorder ? VOID : this.colour

				image.data[i + 0] = colour[0]
				image.data[i + 1] = colour[1]
				image.data[i + 2] = colour[2]

				i += 4
			}
			i += (image.width - width - 1) * 4
		}
	}
}

//=======//
// IMAGE //
//=======//
const getPixelIndex = (image, x, y) => {
	return (x + y * image.width) * 4
}

// Function that sets the alpha channel of every pixel
const setImageAlpha = (image, alpha) => {
	for (let i = 3; i < image.data.length; i += 4) {
		image.data[i] = alpha
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

	draw(image) {
		for (const cell of this.cells) {
			cell.draw(image)
		}
	}

	split(cell, [rows, columns]) {
		this.delete(cell)
		const splitCells = split(cell, [rows, columns])
		for (const splitCell of splitCells) {
			this.add(splitCell)
		}
		return splitCells
	}

	merge(cells, colour) {
		for (const cell of cells) {
			this.delete(cell)
		}

		const mergedCell = merge(cells, colour)
		this.add(mergedCell)
		return mergedCell
	}

	recolour(cell, colour) {
		this.delete(cell)

		const recolouredCell = new Cell({
			position: cell.position,
			dimensions: cell.dimensions,
			splash: colour.splash,
			colour,
		})
		this.add(recolouredCell)
		return recolouredCell
	}

	pick(position) {
		const [x, y] = position
		for (const cell of this.cells) {
			const [left, top] = cell.position
			const [right, bottom] = [left + cell.dimensions[0], top + cell.dimensions[1]]

			if (x >= left && x <= right && y >= top && y <= bottom) {
				return cell
			}
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

//========//
// COLOUR //
//========//
const getSplashDigits = (splash) => {
	const chars = splash.toString().padStart(3, "0").split("")
	const digits = chars.map((v) => parseInt(v))
	return digits
}

const mutateSplash = (splash) => {
	const digits = getSplashDigits(splash).map((v, i) => clamp(v + (random() % (i === 0 ? 4 : 3)) - 1, 0, 9))
	return parseInt(digits.join(""))
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
const stage = new Stage()

stage.start = (context) => {
	const { canvas } = context
	canvas.style["background-color"] = VOID
}

stage.resize = (context) => {
	const { world, camera } = global
	const { canvas } = context

	// Resize camera
	const size = Math.min(canvas.width, canvas.height)
	camera.resize([size, size])

	// Resize image
	const image = context.createImageData(size, size)
	setImageAlpha(image, 255)
	global.image = image

	// Redraw world
	world.draw(image)
	const [x, y] = camera.get([0, 0])
	context.putImageData(image, x, y)
}

stage.tick = (context) => {
	const { canvas } = context
	const { image, camera } = global
	const [x, y] = camera.get([0, 0])
	context.clearRect(0, 0, canvas.width, canvas.height)
	context.putImageData(image, x, y)
}

stage.update = (context) => {
	const { world, image, camera } = global

	// Update cells
	const cells = [...world.cells]
	for (const cell of cells) {
		// RAINBOW SPLITTER!
		/*
		if (cell.dimensions[0] > 0.002 && cell.dimensions[1] > 0.002 && maybe(0.05)) {
			const splitCells = world.split(cell, [2, 2])
			for (const splitCell of splitCells) {
				const splash = mutateSplash(splitCell.colour.splash)
				splitCell.colour = new Splash(splash)
				splitCell.splash = splash
				splitCell.draw(image)
			}
		}
		continue
		*/

		if (cell.colour === BLACK) {
		} else if (cell.colour === YELLOW) {
		} else if (cell.colour === GREY) {
			const splitCells = world.split(cell, [2, 2])
			for (const splitCell of splitCells) {
				splitCell.colour = BLACK
				splitCell.draw(image)
			}
		}
	}

	// Place cells with the pointer
	const pointer = getPointer()
	if (pointer.down) {
		const colour = GREY
		const cell = world.pick(camera.cast(scale(pointer.position, devicePixelRatio)))
		if (cell) {
			const recolouredCell = world.recolour(cell, colour)
			recolouredCell.draw(image)
		}
	}
}

Object.assign(window, global)
