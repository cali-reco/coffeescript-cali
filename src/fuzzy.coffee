class FuzzySet
	constructor: (@a, @b, @wa, @wb) ->
		if not @check()
			throw("Attempting to create invalid fuzzy set")
			
	check: -> (@a <= @b) && (@wa >= 0) && (@wb >= 0)	

	degOfMember: (value) ->
		if ((value < (@a - @wa)) || (value > (@b + @wb)) )
			return 0
		if (value >= @a && value <= @b)
			return 1
		if (value > @b && (value <= @b + @wb))
			return 1.0 - (value - @b) / @wb
		if (value < @a && (value >= @a - @wa))
			return 1.0 + (value - @a) / @wa
		
		return 0.0

	distance: (value) ->


exports.FuzzySet = FuzzySet