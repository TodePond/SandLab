// This file contains functions that help you to work with cells
// They don't add any extra functionality
// They just make your code more readable

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

const reposition = (cell, bounds) => {
	return new Cell({
		colour: cell.colour,
		bounds: {
			...cell.bounds,
			...bounds,
		},
	})
}

const recolour = (cell, colour) => {
	return new Cell({
		colour,
		bounds: cell.bounds,
	})
}

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
const tryToSleep = (
	cell,
	world,
	{
		edges = Object.keys(DIRECTION),
		judge = (cells) => {
			const areas = cells.map((cell) => cell.dimensions[0] * cell.dimensions[1])
			return Math.max(...areas)
		},
	} = {},
) => {
	let winner = undefined
	let highScore = -Infinity

	for (const edge of shuffleArray(edges)) {
		const replacement = sleep(cell, world, edge, { judge })
		const { oldCells, newCells } = replacement
		if (newCells.length === 0) continue
		const newScore = judge(newCells)
		const oldScore = judge(oldCells)
		if (newScore > oldScore && newScore > highScore) {
			highScore = newScore
			winner = replacement
		}
	}

	if (winner === undefined) {
		return []
	}

	const { oldCells, newCells } = winner
	return world.replace(oldCells, newCells)
}

const sleep = (cell, world, edge, { judge }) => {
	const failure = { oldCells: [], newCells: [] }

	const direction = DIRECTION[edge]

	// Get all the cells that are touching this cell (in a randomly ordered array)
	const contacts = pickContacts(cell, world, edge)

	// If there are no contacts, we can't merge with anything
	if (contacts.length === 0) {
		return failure
	}

	// Shuffle the contacts so that we don't always merge with the same cell
	const candidates = shuffleArray(contacts)

	const splitCandidates = []

	// Loop through all the candidates
	// If we find a cell that we can merge with, we'll merge with it and return true
	for (const candidate of candidates) {
		// If the candidate is a different colour, we can't merge with it
		if (candidate.colour.splash !== cell.colour.splash) {
			continue
		}

		// TODO: This should chop off more cleverly, rather than just sleep with anything
		// If the candidate is the exact same size as us, we can merge with it
		if (
			candidate.bounds[direction.min] === cell.bounds[direction.min] &&
			candidate.bounds[direction.max] === cell.bounds[direction.max]
		) {
			const newCells = [merge([cell, candidate])]
			const oldCells = [cell, candidate]
			return { oldCells, newCells }
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
		const splitCells = chop(candidate, direction.axis, targets)

		// Merge with one of the split cells
		const mergedCell = merge([cell, splitCells[mergeIndex]])

		// Return all the cells we created
		const oldCells = [cell, candidate]
		const newCells = [mergedCell, ...splitCells.filter((c, i) => i !== mergeIndex)]
		return { oldCells, newCells }
	}

	return failure
}

// Get the distance from a point to any point on the bounds of a rectangle or inside the rectangle
const distanceToBounds = (point, bounds) => {
	const { x, y } = point
	const { left, right, top, bottom } = bounds

	const dx = Math.max(left - x, 0, x - right)
	const dy = Math.max(top - y, 0, y - bottom)

	return Math.sqrt(dx * dx + dy * dy)
}
