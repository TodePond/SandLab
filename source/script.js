//========//
// SHARED //
//========//
const shared = {
	clock: 0,
}

//======//
// CELL //
//======//
const Cell = class {
	constructor(options = {}) {
		// Properties
		Object.assign(this, {
			bounds: {
				left: 0.0,
				right: 1.0,
				top: 0.0,
				bottom: 1.0,
			},
			colour: BLACK,
			...options,
		})

		// Internal
		this.birth = shared.clock

		// Caches
		this.splash = this.colour.splash

		const x = this.bounds.left
		const y = this.bounds.top
		this.position = [x, y]

		const width = this.bounds.right - this.bounds.left
		const height = this.bounds.bottom - this.bounds.top
		this.dimensions = [width, height]
	}

	clear(image) {
		const { colour } = this
		this.colour = VOID
		this.draw(image)
		this.colour = colour
	}

	draw(image) {
		const [x, y] = [this.position.x * image.width, this.position.y * image.height]
		const [width, height] = [this.dimensions[0] * image.width, this.dimensions[1] * image.height]

		const left = Math.floor(x)
		const right = Math.floor(x + width)
		const top = Math.floor(y)
		const bottom = Math.floor(y + height)

		const drawnWidth = right - left
		const drawnHeight = bottom - top

		let i = getPixelIndex(image, left, top)

		// Set the image data of every pixel in the cell
		// The border is 1 pixel thick and void coloured
		let BORDER_WIDTH = Math.min(4, Math.min(drawnWidth, drawnHeight) / 10)
		if (BORDER_WIDTH < 1) {
			if (BORDER_WIDTH > 0.4) {
				BORDER_WIDTH = 1
			} else {
				BORDER_WIDTH = 0
			}
		}
		for (let y = top; y <= bottom; y++) {
			for (let x = left; x <= right; x++) {
				const isBorder =
					BORDER_WIDTH > 0 &&
					(x < left + BORDER_WIDTH ||
						x > right - BORDER_WIDTH ||
						y < top + BORDER_WIDTH ||
						y > bottom - BORDER_WIDTH)

				const colour = isBorder ? VOID : this.colour

				image.data[i + 0] = colour[0]
				image.data[i + 1] = colour[1]
				image.data[i + 2] = colour[2]
				i += 4
			}
			i += (image.width - drawnWidth - 1) * 4
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
		// Properties
		this.cells = new Set()

		// Caches
		this.caches = {
			left: new Map(),
			right: new Map(),
			top: new Map(),
			bottom: new Map(),
		}

		// Setup
		this.add(new Cell())
	}

	add(cell) {
		this.cells.add(cell)
		this.cache(cell)
	}

	delete(cell) {
		this.cells.delete(cell)
		this.uncache(cell)
	}

	cache(cell) {
		for (const key in DIRECTION) {
			const cache = this.caches[key]
			const address = cell.bounds[key]
			let set = cache.get(address)
			if (set === undefined) {
				set = new Set()
				cache.set(address, set)
			}
			set.add(cell)
		}
	}

	uncache(cell) {
		for (const key in DIRECTION) {
			const cache = this.caches[key]
			const address = cell.bounds[key]
			const set = cache.get(address)
			set.delete(cell)
			if (set.size === 0) {
				cache.delete(address)
			}
		}
	}

	draw(image) {
		for (const cell of this.cells) {
			cell.draw(image)
		}
	}

	chop(cell, axis, targets) {
		this.delete(cell)
		const choppedCells = chop(cell, axis, targets)
		for (const choppedCell of choppedCells) {
			this.add(choppedCell)
		}
		return choppedCells
	}

	split(cell, [rows, columns]) {
		this.delete(cell)
		const splitCells = split(cell, [rows, columns])
		for (const splitCell of splitCells) {
			this.add(splitCell)
		}
		return splitCells
	}

	merge(cells, colour = cells[0].colour) {
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
			bounds: cell.bounds,
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
	const { left, right, top, bottom } = cell.bounds
	const [width, height] = cell.dimensions

	const splitWidth = width / columns
	const splitHeight = height / rows

	const cells = []
	for (let i = rows - 1; i >= 0; i--) {
		for (let j = columns - 1; j >= 0; j--) {
			const splitCell = new Cell({
				bounds: {
					left: left + j * splitWidth,
					top: top + i * splitHeight,
					right: right - (columns - j - 1) * splitWidth,
					bottom: bottom - (rows - i - 1) * splitHeight,
				},
				colour: cell.colour,
			})

			cells.push(splitCell)
		}
	}

	return cells
}

// Chop a cell into smaller cells along an axis
// The targets are the positions along the axis where the cells should be chopped
const chop = (cell, axis, targets) => {
	if (targets.length === 0) {
		return [cell]
	}

	const direction = AXIS[axis]

	const cells = []
	let currentTarget = cell.bounds[direction.min]
	for (let i = 0; i <= targets.length; i++) {
		const target = targets[i] || cell.bounds[direction.max]

		const bounds = {
			[direction.min]: currentTarget,
			[direction.max]: target,
			[direction.adjacent.min]: cell.bounds[direction.adjacent.min],
			[direction.adjacent.max]: cell.bounds[direction.adjacent.max],
		}

		const choppedCell = new Cell({
			bounds,
			colour: cell.colour,
		})

		cells.push(choppedCell)
		currentTarget = target
	}

	return cells
}

// From an array of cells, return a single cell that encompasses all of them
// This assumes that the cells are all connected via touching
// The cells can be in any order and can have different dimensions
const merge = (cells, colour = cells[0].colour) => {
	if (cells.length === 0) {
		throw new Error("Cannot merge 0 cells")
	}

	let left = Infinity
	let top = Infinity
	let right = -Infinity
	let bottom = -Infinity

	for (const cell of cells) {
		const { bounds } = cell
		left = Math.min(left, bounds.left)
		top = Math.min(top, bounds.top)
		right = Math.max(right, bounds.right)
		bottom = Math.max(bottom, bounds.bottom)
	}

	return new Cell({
		colour,
		bounds: {
			left,
			top,
			right,
			bottom,
		},
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
	const digits = getSplashDigits(splash).map((v, i) => clamp(v + (random() % (i === 0 ? 3 : 3)) - 1, 0, 9))
	return parseInt(digits.join(""))
}

//===========//
// DIRECTION //
//===========//
const DIRECTION = {
	left: {
		name: "left",
		min: "top",
		max: "bottom",
		axis: "x",
	},
	right: {
		name: "right",
		min: "top",
		max: "bottom",
		axis: "x",
	},
	top: {
		name: "top",
		min: "left",
		max: "right",
		axis: "y",
	},
	bottom: {
		name: "bottom",
		min: "left",
		max: "right",
		axis: "y",
	},
}

DIRECTION.left.opposite = DIRECTION.right
DIRECTION.right.opposite = DIRECTION.left
DIRECTION.top.opposite = DIRECTION.bottom
DIRECTION.bottom.opposite = DIRECTION.top

DIRECTION.left.adjacent = DIRECTION.top
DIRECTION.right.adjacent = DIRECTION.bottom
DIRECTION.top.adjacent = DIRECTION.right
DIRECTION.bottom.adjacent = DIRECTION.left

const AXIS = {
	x: DIRECTION.left,
	y: DIRECTION.top,
}

//------ NO GLOBALS ABOVE THIS LINE ------//

//========//
// GLOBAL //
//========//
const global = {
	world: new World(),
	camera: new View(),
	image: undefined,
	brush: {
		colour: YELLOW,
	},
}

//===========//
// GAME LOOP //
//===========//
const stage = new Stage({ speed: 1.0 })

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

	shared.clock = wrap(shared.clock + 1, 0, 999)

	// Update cells
	for (const cell of world.cells) {
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

		if (cell.birth === shared.clock) {
			continue
		}

		const element = ELEMENTS.get(cell.colour.splash)

		if (element === undefined) {
			continue
		}

		if (element.update !== undefined) {
			const newCells = element.update(cell, world)
			for (const newCell of newCells) {
				newCell.draw(image)
			}
		}
	}

	// Place cells with the pointer
	const pointer = getPointer()
	if (pointer.down) {
		const colour = global.brush.colour
		const cell = world.pick(camera.cast(scale(pointer.position, devicePixelRatio)))
		if (cell) {
			world.recolour(cell, colour)
			cell.clear(image)
			cell.draw(image)
		}
	}
}

Object.assign(window, global)
