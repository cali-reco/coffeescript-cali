unless WEB?
	Helper = require('./helper').Helper

class Polygon extends Array
	constructor: (pts...) ->
		super()
		@push(pts...)

		@_area = 0
		@_perimeter = 0
		
		@.__defineGetter__ "area", ->
			if @_area == 0
				 
				if @length < 3
					return @_area = 0
				
				
				for i in [0..@length-2]
					@_area += @[i].x * @[i+1].y - @[i+1].x * @[i].y
					
				
				
				@_area /= 2

			Math.abs(@_area)
		
		
		@.__defineGetter__ "perimeter", ->
			if @_perimeter == 0
				for i in [0...@length-1]
					@_perimeter += Helper.distance(@[i], @[i+1])

				if @length < 3 
					@_perimeter *= 2

			@_perimeter

(exports ? this).Polygon = Polygon