const ELEMENTS = new Map()

const pointer = getPointer()
ELEMENTS.set(GREY.splash, {
	name: "Air",
	update: (cell, world) => {
		let target = 1

		// Get pointer position in world coordinates
		if (pointer.position.x !== undefined) {
			const pointerPosition = camera.cast(scale(pointer.position, devicePixelRatio))
			const distanceFromPointer = distanceToBounds(pointerPosition, cell.bounds)
			if (distanceFromPointer < 0.05) {
				target = 1 / 128
			}
		}

		const targetError = cell.dimensions.map((v) => v - target)

		const judge = (cells) => {
			const areas = cells.map((c) => c.dimensions[0] * c.dimensions[1])
			// Get the range of the areas
			const min = Math.min(...areas)
			const max = Math.max(...areas)
			return max - min
		}

		// If a cell is too small, sleep it
		const tooThin = targetError[1] < 0
		const tooShort = targetError[0] < 0
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

		// If a cell is too big, split it
		const tooWide = targetError[0] > 0
		const tooTall = targetError[1] > 0
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

			if (below.dimensions[0] > cell.dimensions[0]) {
				// TODO: split the air cell so we can fall into it
			}
		}

		// If there are multiple air cells below us, we can move down into them
		// (but only if they have the same width as us)
		if (belowContacts.length > 1 && belowContacts.every((c) => c.colour === BLACK)) {
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
