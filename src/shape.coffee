unless WEB?
	Gesture = require('./gesture').Gesture
	Evaluate = require('./evaluate').Evaluate

class Shape extends Gesture
	constructor : (rotated = true) -> 
		super()
		@type = "Shape"
		@dashed = false
		@bold = false
		@open = false

		@_normalFeature = Gesture::Features [Evaluate.Tl_Pch, [0.83, 0.93]]
		@_dashFeature = Gesture::Features(
			[Evaluate.Tl_Pch, [0.2, 0.3, 0.83, 0.93]],
			[Evaluate.Pch_Ns_Tl, [5, 10]]
		)
		@_openFeature = Gesture::Features [Evaluate.Tl_Pch, [0.2, 0.3, 0.83, 0.93]]
		@_boldFeature = Gesture::Features [Evaluate.Tl_Pch, [1.5, 3]]


	setUp: (scribble) -> throw("abstract")

	###
	| Description: Computes the degree of membership for the scribble, taking
	|              into account the fuzzysets for the current shape.
	|              This evaluation is made based on geometric global features.
	| Input: A scribble
	| Output: degree of membership
	| Notes: This method is the same for all shapes.
	###
	evalGlobalFeatures: (scribble) ->
		@dom = @_features(scribble)
		
		@dashed = false
		@bold = false
		@open = false
		@scribble = null
		   
		if (@dom)
			@setUp(scribble)
			#if  @_normalFeature(scribble)				
			#	if @_boldFeature(scribble)
			#		@bold = true
			#else 
			#	@dom *= @_dashFeature(scribble)
			#	if (@dom)
			#		@dashed = true 

		return @dom
	  
class Unknown extends Shape
	constructor: -> @name = "Unknown"
	evaluate: (scribble) -> 0

exports.Shape = Shape
exports.Unknown = Unknown