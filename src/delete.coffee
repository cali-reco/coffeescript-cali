unless WEB?
	Gesture = require('./gesture').Gesture
	Shape = require('./shape').Shape
	Command = require('./command').Command
	Evaluate = require('./evaluate').Evaluate

class Delete extends Command
	constructor: ->
		super
		@name = "Delete"
		@point = {x:0, y:0}
		#console.log "Create Delete features"
		@_features = Gesture::Features(
			[Evaluate.Her_Wer, [0.06, 0.08, 1.0, 1.0]],
			[Evaluate.Tl_Pch, [1.5, 1.9]],
			[Evaluate.Hollowness, [0.0, 3.0]],
			[Evaluate.Ns, [1.0, 1.0, 1.0, 1.0]]
		)

		
	setUp: (scribble) ->
		@point = scribble.startingPoint
		@dom = 1
		@scribble = scribble



(exports ? this).Delete = Delete