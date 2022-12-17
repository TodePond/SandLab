//========//
// CAMERA //
//========//
const View = class {
	constructor(options = {}) {
		Object.assign(this, {
			position: [0.0, 0.0],
			dimensions: [1.0, 1.0],
			...options,
		})
	}

	// world position -> view position
	cast(position) {
		const [x, y] = subtract(position, this.position)
		const [width, height] = this.dimensions
		return [x / width, y / height]
	}

	// view position -> world position
	get(position) {
		const [x, y] = position
		const [width, height] = this.dimensions
		return add(this.position, [x * width, y * height])
	}

	// World position at center of view
	getCenter() {
		return this.get([0.5, 0.5])
	}

	// World bounds of the view
	getBounds() {
		const a = this.position
		const b = add(this.position, this.dimensions)

		return {
			left: Math.min(a[0], b[0]),
			right: Math.max(a[0], b[0]),
			top: Math.min(a[1], b[1]),
			bottom: Math.max(a[1], b[1]),
		}
	}

	// Pan the view by a given amount
	pan(displacement) {
		this.position = add(this.position, displacement)
	}

	// Zoom the view by a given amount, centered at a given point
	zoom(scale, center = this.getCenter()) {
		const [x, y] = this.position
		const [width, height] = this.dimensions

		this.position = add(this.position, multiply(subtract(center, this.position), 1 - scale))
		this.dimensions = multiply([width, height], scale)
	}

	// Is a given world position within the view?
	contains(position) {
		const { left, right, top, bottom } = this.getBounds()
		const [x, y] = position

		return x >= left && x <= right && y >= top && y <= bottom
	}

	resize(dimensions) {
		this.dimensions = dimensions
	}
}

// Camera is a view that can be moved and zoomed smoothly by the user
const Camera = class extends View {
	constructor(options = {}) {
		super(options)
		this.registerControls()
	}

	registerControls() {
		// Register keyboard event listeners
		window.addEventListener("keydown", (e) => this.onKeyDown(e), { passive: false })
		window.addEventListener("keyup", (e) => this.onKeyUp(e), { passive: false })

		// Register pointer event listeners
		window.addEventListener("pointerdown", (e) => this.onPointerDown(e), { passive: false })
		window.addEventListener("pointermove", (e) => this.onPointerMove(e), { passive: false })
		window.addEventListener("pointerup", (e) => this.onPointerUp(e), { passive: false })
		window.addEventListener("pointercancel", (e) => this.onPointerUp(e), { passive: false })
		window.addEventListener("pointerleave", (e) => this.onPointerUp(e), { passive: false })

		// Register wheel event listener
		window.addEventListener("wheel", (e) => this.onWheel(e), { passive: false })
	}
}

/*
const view = new View({
	dimensions: [3.0, 2.0],
})

view.cast([0.0, 0.0]).d //[0.0, 0.0]
view.cast([1.0, 1.0]).d //[0.5, 0.5]
view.cast([2.0, 2.0]).d //[1.0, 1.0]

view.getCenter().d
view.getBounds().d
*/
