Scribble = require("../src/scribble").Scribble
Stroke = require("../src/stroke").Stroke

describe "Scribble", ->
	it "Stores its stroke's length", ->
		stroke = new Stroke()
		stroke.push 0,0
		stroke.push 0,1
		stroke.push 0,2

		expect(3).toEqual stroke.length, "wrong length"
		expect(2).toEqual stroke.strokeLength, "wrong strokelength"

	it "Can be instantiated with an array of arrays", ->

		scribble = new Scribble(
			[ [[0,0], [1,1]] ]
		)

		# scribble has 1 stroke
		expect(1).toEqual scribble.length
		# stroke has 2 points1
		expect(2).toEqual scribble[0].length
		
	it "Can be instantiated with an array of points", ->

		scribble = new Scribble(
			[[ {x:0, y:0}, {x:1, y:1}]]
		)

		# scribble has 1 stroke
		expect(1).toEqual scribble.length
		# stroke has 2 points1
		expect(2).toEqual scribble[0].length