//=========//
// HELPERS //
//=========//
const getNeighbour = (cell, world, edge) => {
	const direction = DIRECTIONS[edge]
	const oppositeEdge = direction.opposite

	const front = cell.bounds[edge]
	const min = cell.bounds[direction.min]
	const max = cell.bounds[direction.max]

	const neighbours = pickEdge(cell, world, edge)
	for (const neighbour of neighbours) {
		if (front !== neighbour.bounds[oppositeEdge]) continue
		if (min !== neighbour.bounds[direction.min]) continue
		if (max !== neighbour.bounds[direction.max]) continue
		return neighbour
	}
}

// Pick an array of cells that are adjacent and touching the given cell
const pickEdge = (cell, world, edge = "right") => {
	const { bounds } = cell
	const direction = DIRECTIONS[edge]
	const oppositeEdge = direction.opposite

	const front = bounds[edge]
	const min = bounds[direction.min]
	const max = bounds[direction.max]

	const cache = world.caches[oppositeEdge]
	const set = cache.get(front)
	if (set === undefined) {
		return []
	}

	const cells = []
	for (const other of set) {
		const otherMin = other.bounds[direction.min]
		const otherMax = other.bounds[direction.max]

		// Check if the cells overlap in any way at all
		if (otherMin > max || otherMax < min) {
			continue
		}

		cells.push(other)
	}

	return cells
}

//==========//
// ELEMENTS //
//==========//
const ELEMENTS = new Map()

const AIR_MAX = 0.005
ELEMENTS.set(BLACK.splash, {
	name: "Air",
	update: (cell, world, image) => {
		// If a cell is too big, split it
		const tooTall = cell.dimensions[0] > AIR_MAX
		const tooWide = cell.dimensions[1] > AIR_MAX
		if (tooTall || tooWide) {
			const columns = tooTall ? 2 : 1
			const rows = tooWide ? 2 : 1
			const splitCells = world.split(cell, [columns, rows])
			cell.clear(image)
			for (const splitCell of splitCells) {
				splitCell.draw(image)
			}
		}
	},
})

ELEMENTS.set(YELLOW.splash, {
	name: "Sand",
	update: (cell, world, image) => {
		if (maybe(0.2)) return

		const above = getNeighbour(cell, world, "top")
		if (above && above.colour === YELLOW) {
			const side = maybe(0.5) ? "left" : "right"
			const beside = getNeighbour(cell, world, side)
			if (beside && beside.colour === BLACK) {
				world.recolour(beside, YELLOW)
				world.recolour(above, BLACK)
				beside.draw(image)
				above.draw(image)
				return
			}
		}

		const below = getNeighbour(cell, world, "bottom")
		if (below && below.colour === BLACK) {
			world.recolour(below, YELLOW)
			world.recolour(cell, BLACK)
			below.draw(image)
			cell.draw(image)
			return
		}
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
		const splitCells = world.split(cell, [2, 2])
		cell.clear(image)
		for (const splitCell of splitCells) {
			splitCell.colour = BLACK
			splitCell.draw(image)
		}
	},
})
