//=========//
// HELPERS //
//=========//
const getNeighbours = (cell, world) => {
	return {
		left: getNeighbour(cell, world, "left"),
		right: getNeighbour(cell, world, "right"),
		top: getNeighbour(cell, world, "top"),
		bottom: getNeighbour(cell, world, "bottom"),
	}
}

const getNeighbour = (cell, world, edge) => {
	const direction = DIRECTION[edge]
	const opposite = direction.opposite
	const oppositeEdge = opposite.name

	const front = cell.bounds[edge]
	const min = cell.bounds[direction.min]
	const max = cell.bounds[direction.max]

	const neighbours = pickContacts(cell, world, edge)
	for (const neighbour of neighbours) {
		if (front !== neighbour.bounds[oppositeEdge]) continue
		if (min !== neighbour.bounds[direction.min]) continue
		if (max !== neighbour.bounds[direction.max]) continue
		return neighbour
	}
}

// Pick an array of cells that are adjacent and touching the given cell
const pickContacts = (cell, world, edge = "right") => {
	const { bounds } = cell
	const direction = DIRECTION[edge]
	const opposite = direction.opposite
	const oppositeEdge = opposite.name

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
		if (otherMin >= max || otherMax <= min) {
			continue
		}

		cells.push(other)
	}

	return cells
}

// 'Sleeping' means merging with a nearby cell so that we don't have to
// update or draw this cell every frame
//
// This function makes a cell look for a nearby cell (of the same colour) to merge with
// If it finds one, it merges with it and returns any cells created
// If it doesn't find one, it returns an empty array
//
// There are some different ways a merge could happen:
// 1. The cell is touching a cell that perfectly lines up with it
// 2. The cell is touching a bigger cell that can be split into multiple cells that line up with it
// 3. Probably more
const tryToSleep = (cell, world) => {
	// First, let's pick a random direction to look in
	const edge = randomFrom(Object.keys(DIRECTION))
	const direction = DIRECTION[edge]

	// Get all the cells that are touching this cell (in a randomly ordered array)
	const contacts = pickContacts(cell, world, edge)

	// If there are no contacts, we can't merge with anything
	if (contacts.length === 0) {
		return []
	}

	// Shuffle the contacts so that we don't always merge with the same cell
	const candidates = shuffleArray(contacts)

	const splitCandidates = []

	// Loop through all the candidates
	// If we find a cell that we can merge with, we'll merge with it and return true
	for (const candidate of candidates) {
		// If the candidate is a different colour, we can't merge with it
		if (candidate.colour !== cell.colour) {
			continue
		}

		// If the candidate is the exact same size as us, we can merge with it
		if (
			candidate.bounds[direction.min] === cell.bounds[direction.min] &&
			candidate.bounds[direction.max] === cell.bounds[direction.max]
		) {
			return [world.merge([cell, candidate])]
		}

		// If the candidate is smaller at either end, we can't merge with it
		if (
			candidate.bounds[direction.min] > cell.bounds[direction.min] ||
			candidate.bounds[direction.max] < cell.bounds[direction.max]
		) {
			continue
		}

		// Otherwise, the candidate is bigger than us
		// We can split the candidate into multiple cells that line up with us
		// Then we can merge with one of those cells
		// (we should use the chop function for this because it allows us more control over the split)
		splitCandidates.push(candidate)
	}

	if (maybe(0.9)) return []
	for (const candidate of splitCandidates) {
		// Where should we split the candidate?
		// We might need to chop in two places, or just one
		const targets = []
		let mergeIndex = 0
		if (candidate.bounds[direction.min] < cell.bounds[direction.min]) {
			targets.push(cell.bounds[direction.min])
			mergeIndex = 1
		}
		if (candidate.bounds[direction.max] > cell.bounds[direction.max]) {
			targets.push(cell.bounds[direction.max])
		}

		// Split the candidate into multiple cells
		const splitCells = world.chop(candidate, direction.axis, targets)

		// Merge with one of the split cells
		const mergeCell = world.merge([cell, splitCells[mergeIndex]])

		// Return all the cells we created
		const createdCells = [mergeCell, ...splitCells.filter((c, i) => i !== mergeIndex)]

		return createdCells
	}

	return []
}

//==========//
// ELEMENTS //
//==========//
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
			return world.split(cell, [columns, rows])
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
			if (below.dimensions[0] === cell.dimensions[0]) {
				//TODO: move the cells around
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
		const splitCells = world.split(cell, [2, 2])
		cell.clear(image)
		for (const splitCell of splitCells) {
			splitCell.colour = BLACK
			splitCell.draw(image)
		}
	},
})
