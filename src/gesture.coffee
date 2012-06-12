unless WEB?
	FuzzySet = require('./fuzzy').FuzzySet

class Gesture
	constructor: ->
		@scribble = null
		@dom = 0
		@_prevGesture = null

		@name = null
		@type = null
	
	evalGlobalFeatures: (scribble) -> 0
	evalLocalFeatures: (scribble, shapes) -> 1

	resetDom: -> @dom = 0
	
	pushAttribs: -> @_prevGesture = clone()

	popAttribs: ->

 # nodes = [fn, [awa, a, b = Number.MAX_VALUE, bwb = Number.MAX_VALUE]]*
Gesture::Features = (nodes...) ->
	_list = []

	for node in nodes
	 
		[fn,fuzzyVals] = node
		[awa, a, b, bwb] = fuzzyVals
		b ||= Number.MAX_VALUE
		bwb ||= Number.MAX_VALUE
		fuzzySet = new FuzzySet(a, b, a-awa, bwb-b)
		# Evaluator function
		do(fn,fuzzySet)->
			_list.push( (scribble) -> 
				#console.log "fuzzySet #{fuzzySet.a}, #{fuzzySet.b},#{fuzzySet.wa},#{fuzzySet.wb}}"
				#console.log "Evaluated #{fn} to #{fn(scribble)}"
				fuzzySet.degOfMember fn(scribble))  
		

	(scribble) ->
		return 0 unless _list?
		dom = 1
		for fn in _list
			tmp = fn( scribble )
			dom = tmp if( tmp < dom)    
			break if dom == 0
	
		dom

(exports ? this).Gesture = Gesture