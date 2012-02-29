class Stroke extends Array
	constructor: ->
		@_len = 0
		@_speed = 0
		@_firstTime = 0

		@.__defineGetter__ "strokeLength", -> @_len
		@.__defineGetter__ "drawingSpeed", -> @speed

	push: (x, y, time=0) ->
		point = {x: x, y: y, time: time}
	
		super(point)

		if @length > 1
			dx = @_lastPoint.x - x
			dy = @_lastPoint.y - y
			@_len  += Math.sqrt( dx*dx + dy*dy)
				
			@_speed = 
				if (time == @_firstTime)
					Number.MAX_VALUE
				else
					 @_len / (time - @_firstTime);
		else
			@_firstTime = time
		
		@_lastPoint = point

(exports ? this).Stroke = Stroke
