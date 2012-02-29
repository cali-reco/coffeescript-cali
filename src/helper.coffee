class Vector
	constructor: (@start, @end) ->  
		@.__defineGetter__ "length", -> Util.distance @start, @end

Util =
	distance: (p1, p2) ->
		Math.sqrt( Math.pow(p2.x-p1.x,2) + Math.pow(p2.y-p1.y,2) )
	triangleArea: (p1, p2, p3) ->
		area = p1.x * p2.y - p2.x * p1.y
		area += p2.x * p3.y - p3.x * p2.y
		area += p3.x * p1.y - p1.x * p3.y
		Math.abs(area/2)
	theta: (p,q) ->
		dx = q.x - p.x
		ax = Math.abs(dx)
		dy = q.y - p.y
		ay = Math.abs(dy)
		
		t = if (ax + ay == 0) then 0 else  dy / (ax + ay)
		
		if (dx < 0)
			t = 2 - t
		else if (dy < 0) 
			t = 4 + t
	
		t*90

	left: (a, b, c) ->
		(a.x * b.y - a.y * b.x + a.y * c.x - a.x * c.y + b.x * c.y - c.x * b.y) > 0

	cross: (a, b) ->
		    dx1 = a.end.x - a.start.x
		    dx2 = b.end.x - b.start.x
		    dy1 = a.end.y - a.start.y
		    dy2 = b.end.y - b.start.y
		    dx1 * dy2 - dy1 * dx2

	dot: (a, b) ->
		    dx1 = a.end.x - a.start.x
		    dx2 = b.end.x - b.start.x
		    dy1 = a.end.y - a.start.y
		    dy2 = b.end.y - b.start.y
		    dx1 * dx2 + dy1 * dy2

	angle: (a, b) ->
		if (a instanceof Vector) and (b instanceof Vector)
			Math.atan2 Util.cross(a, b), Util.dot(a, b)
		else 
			Math.atan2 b.y - a.y, b.x - a.x

	# Returns point on line (p1, p2) which is closer to p3
	closest: (p1, p2, p3) ->
		
		d = p2.x - p1.x
		
		return {x:p1.x, y:p3.y} if (d == 0) 
		
		return p3 if (p1 == p3)
		        
		return p3 if (p2 == p3)
		        
		m = (p2.y - p1.y) / d
		
		return {x:p3.x, y:p1.y} if (m == 0)

		b1 = p2.y - m * p2.x
		b2 = p3.y + 1/m * p3.x
		x = (b2 - b1) / (m + 1/m)
		y = m * x + b1
		
		{x:Math.round(x), y: Math.round(y)}

	quadArea: (p1, p2, p3, p4) ->
		area = p1.x * p2.y - p2.x * p1.y
		area += p2.x * p3.y - p3.x * p2.y
		area += p3.x * p4.y - p4.x * p3.y
		area += p4.x * p1.y - p1.x * p4.y
		
		Math.abs(area/2)

(exports ? this).Vector = Vector
(exports ? this).Helper = Util