unless WEB?
	Gesture = require('./gesture').Gesture
	Shape = require('./shape').Shape
	Evaluate = require('./evaluate').Evaluate

class Line extends Shape

	constructor: (rotated = true) -> 
		super(rotated)

		@name = "Line"
		
		@points = [{x:0,y:0} for i in [0..2]]

		@_normalFeature = Gesture::Features [Evaluate.Tl_Pch, [0.4, 0.45]]
		@_dashFeature = Gesture::Features(
			[Evaluate.Tl_Pch, [0, 0, 0.4, 0.45]],
			[Evaluate.Pch_Ns_Tl, [5, 10]]
		)
		@_features = Gesture::Features [ Evaluate.Her_Wer, [0, 0, 0.06, 0.08] ]

	#Computes the points of the recognized line
	setUp: (@scribble) ->
		points = @scribble.enclosingRect
		@points[0] = points[0]
		@points[1] = points[2]

exports.Line = Line