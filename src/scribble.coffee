unless WEB?
	List = require("./list").List
	Stroke = require("./stroke").Stroke
	Polygon = require("./polygon").Polygon
	{Vector, Helper} = require("./helper")

class Scribble extends Array
	
	constructor: (strokes=[]) ->
			super()
			@_len = 0 # Scribble length
			@_totalSpeed = 0;
		
			@_boundingBox = null;
			@_convexHull = null;
			@_largestTriangleOld = null;
			@_largestTriangle = null;
			@_largestQuadOld = null;
			@_largestQuad = null;
			@_enclosingRect = null;

			# Create the strokes

			for stroke in strokes
				unless stroke instanceof Stroke
					s = new Stroke()
					for point in stroke
						s.push(point...)
					stroke = s
				@push stroke

			@.__defineGetter__ "scribbleLength", -> @_len

			# Drawing average speed of the scribble
			@.__defineGetter__ "avgSpeed", -> @_totalSpeed/@.length
	
			@.__defineGetter__ "convexHull", -> @_convexHull || @getConvexHull()

			@.__defineGetter__ "enclosingRect", -> @_enclosingRect || @getEnclosingRect()

			@.__defineGetter__ "smallTriangle", -> @getSmallTriangle()

			@.__defineGetter__ "ptsInSmallTri", -> @getPtsInSmallTri()
			
			@.__defineGetter__ "largestTriangle", -> @_largestTriangle || @getLargestTriangle()

			@.__defineGetter__ "boundingBox", -> @_boundingBox || @getBoundingBox()

			@.__defineGetter__ "startingPoint", -> @[0][0]
		
	clone: ->
		scribble = new Scribble()

		for stroke in @
			newStroke = new Stroke()
			for point in stroke
				newStroke.push point.x, point.y, point.time
			
			scribble.push newStroke
		
		return scribble;
	
	
	###
	| Description: Adds a new stroke to the end of the list of strokes manipulated
	|              by the scribble. It also computes the new length of the scribble
	|              and the new drawing speed.
	| Input: A stroke
	###
	push: (strokes...) ->
		super
		for stroke in strokes
			@_len += stroke.strokeLength
			@_totalSpeed += stroke.drawingSpeed

	###
	| Description: Pops out the last stroke of the scribble
	| Output: The last stroke
	###
	pop: ->
		stroke = super
	
		@_len -= strk.strokeLength
		@_totalSpeed -= strk.drawingSpeed
	
		@_boundingBox = null
		@_convexHull = null
		@_largestTriangle = null
		@_largestTriangleOld = null
		@_largestQuadOld = null
		@_largestQuad = null
		@_enclosingRect = null
	
	# Computes the correct timeout, based on the drawing speed.
	# Output: Timeout, in milliseconds
	# Notes: Actually it returns a constant value, because the formula used to 
	#        the "best" timeout is not very good. We are searching for a better one :-)
	getTimeOut : ->
		avs = @avgSpeed;
		if (avs >= 900)
			return TIMEOUT_BASE + 0;
		else if (avs <= 100)
			return TIMEOUT_BASE + 400;
		else # y=-0.5*x+450
			return (TIMEOUT_BASE + (-0.5*avs + 450))

	getBoundingBox: ->
		
		x1=x2=@convexHull[0].x;
		y1=y2=@convexHull[0].y;
  

		for point in @convexHull
			x1 = point.x if point.x < x1       
			x2 = point.x if point.x > x2
			y1 = point.y if point.y < y1
			y2 = point.y if point.y > y2 
		
		# Tranfer the points to a polygon
		@_boundingBox = new Polygon(
			{x:x1, y:y1},
			{x:x2, y:y1},
			{x:x2, y:y2},
			{x:x1, y:y2},
			{x:x1, y:y1})

	###
	| Description: Computes the convex hull of the scribble, using the Graham's
	|              algorithm. After the computation of the convex hull, we perform
	|              a simple filtration to eliminate points that are very close.
	| Output: A polygon that is the convex hull.
	###
	getConvexHull:  ->
		strokes = @
		# Order all scribble points by angle.
		ordPoints = (min) ->
			ordedPoints = new List(false)
			ordedPoints.insertInOrder(min, 0)
	
			for stroke in strokes
				for point in stroke
					ang = Helper.theta min, point
					if (ptr = ordedPoints.insertInOrder(point, ang) )
						# there is another point with the same angle
						# so we compute the distance and save the big one.
						if (Helper.distance(min, point) > Helper.distance(min,ptr))
							ptr.x = point.x
							ptr.y = point.y


			ordedPoints

		# Filter based on distance
		filter = (polygon) ->
			convexHull = new Polygon()

			for point,i in polygon

				if i == 0
					prev = point
					continue

				if Helper.distance(point, prev) > 5
					convexHull.push point
					prev = point
				else if i == polygon.length-1
					convexHull.push point

			convexHull

		@_convexHull = new Polygon()
		
		ordedPoints = ordPoints(@findLowest())
		np = ordedPoints.length

		@_convexHull.push(
			ordedPoints[np-1],
			ordedPoints[0])

		# try to push all but the first point
		for pt,i in ordedPoints when i >= 1
			if (Helper.left(
					@_convexHull[@_convexHull.length-2], 
					@_convexHull[@_convexHull.length-1], 
					pt))
				@_convexHull.push(pt)
				i++
			else 
				tmp = @_convexHull.pop()
			
		
		#@_convexHull = filter(@_convexHull) # reduce the number of points
		@_convexHull
		

	## Selects the point with the lowest y
	findLowest: ->
	
		min = @[0][0] # gets the first point of the first stroke
		
		for stroke in @
			for point in stroke
				if (point.y < min.y) or (point.y == min.y and point.x > min.x)
					min = point

		min

	###
	| Description: Computes the enclosing rectangle (rotated) that includes the 
	|              convex hull
	| Output: A polygon that is a rotated rectangle.
	| Notes:
	###
	getEnclosingRect: ->

		num = @convexHull.length

		if (num < 2)  # is just a point
			@_enclosingRect = new Polygon(
				@convexHull[0],
				@convexHull[0],
				@convexHull[0],
				@convexHull[0],
				@convexHull[0])
		else if (num < 3)   # is a line with just two points
			@_enclosingRect = new Polygon(
				@convexHull[0],
				@convexHull[1],
				@convexHull[1],
				@convexHull[0],
				@convexHull[0])
		else   # ok it's normal :-)
			for i in [0...num-1]
				for a in [0...num]
					v1 = new Vector @convexHull[i], @convexHull[i+1]
					v2 = new Vector @convexHull[i], @convexHull[a]
					ang = Helper.angle(v1,v2)
				  
					dis = v2.length
					xx=dis*Math.cos(ang)
					yy=dis*Math.sin(ang)
				  
					if(!a) 
						minx=maxx=xx;
						miny=maxy=yy;
						minxp=maxxp=minyp=maxyp=0;

					if(xx<minx)
						minxp=a;
						minx=xx;

					if(xx>maxx)
						maxxp=a;
						maxx=xx;

					if(yy<miny)
						minyp=a;
						miny=yy;

					if(yy>maxy)
						maxyp=a;
						maxy=yy; 
				
				p1 = Helper.closest(
					@convexHull[i],
					@convexHull[i+1],
					@convexHull[minxp])
				
				p2 = Helper.closest(
					@convexHull[i],
					@convexHull[i+1]
					@convexHull[maxxp])
	  
				paux = { 
					x:@convexHull[i].x+100,
					y:@convexHull[i].y
				}

				v3 = new Vector(@convexHull[i], paux)
				v4 = new Vector(@convexHull[i], @convexHull[i+1])
				ang = Helper.angle(v3,v4)

				M_PI_2 = Math.PI / 2

				paux1={
					x: Math.floor( p1.x+100*Math.cos(ang+M_PI_2) ),
					y: Math.floor( p1.y+100*Math.sin(ang+M_PI_2) )
				}
				paux2={
					x: Math.floor(p2.x+100*Math.cos(ang+M_PI_2)),
					y: Math.floor(p2.y+100*Math.sin(ang+M_PI_2))
				 }
	  
				p3 = Helper.closest(p2,paux2,@convexHull[maxyp])
				p4 = Helper.closest(p1,paux1,@convexHull[maxyp])
	  
				area = Helper.quadArea(p1,p2,p3,p4)
	  
				if ((!i)||(area < min_area))
					min_area = area;
					p1x=p1.x;p1y=p1.y;p2x=p2.x;p2y=p2.y;p3x=p3.x;p3y=p3.y;p4x=p4.x;p4y=p4.y

			@_enclosingRect = new Polygon(
				{x: p1x, y: p1y},
				{x: p2x, y: p2y},
				{x: p3x, y: p3y},
				{x: p4x, y: p4y},
				{x: p1x, y: p1y})

	# Computes the number of points inside a small triangle, 
	getPtsInSmallTri: ->
		tri = @smallTriangle

		m = [0 for _ in [0..3]]
		x = [0 for _ in [0..3]]

		empty = 0

		for i in [0..tri.length-1] 
			dx = tri[i].x - tri[(i + 1) % 3].x
			if dx == 0
				m[i] = Number.MAX_VALUE
				continue
			dy = tri[i].y - tri[(i + 1) % 3].y
			m[i] = dy / dx

		for stroke in @
			for pt in stroke

				if pt.x >= tri[0].x and pt.x >= tri[1].x and pt.x >= tri[2].x
					continue
				if pt.x <= tri[0].x and pt.x <= tri[1].x and pt.x <= tri[2].x
					continue
				if pt.y >= tri[0].y and pt.y >= tri[1].y and pt.y >= tri[2].y
					continue
				if pt.y <= tri[0].y and pt.y <= tri[1].y and pt.y <= tri[2].y
					continue

				inter = 0

				for v in m when v isnt 0
					if v >= Number.MAX_VALUE
						x[i] = tri[i].x
						if x[i] >= pt.x
							inter++
					else
						x[i] = (pt.y - tri[i].y + m[i] * tri[i].x) / v

						if x[i] >= pt.x and (x[i] < (if (tri[i].x > tri[(i + 1) % 3].x) then tri[i].x else tri[(i + 1) % 3].x))
							inter++
		
				if inter % 2
					empty++
		empty

	# Computes a small triangle that is 60% of the largest triangle.
	getSmallTriangle: ->
		[p1, p2, p3] = @largestTriangle
		
		m1 = {
			x: p3.x + (p1.x - p3.x)/2,
			y: p3.y + (p1.y - p3.y)/2
		}
		m2 = {
			x: p1.x + (p2.x - p1.x)/2,
			y: p1.y + (p2.y - p1.y)/2
		}
		m3 = {
			x: p2.x + (p3.x - p2.x)/2,
			y: p2.y + (p3.y - p2.y)/2 
		}

		t1 = {
			x: Math.floor((m3.x + (p1.x - m3.x)*0.6))
			y: Math.floor((m3.y + (p1.y - m3.y)*0.6))
		}
		t2 = {
			x: Math.floor((m1.x + (p2.x - m1.x)*0.6))
			y: Math.floor((m1.y + (p2.y - m1.y)*0.6))
		}
		t3 = { 	
			x: Math.floor((m2.x + (p3.x - m2.x)*0.6))
			y: Math.floor((m2.y + (p3.y - m2.y)*0.6))
		}
		
		new Polygon(t1, t2, t3, t1)
		
	#Computes the largest triangle that fits inside the convex hull
	# Notes: We used the algorithm described by J.E. Boyce and D.P. Dobkin.
	getLargestTriangle: ->
		pts = @convexHull
		np = @convexHull.length

		compRootedTri = (ripa, ripb, ripc) ->
			
			trigArea = 0
		
			# computes one rooted triangle        
			ia = ripa;
			ib = ripb;
			for ic in [ripc...np-1]
				pa = pts[ia]; pb = pts[ib]; pc = pts[ic]
				if (area=Helper.triangleArea(pa, pb, pc)) > trigArea
					ripc = ic
					trigArea = area
				else
					break
			trigArea

		if (@convexHull.length <= 3)
			@_largestTriangle = new Polygon()
			@_largestTriangle.push(pt) for pt in @convexHull
			for i in [@convexHull.length...4]
				@_largestTriangle.push @convexHull[0]
			return @_largestTriangle
		
		# computes one rooted triangle with root in the first point of the convex hull
		ia = area = triArea = 0
		for ib in [1..@convexHull.length-2]
			if (ib >= 2)
				ic = ib + 1
			else
				ic = 2
			area = compRootedTri(ia, ib, ic)
			if (area > triArea)
				triArea = area;
				ripa = ia;
				ripb = ib;
				ripc = ic;

		# ripa, ripb and ripc are the indexes of the points of the rooted triangle


		# computes other triangles and choose the largest one
		finalArea = triArea;

		#  indexes of the final points
		pf0 = ripa;
		pf1 = ripb;
		pf2 = ripc;

		for ia in [ripa+1..ripb]
			triArea = 0
			if (ia == ripb)
				ib0 = ripb + 1
			else
				ib0 = ripb
			area = 0

			for ib in [ib0..ripc]
				if (ib == ripc)
					ic = ripc + 1
				else
					ic = ripc
				area = compRootedTri(ia, ib, ic)
				if (area > triArea)
					triArea = area
					fipa = ia
					fipb = ib
					fipc = ic

			if(triArea > finalArea)
				finalArea = triArea
				pf0 = fipa
				pf1 = fipb
				pf2 = fipc

		#Tranfer the points to a polygon
		@_largestTriangle = new Polygon(
			@convexHull[pf0],
			@convexHull[pf1],
			@convexHull[pf2],
			@convexHull[pf0])

(exports ? this).Scribble = Scribble
exports.Scribble = Scribble