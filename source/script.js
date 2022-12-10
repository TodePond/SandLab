//======//
// CELL //
//======//
const Cell = class {
	constructor(options) {
		const template = struct({
			position: [0.0, 0.0],
			dimensions: [1.0, 1.0],
			colour: BLACK,
		})

		const properties = template(options)
		Object.assign(this, properties)
	}
}

//=======//
// WORLD //
//=======//
class World {
	constructor() {
		this.cells = new Map()
	}

	add(cell) {
		const key = _(cell.position)
		this.cells.set(key, cell)
	}

	delete(cell) {
		this.cells.delete(cell)
	}
}

//======//
// DRAW //
//======//
const drawCell = (context, cell) => {
	const { canvas } = context
	context.fillStyle = "red"
	context.fillRect(cell.x, cell.y, cell.width * canvas.width, cell.height * canvas.height)
}

//------ NO GLOBALS ABOVE THIS LINE ------//

//========//
// GLOBAL //
//========//
const global = {
	world: new World(),
}

//===========//
// GAME LOOP //
//===========//
const stage = new Stage()

stage.resize = (context) => {
	for (const cell of global.cells) {
		drawCell(context, cell)
	}
}

stage.update = (context) => {}
