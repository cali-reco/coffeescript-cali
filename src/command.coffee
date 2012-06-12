unless WEB?
	Gesture = require('./gesture').Gesture
class Command extends Gesture
	constructor: ->
		super
		@type = "Command"

	evalGlobalFeatures: (@scribble)-> 
		@dom = @_features(scribble)
		@scribble = null if (@dom <= 0)
		if (@dom)
			@setUp(scribble)
		return @dom

class Tap extends Command

	constructor: ->
		super()
		@name = "Tap"
		@point = {x:0, y:0}
		
	setUp: (scribble) ->
		@point = scribble.startingPoint
		@dom = 1
		@scribble = scribble

(exports ? this).Command = Command
(exports ? this).Tap = Tap