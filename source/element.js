const ELEMENTS = new Map()

const pointer = getPointer()
const POINTER_RADIUS = 0.03
const POINTER_FADE_RADIUS = 0.1
const POINTER_CELL_SIZE = 1 / 360
let AIR_TARGET = 1
const getPointerAirTarget = (cell) => {
	if (pointer.position.x === undefined) {
		return AIR_TARGET
	}

	const pointerPosition = camera.cast(scale(pointer.position, devicePixelRatio))
	const distanceFromPointer = distanceToBounds(pointerPosition, cell.bounds)

	if (distanceFromPointer < POINTER_RADIUS) {
		return POINTER_CELL_SIZE
	} else if (distanceFromPointer < POINTER_FADE_RADIUS) {
		return lerp([POINTER_CELL_SIZE, 1], distanceFromPointer - POINTER_RADIUS)
	}

	return AIR_TARGET
}

ELEMENTS.set(GREY.splash, {
	name: "Air",
	update: (cell, world) => {
		const target = getPointerAirTarget(cell)
		const dimensionErrorScale = cell.dimensions.map((v) => v / target)

		// Function that finds the error of all cells from their target size
		const judge = [
			(cells) => {
				let errors = []
				const validAreas = []
				for (const cell of cells) {
					const target = getPointerAirTarget(cell)
					const dimensionErrorScale = cell.dimensions.map((v) => v / target)
					const dimensionErrorDiff = dimensionErrorScale.map((v) => Math.abs(v - 1))
					const errorDiff = dimensionErrorDiff[0] * dimensionErrorDiff[1]
					if (dimensionErrorScale < 1) {
						validAreas.push(cell.area)
					}
					errors.push(errorDiff)
				}

				const maxArea = validAreas.length > 0 ? Math.max(...validAreas) : 1

				const sum = errors.reduce((a, b) => a + b, 0)
				const average = sum / errors.length
				const score = -average / maxArea
				return score
			},
		]

		// If a cell is too big, try to split it
		const veryTooWide = dimensionErrorScale[0] >= 2.0
		const veryTooTall = dimensionErrorScale[1] >= 2.0
		if (veryTooWide || veryTooTall) {
			const columns = veryTooTall ? 2 : 1
			const rows = veryTooWide ? 2 : 1
			const splitCells = split(cell, [columns, rows])

			// Judge the split cells and use them if they're better
			const splitScores = judge.map((j) => j(splitCells))
			const originalScores = judge.map((j) => j([cell]))
			if (splitScores.every((s, i) => s > originalScores[i])) {
				return world.replace([cell], splitCells)
			}
		}

		/*
		judge[1] = (cells) => {
			const areas = cells.map((cell) => cell.dimensions[0] * cell.dimensions[1])
			return Math.max(...areas)
		}
		*/

		// If a cell is too small, try to sleep it
		const tooThin = dimensionErrorScale[1] < 1.0
		const tooShort = dimensionErrorScale[0] < 1.0
		if (tooThin && tooShort) {
			return tryToSleep(cell, world, { judge })
		}

		if (tooThin) {
			const result = tryToSleep(cell, world, { edges: ["top", "bottom"], judge })
			if (result.length > 0) {
				return result
			}
		}

		if (tooShort) {
			const result = tryToSleep(cell, world, { edges: ["left", "right"], judge })
			if (result.length > 0) {
				return result
			}
		}

		return []
	},
})

ELEMENTS.set(YELLOW.splash, {
	name: "Sand",
	update: (cell, world) => {
		const belowContacts = pickContacts(cell, world, "bottom")

		if (belowContacts.length === 0) {
			return tryToSleep(cell, world)
		}

		// If there's ONLY an air cell below us, we can fall into it
		// (but only if it has the same width as us)
		if (belowContacts.length === 1 && belowContacts[0].colour === GREY) {
			const below = belowContacts[0]
			const newContactPoint = cell.bounds.top + below.dimensions[1]
			if (below.dimensions[0] === cell.dimensions[0]) {
				const newSandCell = reposition(cell, {
					top: newContactPoint,
					bottom: below.bounds.bottom,
				})

				const newAirCell = reposition(below, {
					top: cell.bounds.top,
					bottom: newContactPoint,
				})

				return world.replace([cell, below], [newSandCell, newAirCell])
			}

			if (below.dimensions[0] > cell.dimensions[0]) {
				// TODO: split the air cell so we can fall into it
			}
		}

		// If there are multiple air cells below us, we can move down into them
		// (but only if they have the same width as us)
		if (belowContacts.length > 1 && belowContacts.every((c) => c.colour === GREY)) {
			// Make sure that all the air cells are the same height
			const airHeights = belowContacts.map((c) => c.dimensions[1])
			if (airHeights.every((h) => h === airHeights[0])) {
				// Get the left and right bounds of the air cells
				const belowLeft = Math.min(...belowContacts.map((c) => c.bounds.left))
				const belowRight = Math.max(...belowContacts.map((c) => c.bounds.right))

				// Make sure that the air cells are the same width as us
				if (belowLeft === cell.bounds.left && belowRight === cell.bounds.right) {
					const newSandCell = reposition(cell, {
						top: belowContacts[0].bounds.top,
						bottom: belowContacts[0].bounds.bottom,
					})

					const newAirCells = belowContacts.map((c) =>
						reposition(c, {
							top: cell.bounds.top,
							bottom: cell.bounds.bottom,
						}),
					)

					return world.replace([cell, ...belowContacts], [newSandCell, ...newAirCells])
				}
			}
		}

		return tryToSleep(cell, world)
	},
})

ELEMENTS.set(ORANGE.splash, {
	name: "Wood",
})

ELEMENTS.set(RED.splash, {
	name: "Fire",
})

ELEMENTS.set(GREEN.splash, {
	name: "Plant",
})

ELEMENTS.set(BLUE.splash, {
	name: "Water",
})

ELEMENTS.set(SILVER.splash, {
	name: "Stone",
})

ELEMENTS.set(900, {
	name: "World",
	update: (cell, world, image) => {
		const splitCells = split(cell, [2, 2])
		world.replace(cell, splitCells)
		cell.clear(image)
		return splitCells
	},
})
