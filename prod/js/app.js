//
// Custom JS for the abacus.
// Team 1 UVUBacus Project
// Spring 2020
//

const ABACUS_HEIGHT = Math.max.apply(Math,[$(window).height()/3,400])
const COLUMN_WIDTH = 100
const BEAD_FILL_COLOR = '#ff0000'
const BEAD_STROKE_COLOR = '#aa0000'
const LINE_COLOR = '#000000'
const LINE_WIDTH = 6
const BEAD_HEIGHT = 32
const BEAD_WIDTH = 80
const MAX_VELOCITY = 7

function initApp() {
	$('#abacus-content').append('<canvas id="abacus-canvas"></canvas>')
	$('canvas#abacus-canvas').attr('width',$('#abacus-content').width())
	$('canvas#abacus-canvas').attr('height',ABACUS_HEIGHT)
	abacus = new Abacus('abacus-canvas')
	controller = new AbacusStateController()
	initEventHandlers()
	// Enable touch support
	createjs.Touch.enable(abacus);
	// Start animating the canvas
	createjs.Ticker.on("tick", abacus);

}

function initEventHandlers() {
	console.log('Initializing event handlers...')
	// Nav-tab button handlers
	$('#nav-tab a').on('click', function (e) {
		e.preventDefault()
	})
	$('canvas#abacus-canvas').on('click',function(e) {
		$('#abacus-output>p').text(abacus.getValue().toLocaleString(undefined))
	})
	$('canvas#abacus-canvas').on('touchmove',function(e) {
		$('#abacus-output>p').text(abacus.getValue().toLocaleString(undefined))
	})
	$(window).on('resize',function(e) {
		$('canvas#abacus-canvas').attr('width',$('#abacus-content').width())
		while ((abacus.columns.length * COLUMN_WIDTH) < ($('canvas#abacus-canvas').attr('width') - COLUMN_WIDTH)) {
			abacus.addColumn()
		}
		while ((abacus.columns.length * COLUMN_WIDTH) > ($('canvas#abacus-canvas').attr('width'))) {
			abacus.removeColumn()
		}
		$('#abacus-output>p').text(abacus.getValue().toLocaleString(undefined))

	})
	$('#abacus-output>p').on('input',function(e) {
		let newContent = cleanAbacusNumericInput(e.target.textContent)
		e.target.textContent = newContent.replace('NaN','0')
		abacus.setValue(newContent)
	})
	$('#abacus-output>p').on('blur',function(e) {
		e.target.textContent = Number(e.target.textContent.replace(',','')).toLocaleString(undefined)
	})
}

function cleanAbacusNumericInput(input) {
	return input.replace(/([^0-9\r\n]+)/g,'').substring(0,abacus.columns.length)
}

// Define an abacus controller to send/receive events to/from the abacus
class AbacusStateController {
	constructor() {
		console.log('Initializing controller...')
	}
}

// Define a subclass of the EasleJS canvas controller that has functions of an abacus for convenience and readability
class Abacus extends createjs.Stage {
	constructor(params,columns) {
		super(params)
		self = this
		console.log('Initializing abacus...')
		this.columnCount = columns
		this.width = $('#abacus-content').width();
		this.columns = []
		while ((this.columns.length * COLUMN_WIDTH) < (this.width - COLUMN_WIDTH)) {
			this.addColumn()
		}
	}

	addColumn() {
		// Move the columns to the right and change their multiplier
		for (var column in this.columns) {
			this.columns[column].moveToX(this.columns[column].start + COLUMN_WIDTH)
			this.columns[column].multiplier = Math.pow(10,(this.columns.length - column -1))
		}
		// Make a new column
		var new_column = new Column(this,0)
		new_column.multiplier = Math.pow(10,this.columns.length)
		this.columns.unshift(new_column)
		this.update()

	}
	removeColumn() {
		// Remove leftmost column
		this.columns[0].destroy()
		this.columns.shift()
		// Move the columns to the right and change their multiplier
		for (var column in this.columns) {
			this.columns[column].moveToX(this.columns[column].start - COLUMN_WIDTH)
			this.columns[column].multiplier = Math.pow(10,(this.columns.length - column -1))
		}
	}
	getValue() {
		var returnValue = 0
		for (var column in self.columns) {
			returnValue += self.columns[column].getValue()
		}
		return returnValue
	}
	setValue(value) {
		var origValue = value
		// Clear the abacus
		this.reset()
		for (var column in self.columns) {
			// Determine if the column in the iteration contains the 'place' of the digit we need to represent
			if ((value / self.columns[column].multiplier) >= 1 && (value / self.columns[column].multiplier) < 10) {
				self.columns[column].setValue(Math.trunc(value/self.columns[column].multiplier))
				value %= self.columns[column].multiplier
			}
		}
		if (origValue == value) {
			return -1
		} else {
			return origValue
		}
	}
	reset() {
		for (var column in self.columns) {
			self.columns[column].setValue(0)
		}
	}
}

// Define a Column model used to help draw the abacus.
// Columns are static objects on the canvas that aren't relative to anything.
// Therefore the setColumnIndex will move the column appropriately based on
// the abacus' COLUMN_WIDTH.
// Also, since we aren't allowed to modify the Easel JS DisplayObjects directly on
// the canvas, we use DisplayObject.name to get a unique ID for every oject on the stage.
class Column {
	constructor(abacus, index) {
		// Index is the column index from the left.
		this.abacus = abacus
		this.multiplier = 1
		this.beadsUpper = []
		this.beadsLower = []
		this.lines = []
		this.start = (COLUMN_WIDTH * index)
		this.center =  this.start + (COLUMN_WIDTH / 2)
		// Create new lines
		var centerLine = new createjs.Shape();
		centerLine.name = this.getCanvasMappingValue();
		centerLine.column = this
		centerLine.graphics.beginStroke(LINE_COLOR).beginFill(LINE_COLOR).drawRect(this.center-(LINE_WIDTH/2), 0, LINE_WIDTH, ABACUS_HEIGHT);
		this.abacus.addChild(centerLine)
		this.lines.push(centerLine.name)
		var dividerLine = new createjs.Shape();
		dividerLine.name = this.getCanvasMappingValue();
		dividerLine.column = this
		dividerLine.graphics.beginStroke(LINE_COLOR).beginFill(LINE_COLOR).drawRect(this.start, (ABACUS_HEIGHT / 3) - (LINE_WIDTH-2), COLUMN_WIDTH, LINE_WIDTH);
		this.abacus.addChild(dividerLine)
		this.lines.push(dividerLine.name)
		// Create new beads
		// TODO: We assume 80x32 sized beads here, it'd be nice if they were size-agnostic
		// Create two upper beads and add their names (identifiers) to our list of 'beads'
		// Beads are allocated top-down
		for (var bead_index in [0,1]) {
			var upper_bead = this.newBeadAtXandY(this.center,(BEAD_HEIGHT/2) + (bead_index * BEAD_HEIGHT))
			this.beadsUpper.push(upper_bead)
		}
		// Create five lower beads and add their names (identifiers) to our list of 'beads'
		// Beads are allocated top-down
		for (var bead_index in [0,1,2,3,4]) {
			var lower_bead =  this.newBeadAtXandY(this.center,(ABACUS_HEIGHT/3)+BEAD_HEIGHT*2.5 + (bead_index * BEAD_HEIGHT))
			this.beadsLower.push(lower_bead)
		}
	}
	getValue() {
		let returnValue = 0;
		// Iterate through upper beads and add the moved values
		for (let id in this.beadsUpper) {
			let origY = this.abacus.getChildByName(this.beadsUpper[id]).origY
			let currY = this.abacus.getChildByName(this.beadsUpper[id]).y
			if (Math.abs(origY - currY) >= BEAD_HEIGHT) {
				returnValue += (5 * this.multiplier)
			}
		}
		// Iterate through lower beads and add the moved values
		for (let id in this.beadsLower) {
			let origY = this.abacus.getChildByName(this.beadsLower[id]).origY
			let currY = this.abacus.getChildByName(this.beadsLower[id]).y
			if (Math.abs(origY - currY) >= BEAD_HEIGHT) {
				returnValue += this.multiplier
			}
		}
		return returnValue;
	}
	setValue(value) {
		// Takes a value between 0 and 10 and sets the column to represent that value.
		value = value % 10
		// Reset the current bead positions
		for (var bead in this.beadsUpper) {
			this.abacus.getChildByName(this.beadsUpper[bead]).y = this.abacus.getChildByName(this.beadsUpper[bead]).origY
		}
		for (var bead in this.beadsLower) {
			this.abacus.getChildByName(this.beadsLower[bead]).y = this.abacus.getChildByName(this.beadsLower[bead]).origY
		}
		var lower_value = value % 5
		if (value != lower_value) {
			this.abacus.getChildByName(this.beadsUpper[1]).y += (BEAD_HEIGHT * 1.5)
		}
		value = 0 // shameful variable reuse
		for (; lower_value > 0; lower_value--) {
			this.abacus.getChildByName(this.beadsLower[value]).y -= (BEAD_HEIGHT * 1.5)
			value++
		}
	}
	moveToX(target_x) {
		// Moves a column to a new start X value on the canvas
		this.start = target_x
		this.center =  this.start + (COLUMN_WIDTH / 2)
		// Move Lines
		for (var id in this.lines) {
			this.abacus.getChildByName(this.lines[id]).x = this.start
		}
		// Move beads
		for (var id in this.beadsUpper) {
			this.abacus.getChildByName(this.beadsUpper[id]).x = this.center
		}
		for (var id in this.beadsLower) {
			this.abacus.getChildByName(this.beadsLower[id]).x = this.center
		}
	}
	newBeadAtXandY(x,y) {
		var bead = new createjs.Bitmap('img/bead.png').set({x:x, y:y, regX:BEAD_WIDTH/2, regY:BEAD_HEIGHT/2});
		bead.name = this.getCanvasMappingValue();
		bead.origY = y; // The original unmodified x position of the bead, used to determine if it counts mathematically.
		bead.column = this
		bead.on('pressmove', this.handleBeadMovement);
		this.abacus.addChild(bead)
		return bead.name
	}
	getCanvasMappingValue() {
		// Returns a UID that can be used to map canvas elements to our class structures.
		var code = ''
		for (var i=0; i< 16; i++) {
			var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
			code += chars[Math.round((Math.random() * 100) % (chars.length -1))]
		}
		return code
	}
	handleBeadMovement(event) {
		// Handle dragging of beads
		let currY = event.stageY
		let target = event.target
		let name = target.name
		var self = this.column
		var dY = (currY - target.y)
		// Limit the speed at which elements can be moved
		if (dY > MAX_VELOCITY) {
			dY = MAX_VELOCITY
		}
		if (dY < -MAX_VELOCITY) {
			dY = -MAX_VELOCITY
		}
		// Handle upper bead movement
		if (self.beadsUpper.includes(name)) {
			var maxY = (ABACUS_HEIGHT / 3) - (LINE_WIDTH-2) - (BEAD_HEIGHT/2)
			var minY = (BEAD_HEIGHT/2)
			if (currY > minY && currY < maxY) {
				var index = self.beadsUpper.indexOf(name)
				self.moveBeadToY(name, dY, self.beadsUpper,minY,maxY)
			}
		}
		// Handle lower bead movement
		if (self.beadsLower.includes(name)) {
			var maxY = ABACUS_HEIGHT - (BEAD_HEIGHT/2)
			var minY = (ABACUS_HEIGHT / 3) + (BEAD_HEIGHT/2) + LINE_WIDTH
			// Allow the bead to move within its constraints
			if (currY > minY && currY < maxY) {
				var index = self.beadsLower.indexOf(name)
				self.moveBeadToY(name, dY, self.beadsLower,minY,maxY)
			}
		}
	}
	moveBeadToY(id, dY, beads,lowerLimit,upperLimit) {
		// Returns the distance moved from Y without a collision
		// THIS IS A RECURSIVE FUNCTION THAT MOVES OTHER BEADS.
		var index = beads.indexOf(id)
		var bead = this.abacus.getChildByName(beads[index])
		// Get next neighbor based on Y positivity
		var neighbor = null
		// Upper Neighbor
		if (dY < 0 && index > 0) {
			neighbor = this.abacus.getChildByName(beads[index-1])
		}
		// Lower Neighbor
		if (dY > 0 && index < 4) {
			neighbor = this.abacus.getChildByName(beads[index+1])
		}
		// Check if we are adjacent to the neighbor
		if (neighbor !== null) {
			if (Math.abs(neighbor.y - bead.y) <= BEAD_HEIGHT) {
				var distance = 0
				// We have a neighbor and are adjacent, he determinies our movement.
				distance = this.moveBeadToY(neighbor.name,dY,beads,lowerLimit,upperLimit)
				if (distance != 0) {
					if (bead.y + distance < upperLimit && bead.y + distance > lowerLimit) {
						bead.y += distance
					}
				}
				// Return to neighbor how much we moved
				return distance
			}
			// else we are not adjacent
		}
		// Check if we are within bounds
		if (bead.y + dY < upperLimit && bead.y + dY > lowerLimit) {
			// I can move, and I will!
			bead.y += dY
			return dY
		} else {
			// Cannot move due to bounds
			return 0
		}
	}
	destroy() {
		// Loop through structures and remove them from the stage
		for (var line in this.lines) {
			this.abacus.removeChild(this.abacus.getChildByName(this.lines[line]))
		}
		for (var bead in this.beadsUpper) {
			this.abacus.removeChild(this.abacus.getChildByName(this.beadsUpper[bead]))
		}
		for (var bead in this.beadsLower) {
			this.abacus.removeChild(this.abacus.getChildByName(this.beadsLower[bead]))
		}
	}
}

$(document).ready(initApp)
