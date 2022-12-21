const ELEMENTS = new Map()

const AIR_MAX = 1 / 64
ELEMENTS.set(BLACK.splash, {
	name: "Air",
	update: (cell, world) => {
		// If a cell is too big, split it
		const tooWide = cell.dimensions[0] > AIR_MAX
		const tooTall = cell.dimensions[1] > AIR_MAX
		if (tooWide || tooTall) {
			const columns = tooTall ? 2 : 1
			const rows = tooWide ? 2 : 1
			const splitCells = split(cell, [columns, rows])
			return world.replace([cell], splitCells)
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
		if (belowContacts.length === 1 && belowContacts[0].colour === BLACK) {
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
