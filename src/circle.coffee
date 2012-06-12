unless WEB?
	Gesture = require('./gesture').Gesture
	Shape = require('./shape').Shape
	Evaluate = require('./evaluate').Evaluate

class Circle extends Shape
	constructor: (rotated = true) -> 
		super(rotated)

		@name = "Circle"

		# initialize point array
		@points = [{} for i in [0..4]]
		#console.log "Create Circle features"
		@_features = Gesture::Features(
			[Evaluate.Pch2_Ach, [12.5, 12.5, 13.2, 13.5]],
			[Evaluate.Hollowness, [0.0, 0.0, 0.0, 0.0]]
		)
	
	#Computes the center and the radius of the recognized circle
	setUp: (@scribble) ->
		@points = @scribble.boundingBox

		d1 = Math.sqrt(
			Math.pow(@points[0].x-@points[1].x,2) + 
			Math.pow(@points[0].y-@points[1].y,2))

		d2 = Math.sqrt(
			Math.pow(@points[2].x-@points[1].x,2) + 
			Math.pow(@points[2].y-@points[1].y,2))
		
		@radius = Math.floor((d1+d2)/2/2)
		@center = {
			x: Math.floor(@points[0].x + d2/2),
			y: Math.floor(@points[0].y + d1/2)
		}

(exports ? this).Circle = Circle