unless WEB?
	List = require("./list").List
	Scribble = require("./scribble").Scribble
	{Shape, Unknown} = require("./shape")
	{Command, Tap} = require("./command")
	Line = require("./line").Line
	Rectangle = require("./rectangle").Rectangle
	Circle = require("./circle").Circle
	Delete = require("./delete").Delete

class Recognizer
	constructor : (@rotated = true, @alfaCut = 0) ->
		@_shapesList = []
		@_unknownShape = new Unknown()
		@_tap = new Tap()

	addShape: (shape) ->
		@_shapesList.push shape

	addAllShapes: (rotated) ->

		@_shapesList = []
		@_shapesList.push( 
			new Delete(),
			#new CIWavyLine(),
			new Line(rotated),
			#new CITriangle(rotated),
			new Rectangle(rotated),
			new Circle(rotated)
			#new CIEllipse(rotated)
		)


	# Scribble can also be a list of strokes
	recognize: (scribble) ->

		unless scribble instanceof Scribble
			scribble = new Scribble(scribble)

		shapes = new List()

		shape.resetDom() for shape in @_shapesList

		# TODO - the minimun scribble length was originally 10
		if scribble.scribbleLength < 2
			@_tap.setUp scribble
			shapes.insertInOrder @_tap, 1 - 0
		else
			for shape in @_shapesList
				name = shape.name
				val = shape.evalGlobalFeatures(scribble)
				if val > @alfaCut
					val2 = shape.evalLocalFeatures(scribble, @_shapesList)
					val = val2  if val2 < val
					if val > @alfaCut
						shapes.insertInOrder shape, 1 - val

		if shapes.length is 0
			@_unknownShape.setUp scribble
			shapes.insertInOrder @_unknownShape, 1 - 0
			
		shapes

(exports ? this).Recognizer = Recognizer