# You cannot change elements directly !
# We keep an array with the exact same length with the ordering values
class List extends Array
	constructor: (@acceptRepeated = true) ->
		super()
		@ordVals = [] # dictinary with order values

	push: (items...) ->
		super
		@ordVals.push 0 for item in items 

	pop: ->
		super
		@ordVals.pop()

	insertInOrder: (item, ordVal) ->

		pos = 0; max = @length

		# jump to position
		pos++ while pos < max and @ordVals[pos] < ordVal

		# check if this has the same ordVal
		if (pos < max) and (@ordVals[pos] == ordVal) and (not @_acceptRepeated) 
			return @[pos]

		# just add it here
		@splice pos, 0, item
		@ordVals.splice pos, 0, ordVal # store this for future reference
		
		# insertion ok
		return null

exports.List = List
