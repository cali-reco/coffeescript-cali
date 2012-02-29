List = require("..").List

describe 'List', ->
	it "Behaves like an array", ->
		l = new List()
		l.push {}, {}, {}
		expect(3).toEqual l.length

	it "Behaves like an ordered list", ->
		l = new List()
		l.insertInOrder {v:'first'}, 1
		l.insertInOrder {v:'third'}, 3
		l.insertInOrder {v:'second'}, 2
		expect(3).toEqual l.length
		v = (obj.v for obj in l)
		expect(['first','second','third']).toEqual v

	it "Behaves like an ordered set", ->
		l = new List(false) # do not accept repeated
		l.insertInOrder {v:'first'}, 1
		l.insertInOrder {v:'third'}, 3
		l.insertInOrder {v:'second'}, 2
		l.insertInOrder {v:'third'}, 3
		expect(3).toEqual l.length
		v = (obj.v for obj in l)
		expect(['first','second','third']).toEqual v

	
	it "Works with multiple insertions of the same item", ->
		l = new List()
		a = {v:'a'}; b = {v:'b'}; c = {v:'c'}
		l.insertInOrder a, 1
		l.insertInOrder b, 2
		l.insertInOrder c, 3
		l.insertInOrder a, 4
		l.insertInOrder b, 5
		l.insertInOrder c, 6
		v = (obj.v for obj in l).join ""
		expect("abcabc").toEqual v
