unless WEB?
	Helper = require("./helper").Helper

Evaluate =
	Tl_Pch: (sc) -> sc._len / sc.convexHull.perimeter
	Pch2_Ach: (sc) -> Math.pow(sc.convexHull.perimeter,2) / sc.convexHull.area
	Pch_Ns_Tl: (sc) -> sc.convexHull.perimeter/(sc.scribbleLength/sc.length)
	Hollowness: (sc) -> sc.ptsInSmallTri
	Ns: (sc) -> sc.length
	Hm_Wbb: (sc) -> 
		pbb = sc.boundingBox
		Math.abs((pbb[0].x - pbb[1].x) / sc.hMovement());
	Vm_Hbb: (sc) -> 
		pbb = sc.boundingBox
		Math.abs((pbb[2].y - pbb[1].y) / sc.vMovement());
	Hbb_Wbb: (sc) -> 
		pbb = sc.boundingBox().getPoints()
		
		dw = pbb[1].x - pbb[0].x;
		dh = pbb[2].y - pbb[1].y;
	
		if (dw == 0 || dh == 0)
			return 0;
	
		tmp= Math.abs(dh / dw);
		if (tmp > 1)
			tmp = 1 / tmp;
		return tmp
		
	Her_Wer: (sc) -> 
		pbb = sc.enclosingRect

		dw = Helper.distance(pbb[2], pbb[1])
		dh = Helper.distance(pbb[1], pbb[0])
	
		if (dw == 0 || dh == 0)
			return 0;
	
		tmp = dh / dw;
		if (tmp > 1)
			tmp = 1 / tmp;
		return tmp;
		
	# Area ratios
	Alt_Ach: (sc) -> sc.largestTriangle.area / sc.convexHull.area
	Ach_Aer: (sc) -> sc.convexHull.area / sc.enclosingRect.area
	Alt_Aer: (sc) -> sc.largestTriangle.area / sc.enclosingRect.area
	Ach_Abb: (sc) -> sc.convexHull.area / sc.boundingBox.area
	Alt_Abb: (sc) -> sc.largestTriangle.area / sc.boundingBox.area
	Alq_Ach: (sc) -> sc.largestQuad.area / sc.convexHull.area
	Alq_Aer: (sc) -> sc.largestQuad.area / sc.enclosingRect.area
	Alt_Alq: (sc) -> sc.largestTriangle.area / sc.largestQuad.area
		
	# Perimeter ratios
	Plt_Pch: (sc) -> sc.largestTriangle.perimeter / sc.convexHull.perimeter
	Pch_Per: (sc) -> sc.convexHull.perimeter / sc.enclosingRect.perimeter
	Plt_Per: (sc) -> sc.largestTriangle.perimeter / sc.enclosingRect.perimeter
	Pch_Pbb: (sc) -> sc.convexHull.perimeter / sc.boundingBox.perimeter
	Plt_Pbb: (sc) -> sc.largestTriangle.perimeter / sc.boundingBox.perimeter
	Plq_Pch: (sc) -> sc.largestQuad.perimeter / sc.convexHull.perimeter
	Plq_Per: (sc) -> sc.largestQuad.perimeter / sc.enclosingRect.perimeter
	Plt_Plq: (sc) -> sc.largestTriangle.perimeter / sc.largestQuad.perimeter

(exports ? this).Evaluate = Evaluate