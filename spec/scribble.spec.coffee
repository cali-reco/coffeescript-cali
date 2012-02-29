Stroke = require("../src/stroke").Stroke

describe "Scribble", ->
	it "Stores its length", ->
		stroke = new Stroke()
		stroke.push 0,0
		stroke.push 0,1
		stroke.push 0,2

		expect(3).toEqual stroke.length, "wrong length"
		expect(2).toEqual stroke.strokeLength, "wrong strokelength"