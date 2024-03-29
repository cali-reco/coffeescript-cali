unless WEB?
	Gesture = require('./gesture').Gesture
	Shape = require('./shape').Shape
	Evaluate = require('./evaluate').Evaluate

class Rectangle extends Shape
	constructor: (rotated = true) -> 
		super(rotated)

		@name = "Rectangle"
	
		if (rotated)
			#console.log "Create Rectangle features"
			@_features = Gesture::Features(
				[Evaluate.Ach_Aer, [0.75, 0.85, 1.0, 1.0]], # separate from diamonds
				[Evaluate.Alq_Aer, [0.72, 0.78, 1.0, 1.0]],
				[Evaluate.Hollowness, [0.0, 0.0, 1.0, 1.0]])
		else
			@_features = Gesture::Features(
				[Evaluate.Ach_Abb, [0.8, 0.83, 1.0, 1.0]],
				[Evaluate.Pch_Pbb, [0.87, 0.9, 1.0, 1.0]],
				[Evaluate.Alt_Abb, [0.45, 0.47, 0.5, 0.52]]
				#CIEvaluate::scLen_Pch, 0, 0, 1.5, 1.7
			 )

	setUp: (@scribble) ->
		@points = @scribble.enclosingRect

(exports ? this).Rectangle = Rectangle