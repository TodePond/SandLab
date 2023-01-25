const ELEMENTS = new Map()

const pointer = getPointer()

on(
	"keydown",
	(event) => {
		for (const [splash, element] of ELEMENTS) {
			if (element.key.includes(event.key)) {
				shared.brush.colour = new Splash(splash).d
				return
			}
		}
	},
	{ passive: false },
)

const FALL_SPEED = 1 / 128
const MIN_SIZE = 1 / 256

const POINTER_RADIUS = 0.03 //0.03
const POINTER_FADE_RADIUS = 0.1 //0.1
const POINTER_CELL_SIZE = 1 / 8 //1 / 256
let AIR_TARGET = 1 / 1
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

// Debug: Adjust AIR_TARGET based on pointer y position
/*on("pointermove", (event) => {
	const y = event.clientY / window.innerHeight
	const target = lerp([0.00001, 0.5], clamp(y, 0, Infinity))
	AIR_TARGET = target
})*/

const AIR_SPLASH = GREY.splash
ELEMENTS.set(AIR_SPLASH, {
	name: "Air",
	key: ["a", "1"],
	update: (cell, world) => {
		const target = getPointerAirTarget(cell)
		const dimensionErrorScale = cell.dimensions.map((v) => v / target)

		// Function that finds the error of all cells from their target size
		const judge = (cells) => {
			let errors = []

			for (const cell of cells) {
				if (cell.dimensions[0] < MIN_SIZE || cell.dimensions[1] < MIN_SIZE) {
					//errors.push(Infinity)
					//continue
				}

				const target = getPointerAirTarget(cell)
				const dimensionErrorScale = cell.dimensions.map((v) => v / target)
				const dimensionErrorDiff = dimensionErrorScale.map((v) => Math.abs(1 - v))
				const errorDiff = Math.max(dimensionErrorDiff[0], dimensionErrorDiff[1])
				errors.push(errorDiff)
			}

			const sum = errors.reduce((a, b) => a + b, 0)
			const average = sum / errors.length
			const score = -average
			return score
		}

		const compareSplit = (a, b = -Infinity) => {
			return a >= b
		}

		const compare = (a, b = -Infinity) => {
			return a >= b
		}

		// If a cell is too big, try to split it
		const veryTooWide = dimensionErrorScale[0] >= 2.0
		const veryTooTall = dimensionErrorScale[1] >= 2.0
		if (veryTooWide || veryTooTall) {
			const columns = veryTooTall ? 2 : 1
			const rows = veryTooWide ? 2 : 1
			const splitCells = split(cell, [columns, rows])

			// Judge the split cells and use them if they're better
			const splitScores = judge(splitCells)
			const originalScores = judge([cell])
			if (compareSplit(splitScores, originalScores)) {
				return world.replace([cell], splitCells)
			}
		}

		// If a cell is too small, try to sleep it
		const tooThin = dimensionErrorScale[1] < 1.0
		const tooShort = dimensionErrorScale[0] < 1.0
		if (tooThin && tooShort) {
			return tryToSleep(cell, world, { judge, compare })
		}

		if (tooThin) {
			const result = tryToSleep(cell, world, { edges: ["top", "bottom"], judge, compare })
			if (result.length > 0) {
				return result
			}
		}

		if (tooShort) {
			const result = tryToSleep(cell, world, { edges: ["left", "right"], judge, compare })
			if (result.length > 0) {
				return result
			}
		}

		return []
	},
})

ELEMENTS.set(YELLOW.splash, {
	name: "Sand",
	key: ["s", "2"],
	update: (cell, world) => {
		const movements = move(cell, world, "bottom", FALL_SPEED)
		if (movements.length > 0) {
			return world.replace(...movements)
		}

		if (cell.dimensions[1] > MIN_SIZE) {
			const [above, me] = split(cell, [2, 1])

			const splitReplacements = [[cell], [above, me]]

			const slideDirection = randomFrom(["left", "right"])
			const movements = move(above, world, slideDirection, FALL_SPEED)
			if (movements.length > 0) {
				const splittings = world.replace(...splitReplacements)
				const movings = world.replace(...movements)
				return [...splittings, ...movings]
			}
		}

		return tryToSleep(cell, world)
	},
})

ELEMENTS.set(ORANGE.splash, {
	name: "Wood",
	key: ["w", "4"],
})

ELEMENTS.set(RED.splash, {
	name: "Fire",
	key: ["f", "5"],
})

ELEMENTS.set(GREEN.splash, {
	name: "Plant",
	key: ["p", "7"],
	update: (cell, world) => {
		const allContacts = [
			...pickContacts(cell, world, "top"),
			...pickContacts(cell, world, "bottom"),
			...pickContacts(cell, world, "left"),
			...pickContacts(cell, world, "right"),
		]

		const changed = []
		for (const contact of allContacts) {
			if (contact.colour.splash === BLUE.splash) {
				const recoloured = recolour(contact, GREEN)
				changed.push(...world.replace([contact], [recoloured]))
			}
		}
		return changed
	},
})

ELEMENTS.set(BLUE.splash, {
	name: "Water",
	key: ["w", "3"],
	update: (cell, world) => {
		const movements = move(cell, world, "bottom", FALL_SPEED)
		if (movements.length > 0) {
			return world.replace(...movements)
		}

		const slideDirection = randomFrom(["left", "right"])
		const slides = move(cell, world, slideDirection, FALL_SPEED, MIN_SIZE / 2)
		if (slides.length > 0) {
			return world.replace(...slides)
		}

		return tryToSleep(cell, world, { filter: () => true })
	},
})

ELEMENTS.set(SILVER.splash, {
	name: "Stone",
	key: ["t", "6"],
	update: (cell, world) => {
		const movements = move(cell, world, "bottom", FALL_SPEED)
		if (movements.length > 0) {
			return world.replace(...movements)
		}

		return tryToSleep(cell, world)
	},
})

const SOLID = new Set([YELLOW.splash, ORANGE.splash, GREEN.splash, SILVER.splash])
