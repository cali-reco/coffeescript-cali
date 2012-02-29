var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var res = mod._cached ? mod._cached : mod();
    return res;
}

require.paths = [];
require.modules = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = x + '/package.json';
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

require.define = function (filename, fn) {
    var dirname = require._core[filename]
        ? ''
        : require.modules.path().dirname(filename)
    ;
    
    var require_ = function (file) {
        return require(file, dirname)
    };
    require_.resolve = function (name) {
        return require.resolve(name, dirname);
    };
    require_.modules = require.modules;
    require_.define = require.define;
    var module_ = { exports : {} };
    
    require.modules[filename] = function () {
        require.modules[filename]._cached = module_.exports;
        fn.call(
            module_.exports,
            require_,
            module_,
            module_.exports,
            dirname,
            filename
        );
        require.modules[filename]._cached = module_.exports;
        return module_.exports;
    };
};

if (typeof process === 'undefined') process = {};

if (!process.nextTick) process.nextTick = (function () {
    var queue = [];
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;
    
    if (canPost) {
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);
    }
    
    return function (fn) {
        if (canPost) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        }
        else setTimeout(fn, 0);
    };
})();

if (!process.title) process.title = 'browser';

if (!process.binding) process.binding = function (name) {
    if (name === 'evals') return require('vm')
    else throw new Error('No such module')
};

if (!process.cwd) process.cwd = function () { return '.' };

require.define("path", function (require, module, exports, __dirname, __filename) {
function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("/list.coffee", function (require, module, exports, __dirname, __filename) {
(function() {
  var List;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; }, __slice = Array.prototype.slice;

  List = (function() {

    __extends(List, Array);

    function List(acceptRepeated) {
      this.acceptRepeated = acceptRepeated != null ? acceptRepeated : true;
      List.__super__.constructor.call(this);
      this.ordVals = [];
    }

    List.prototype.push = function() {
      var item, items, _i, _len, _results;
      items = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      List.__super__.push.apply(this, arguments);
      _results = [];
      for (_i = 0, _len = items.length; _i < _len; _i++) {
        item = items[_i];
        _results.push(this.ordVals.push(0));
      }
      return _results;
    };

    List.prototype.pop = function() {
      List.__super__.pop.apply(this, arguments);
      return this.ordVals.pop();
    };

    List.prototype.insertInOrder = function(item, ordVal) {
      var max, pos;
      pos = 0;
      max = this.length;
      while (pos < max && this.ordVals[pos] < ordVal) {
        pos++;
      }
      if ((pos < max) && (this.ordVals[pos] === ordVal) && (!this._acceptRepeated)) {
        return this[pos];
      }
      this.splice(pos, 0, item);
      this.ordVals.splice(pos, 0, ordVal);
      return null;
    };

    return List;

  })();

  exports.List = List;

}).call(this);

});

require.define("/scribble.coffee", function (require, module, exports, __dirname, __filename) {
(function() {
  var Helper, List, Polygon, Scribble, Stroke, Vector, _ref;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; }, __slice = Array.prototype.slice;

  if (typeof WEB === "undefined" || WEB === null) {
    List = require("./list").List;
    Stroke = require("./stroke").Stroke;
    Polygon = require("./polygon").Polygon;
    _ref = require("./helper"), Vector = _ref.Vector, Helper = _ref.Helper;
  }

  Scribble = (function() {

    __extends(Scribble, Array);

    function Scribble(strokes) {
      var point, s, stroke, _i, _j, _len, _len2;
      if (strokes == null) strokes = [];
      Scribble.__super__.constructor.call(this);
      this._len = 0;
      this._totalSpeed = 0;
      this._boundingBox = null;
      this._convexHull = null;
      this._largestTriangleOld = null;
      this._largestTriangle = null;
      this._largestQuadOld = null;
      this._largestQuad = null;
      this._enclosingRect = null;
      for (_i = 0, _len = strokes.length; _i < _len; _i++) {
        stroke = strokes[_i];
        if (!(stroke instanceof Stroke)) {
          s = new Stroke();
          for (_j = 0, _len2 = stroke.length; _j < _len2; _j++) {
            point = stroke[_j];
            s.push.apply(s, point);
          }
          stroke = s;
        }
        this.push(stroke);
      }
      this.__defineGetter__("scribbleLength", function() {
        return this._len;
      });
      this.__defineGetter__("avgSpeed", function() {
        return this._totalSpeed / this.length;
      });
      this.__defineGetter__("convexHull", function() {
        return this._convexHull || this.getConvexHull();
      });
      this.__defineGetter__("enclosingRect", function() {
        return this._enclosingRect || this.getEnclosingRect();
      });
      this.__defineGetter__("smallTriangle", function() {
        return this.getSmallTriangle();
      });
      this.__defineGetter__("ptsInSmallTri", function() {
        return this.getPtsInSmallTri();
      });
      this.__defineGetter__("largestTriangle", function() {
        return this._largestTriangle || this.getLargestTriangle();
      });
      this.__defineGetter__("boundingBox", function() {
        return this._boundingBox || this.getBoundingBox();
      });
      this.__defineGetter__("startingPoint", function() {
        return this[0][0];
      });
    }

    Scribble.prototype.clone = function() {
      var newStroke, point, scribble, stroke, _i, _j, _len, _len2;
      scribble = new Scribble();
      for (_i = 0, _len = this.length; _i < _len; _i++) {
        stroke = this[_i];
        newStroke = new Stroke();
        for (_j = 0, _len2 = stroke.length; _j < _len2; _j++) {
          point = stroke[_j];
          newStroke.push(point.x, point.y, point.time);
        }
        scribble.push(newStroke);
      }
      return scribble;
    };

    /*
    	| Description: Adds a new stroke to the end of the list of strokes manipulated
    	|              by the scribble. It also computes the new length of the scribble
    	|              and the new drawing speed.
    	| Input: A stroke
    */

    Scribble.prototype.push = function() {
      var stroke, strokes, _i, _len, _results;
      strokes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      Scribble.__super__.push.apply(this, arguments);
      _results = [];
      for (_i = 0, _len = strokes.length; _i < _len; _i++) {
        stroke = strokes[_i];
        this._len += stroke.strokeLength;
        _results.push(this._totalSpeed += stroke.drawingSpeed);
      }
      return _results;
    };

    /*
    	| Description: Pops out the last stroke of the scribble
    	| Output: The last stroke
    */

    Scribble.prototype.pop = function() {
      var stroke;
      stroke = Scribble.__super__.pop.apply(this, arguments);
      this._len -= strk.strokeLength;
      this._totalSpeed -= strk.drawingSpeed;
      this._boundingBox = null;
      this._convexHull = null;
      this._largestTriangle = null;
      this._largestTriangleOld = null;
      this._largestQuadOld = null;
      this._largestQuad = null;
      return this._enclosingRect = null;
    };

    Scribble.prototype.getTimeOut = function() {
      var avs;
      avs = this.avgSpeed;
      if (avs >= 900) {
        return TIMEOUT_BASE + 0;
      } else if (avs <= 100) {
        return TIMEOUT_BASE + 400;
      } else {
        return TIMEOUT_BASE + (-0.5 * avs + 450);
      }
    };

    Scribble.prototype.getBoundingBox = function() {
      var point, x1, x2, y1, y2, _i, _len, _ref2;
      x1 = x2 = this.convexHull[0].x;
      y1 = y2 = this.convexHull[0].y;
      _ref2 = this.convexHull;
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        point = _ref2[_i];
        if (point.x < x1) x1 = point.x;
        if (point.x > x2) x2 = point.x;
        if (point.y < y1) y1 = point.y;
        if (point.y > y2) y2 = point.y;
      }
      return this._boundingBox = new Polygon({
        x: x1,
        y: y1
      }, {
        x: x2,
        y: y1
      }, {
        x: x2,
        y: y2
      }, {
        x: x1,
        y: y2
      }, {
        x: x1,
        y: y1
      });
    };

    /*
    	| Description: Computes the convex hull of the scribble, using the Graham's
    	|              algorithm. After the computation of the convex hull, we perform
    	|              a simple filtration to eliminate points that are very close.
    	| Output: A polygon that is the convex hull.
    */

    Scribble.prototype.getConvexHull = function() {
      var filter, i, np, ordPoints, ordedPoints, pt, strokes, tmp, _len;
      strokes = this;
      ordPoints = function(min) {
        var ang, ordedPoints, point, ptr, stroke, _i, _j, _len, _len2;
        ordedPoints = new List(false);
        ordedPoints.insertInOrder(min, 0);
        for (_i = 0, _len = strokes.length; _i < _len; _i++) {
          stroke = strokes[_i];
          for (_j = 0, _len2 = stroke.length; _j < _len2; _j++) {
            point = stroke[_j];
            ang = Helper.theta(min, point);
            if ((ptr = ordedPoints.insertInOrder(point, ang))) {
              if (Helper.distance(min, point) > Helper.distance(min, ptr)) {
                ptr.x = point.x;
                ptr.y = point.y;
              }
            }
          }
        }
        return ordedPoints;
      };
      filter = function(polygon) {
        var convexHull, i, point, prev, _len;
        convexHull = new Polygon();
        for (i = 0, _len = polygon.length; i < _len; i++) {
          point = polygon[i];
          if (i === 0) {
            prev = point;
            continue;
          }
          if (Helper.distance(point, prev) > 5) {
            convexHull.push(point);
            prev = point;
          } else if (i === polygon.length - 1) {
            convexHull.push(point);
          }
        }
        return convexHull;
      };
      this._convexHull = new Polygon();
      ordedPoints = ordPoints(this.findLowest());
      np = ordedPoints.length;
      this._convexHull.push(ordedPoints[np - 1], ordedPoints[0]);
      for (i = 0, _len = ordedPoints.length; i < _len; i++) {
        pt = ordedPoints[i];
        if (i >= 1) {
          if (Helper.left(this._convexHull[this._convexHull.length - 2], this._convexHull[this._convexHull.length - 1], pt)) {
            this._convexHull.push(pt);
            i++;
          } else {
            tmp = this._convexHull.pop();
          }
        }
      }
      return this._convexHull;
    };

    Scribble.prototype.findLowest = function() {
      var min, point, stroke, _i, _j, _len, _len2;
      min = this[0][0];
      for (_i = 0, _len = this.length; _i < _len; _i++) {
        stroke = this[_i];
        for (_j = 0, _len2 = stroke.length; _j < _len2; _j++) {
          point = stroke[_j];
          if ((point.y < min.y) || (point.y === min.y && point.x > min.x)) {
            min = point;
          }
        }
      }
      return min;
    };

    /*
    	| Description: Computes the enclosing rectangle (rotated) that includes the 
    	|              convex hull
    	| Output: A polygon that is a rotated rectangle.
    	| Notes:
    */

    Scribble.prototype.getEnclosingRect = function() {
      var M_PI_2, a, ang, area, dis, i, maxx, maxxp, maxy, maxyp, min_area, minx, minxp, miny, minyp, num, p1, p1x, p1y, p2, p2x, p2y, p3, p3x, p3y, p4, p4x, p4y, paux, paux1, paux2, v1, v2, v3, v4, xx, yy, _ref2;
      num = this.convexHull.length;
      if (num < 2) {
        return this._enclosingRect = new Polygon(this.convexHull[0], this.convexHull[0], this.convexHull[0], this.convexHull[0], this.convexHull[0]);
      } else if (num < 3) {
        return this._enclosingRect = new Polygon(this.convexHull[0], this.convexHull[1], this.convexHull[1], this.convexHull[0], this.convexHull[0]);
      } else {
        for (i = 0, _ref2 = num - 1; 0 <= _ref2 ? i < _ref2 : i > _ref2; 0 <= _ref2 ? i++ : i--) {
          for (a = 0; 0 <= num ? a < num : a > num; 0 <= num ? a++ : a--) {
            v1 = new Vector(this.convexHull[i], this.convexHull[i + 1]);
            v2 = new Vector(this.convexHull[i], this.convexHull[a]);
            ang = Helper.angle(v1, v2);
            dis = v2.length;
            xx = dis * Math.cos(ang);
            yy = dis * Math.sin(ang);
            if (!a) {
              minx = maxx = xx;
              miny = maxy = yy;
              minxp = maxxp = minyp = maxyp = 0;
            }
            if (xx < minx) {
              minxp = a;
              minx = xx;
            }
            if (xx > maxx) {
              maxxp = a;
              maxx = xx;
            }
            if (yy < miny) {
              minyp = a;
              miny = yy;
            }
            if (yy > maxy) {
              maxyp = a;
              maxy = yy;
            }
          }
          p1 = Helper.closest(this.convexHull[i], this.convexHull[i + 1], this.convexHull[minxp]);
          p2 = Helper.closest(this.convexHull[i], this.convexHull[i + 1], this.convexHull[maxxp]);
          paux = {
            x: this.convexHull[i].x + 100,
            y: this.convexHull[i].y
          };
          v3 = new Vector(this.convexHull[i], paux);
          v4 = new Vector(this.convexHull[i], this.convexHull[i + 1]);
          ang = Helper.angle(v3, v4);
          M_PI_2 = Math.PI / 2;
          paux1 = {
            x: Math.floor(p1.x + 100 * Math.cos(ang + M_PI_2)),
            y: Math.floor(p1.y + 100 * Math.sin(ang + M_PI_2))
          };
          paux2 = {
            x: Math.floor(p2.x + 100 * Math.cos(ang + M_PI_2)),
            y: Math.floor(p2.y + 100 * Math.sin(ang + M_PI_2))
          };
          p3 = Helper.closest(p2, paux2, this.convexHull[maxyp]);
          p4 = Helper.closest(p1, paux1, this.convexHull[maxyp]);
          area = Helper.quadArea(p1, p2, p3, p4);
          if ((!i) || (area < min_area)) {
            min_area = area;
            p1x = p1.x;
            p1y = p1.y;
            p2x = p2.x;
            p2y = p2.y;
            p3x = p3.x;
            p3y = p3.y;
            p4x = p4.x;
            p4y = p4.y;
          }
        }
        return this._enclosingRect = new Polygon({
          x: p1x,
          y: p1y
        }, {
          x: p2x,
          y: p2y
        }, {
          x: p3x,
          y: p3y
        }, {
          x: p4x,
          y: p4y
        }, {
          x: p1x,
          y: p1y
        });
      }
    };

    Scribble.prototype.getPtsInSmallTri = function() {
      var dx, dy, empty, i, inter, m, pt, stroke, tri, v, x, _, _i, _j, _k, _len, _len2, _len3, _ref2;
      tri = this.smallTriangle;
      m = [
        (function() {
          var _results;
          _results = [];
          for (_ = 0; _ <= 3; _++) {
            _results.push(0);
          }
          return _results;
        })()
      ];
      x = [
        (function() {
          var _results;
          _results = [];
          for (_ = 0; _ <= 3; _++) {
            _results.push(0);
          }
          return _results;
        })()
      ];
      empty = 0;
      for (i = 0, _ref2 = tri.length - 1; 0 <= _ref2 ? i <= _ref2 : i >= _ref2; 0 <= _ref2 ? i++ : i--) {
        dx = tri[i].x - tri[(i + 1) % 3].x;
        if (dx === 0) {
          m[i] = Number.MAX_VALUE;
          continue;
        }
        dy = tri[i].y - tri[(i + 1) % 3].y;
        m[i] = dy / dx;
      }
      for (_i = 0, _len = this.length; _i < _len; _i++) {
        stroke = this[_i];
        for (_j = 0, _len2 = stroke.length; _j < _len2; _j++) {
          pt = stroke[_j];
          if (pt.x >= tri[0].x && pt.x >= tri[1].x && pt.x >= tri[2].x) continue;
          if (pt.x <= tri[0].x && pt.x <= tri[1].x && pt.x <= tri[2].x) continue;
          if (pt.y >= tri[0].y && pt.y >= tri[1].y && pt.y >= tri[2].y) continue;
          if (pt.y <= tri[0].y && pt.y <= tri[1].y && pt.y <= tri[2].y) continue;
          inter = 0;
          for (_k = 0, _len3 = m.length; _k < _len3; _k++) {
            v = m[_k];
            if (v !== 0) {
              if (v >= Number.MAX_VALUE) {
                x[i] = tri[i].x;
                if (x[i] >= pt.x) inter++;
              } else {
                x[i] = (pt.y - tri[i].y + m[i] * tri[i].x) / v;
                if (x[i] >= pt.x && (x[i] < (tri[i].x > tri[(i + 1) % 3].x ? tri[i].x : tri[(i + 1) % 3].x))) {
                  inter++;
                }
              }
            }
          }
          if (inter % 2) empty++;
        }
      }
      return empty;
    };

    Scribble.prototype.getSmallTriangle = function() {
      var m1, m2, m3, p1, p2, p3, t1, t2, t3, _ref2;
      _ref2 = this.largestTriangle, p1 = _ref2[0], p2 = _ref2[1], p3 = _ref2[2];
      m1 = {
        x: p3.x + (p1.x - p3.x) / 2,
        y: p3.y + (p1.y - p3.y) / 2
      };
      m2 = {
        x: p1.x + (p2.x - p1.x) / 2,
        y: p1.y + (p2.y - p1.y) / 2
      };
      m3 = {
        x: p2.x + (p3.x - p2.x) / 2,
        y: p2.y + (p3.y - p2.y) / 2
      };
      t1 = {
        x: Math.floor(m3.x + (p1.x - m3.x) * 0.6),
        y: Math.floor(m3.y + (p1.y - m3.y) * 0.6)
      };
      t2 = {
        x: Math.floor(m1.x + (p2.x - m1.x) * 0.6),
        y: Math.floor(m1.y + (p2.y - m1.y) * 0.6)
      };
      t3 = {
        x: Math.floor(m2.x + (p3.x - m2.x) * 0.6),
        y: Math.floor(m2.y + (p3.y - m2.y) * 0.6)
      };
      return new Polygon(t1, t2, t3, t1);
    };

    Scribble.prototype.getLargestTriangle = function() {
      var area, compRootedTri, finalArea, fipa, fipb, fipc, i, ia, ib, ib0, ic, np, pf0, pf1, pf2, pt, pts, ripa, ripb, ripc, triArea, _i, _len, _ref2, _ref3, _ref4, _ref5;
      pts = this.convexHull;
      np = this.convexHull.length;
      compRootedTri = function(ripa, ripb, ripc) {
        var area, ia, ib, ic, pa, pb, pc, trigArea, _ref2;
        trigArea = 0;
        ia = ripa;
        ib = ripb;
        for (ic = ripc, _ref2 = np - 1; ripc <= _ref2 ? ic < _ref2 : ic > _ref2; ripc <= _ref2 ? ic++ : ic--) {
          pa = pts[ia];
          pb = pts[ib];
          pc = pts[ic];
          if ((area = Helper.triangleArea(pa, pb, pc)) > trigArea) {
            ripc = ic;
            trigArea = area;
          } else {
            break;
          }
        }
        return trigArea;
      };
      if (this.convexHull.length <= 3) {
        this._largestTriangle = new Polygon();
        _ref2 = this.convexHull;
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          pt = _ref2[_i];
          this._largestTriangle.push(pt);
        }
        for (i = _ref3 = this.convexHull.length; _ref3 <= 4 ? i < 4 : i > 4; _ref3 <= 4 ? i++ : i--) {
          this._largestTriangle.push(this.convexHull[0]);
        }
        return this._largestTriangle;
      }
      ia = area = triArea = 0;
      for (ib = 1, _ref4 = this.convexHull.length - 2; 1 <= _ref4 ? ib <= _ref4 : ib >= _ref4; 1 <= _ref4 ? ib++ : ib--) {
        if (ib >= 2) {
          ic = ib + 1;
        } else {
          ic = 2;
        }
        area = compRootedTri(ia, ib, ic);
        if (area > triArea) {
          triArea = area;
          ripa = ia;
          ripb = ib;
          ripc = ic;
        }
      }
      finalArea = triArea;
      pf0 = ripa;
      pf1 = ripb;
      pf2 = ripc;
      for (ia = _ref5 = ripa + 1; _ref5 <= ripb ? ia <= ripb : ia >= ripb; _ref5 <= ripb ? ia++ : ia--) {
        triArea = 0;
        if (ia === ripb) {
          ib0 = ripb + 1;
        } else {
          ib0 = ripb;
        }
        area = 0;
        for (ib = ib0; ib0 <= ripc ? ib <= ripc : ib >= ripc; ib0 <= ripc ? ib++ : ib--) {
          if (ib === ripc) {
            ic = ripc + 1;
          } else {
            ic = ripc;
          }
          area = compRootedTri(ia, ib, ic);
          if (area > triArea) {
            triArea = area;
            fipa = ia;
            fipb = ib;
            fipc = ic;
          }
        }
        if (triArea > finalArea) {
          finalArea = triArea;
          pf0 = fipa;
          pf1 = fipb;
          pf2 = fipc;
        }
      }
      return this._largestTriangle = new Polygon(this.convexHull[pf0], this.convexHull[pf1], this.convexHull[pf2], this.convexHull[pf0]);
    };

    return Scribble;

  })();

  exports.Scribble = Scribble;

}).call(this);

});

require.define("/stroke.coffee", function (require, module, exports, __dirname, __filename) {
(function() {
  var Stroke;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  Stroke = (function() {

    __extends(Stroke, Array);

    function Stroke() {
      this._len = 0;
      this._speed = 0;
      this._firstTime = 0;
      this.__defineGetter__("strokeLength", function() {
        return this._len;
      });
      this.__defineGetter__("drawingSpeed", function() {
        return this.speed;
      });
    }

    Stroke.prototype.push = function(x, y, time) {
      var dx, dy, point;
      if (time == null) time = 0;
      point = {
        x: x,
        y: y,
        time: time
      };
      Stroke.__super__.push.call(this, point);
      if (this.length > 1) {
        dx = this._lastPoint.x - x;
        dy = this._lastPoint.y - y;
        this._len += Math.sqrt(dx * dx + dy * dy);
        this._speed = time === this._firstTime ? Number.MAX_VALUE : this._len / (time - this._firstTime);
      } else {
        this._firstTime = time;
      }
      return this._lastPoint = point;
    };

    return Stroke;

  })();

  exports.Stroke = Stroke;

}).call(this);

});

require.define("/polygon.coffee", function (require, module, exports, __dirname, __filename) {
(function() {
  var Helper, Polygon;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; }, __slice = Array.prototype.slice;

  if (typeof WEB === "undefined" || WEB === null) {
    Helper = require('./helper').Helper;
  }

  Polygon = (function() {

    __extends(Polygon, Array);

    function Polygon() {
      var pts;
      pts = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      Polygon.__super__.constructor.call(this);
      this.push.apply(this, pts);
      this._area = 0;
      this._perimeter = 0;
      this.__defineGetter__("area", function() {
        var i, _ref;
        if (this._area === 0) {
          if (this.length < 3) return this._area = 0;
          for (i = 0, _ref = this.length - 1; 0 <= _ref ? i <= _ref : i >= _ref; 0 <= _ref ? i++ : i--) {
            this._area += this[i].x * this[i + 1].y - this[i + 1].x * this[i].y;
          }
          this._area /= 2;
        }
        return Math.abs(this._area);
      });
      this.__defineGetter__("perimeter", function() {
        var i, _ref;
        if (this._perim === 0) {
          for (i = 0, _ref = this.length - 1; 0 <= _ref ? i <= _ref : i >= _ref; 0 <= _ref ? i++ : i--) {
            this._perim += Helper.prototype.distance(this[i], this[i + 1]);
          }
          if (this.length < 3) this._perim *= 2;
        }
        return this._perim;
      });
    }

    return Polygon;

  })();

  exports.Polygon = Polygon;

}).call(this);

});

require.define("/helper.coffee", function (require, module, exports, __dirname, __filename) {
(function() {
  var Util, Vector;

  exports.Vector = Vector = (function() {

    function Vector(start, end) {
      this.start = start;
      this.end = end;
      this.__defineGetter__("length", function() {
        return Util.distance(this.start, this.end);
      });
    }

    return Vector;

  })();

  Util = {
    distance: function(p1, p2) {
      return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    },
    triangleArea: function(p1, p2, p3) {
      var area;
      area = p1.x * p2.y - p2.x * p1.y;
      area += p2.x * p3.y - p3.x * p2.y;
      area += p3.x * p1.y - p1.x * p3.y;
      return Math.abs(area / 2);
    },
    theta: function(p, q) {
      var ax, ay, dx, dy, t;
      dx = q.x - p.x;
      ax = Math.abs(dx);
      dy = q.y - p.y;
      ay = Math.abs(dy);
      t = ax + ay === 0 ? 0 : dy / (ax + ay);
      if (dx < 0) {
        t = 2 - t;
      } else if (dy < 0) {
        t = 4 + t;
      }
      return t * 90;
    },
    left: function(a, b, c) {
      return (a.x * b.y - a.y * b.x + a.y * c.x - a.x * c.y + b.x * c.y - c.x * b.y) > 0;
    },
    cross: function(a, b) {
      var dx1, dx2, dy1, dy2;
      dx1 = a.end.x - a.start.x;
      dx2 = b.end.x - b.start.x;
      dy1 = a.end.y - a.start.y;
      dy2 = b.end.y - b.start.y;
      return dx1 * dy2 - dy1 * dx2;
    },
    dot: function(a, b) {
      var dx1, dx2, dy1, dy2;
      dx1 = a.end.x - a.start.x;
      dx2 = b.end.x - b.start.x;
      dy1 = a.end.y - a.start.y;
      dy2 = b.end.y - b.start.y;
      return dx1 * dx2 + dy1 * dy2;
    },
    angle: function(a, b) {
      if ((a instanceof Vector) && (b instanceof Vector)) {
        return Math.atan2(Util.cross(a, b), Util.dot(a, b));
      } else {
        return Math.atan2(b.y - a.y, b.x - a.x);
      }
    },
    closest: function(p1, p2, p3) {
      var b1, b2, d, m, x, y;
      d = p2.x - p1.x;
      if (d === 0) {
        return {
          x: p1.x,
          y: p3.y
        };
      }
      if (p1 === p3) return p3;
      if (p2 === p3) return p3;
      m = (p2.y - p1.y) / d;
      if (m === 0) {
        return {
          x: p3.x,
          y: p1.y
        };
      }
      b1 = p2.y - m * p2.x;
      b2 = p3.y + 1 / m * p3.x;
      x = (b2 - b1) / (m + 1 / m);
      y = m * x + b1;
      return {
        x: Math.round(x),
        y: Math.round(y)
      };
    },
    quadArea: function(p1, p2, p3, p4) {
      var area;
      area = p1.x * p2.y - p2.x * p1.y;
      area += p2.x * p3.y - p3.x * p2.y;
      area += p3.x * p4.y - p4.x * p3.y;
      area += p4.x * p1.y - p1.x * p4.y;
      return Math.abs(area / 2);
    }
  };

  exports.Helper = Util;

}).call(this);

});

require.define("/shape.coffee", function (require, module, exports, __dirname, __filename) {
(function() {
  var Evaluate, Gesture, Shape, Unknown;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  if (typeof WEB === "undefined" || WEB === null) {
    Gesture = require('./gesture').Gesture;
    Evaluate = require('./evaluate').Evaluate;
  }

  Shape = (function() {

    __extends(Shape, Gesture);

    function Shape(rotated) {
      if (rotated == null) rotated = true;
      Shape.__super__.constructor.call(this);
      this.type = "Shape";
      this.dashed = false;
      this.bold = false;
      this.open = false;
      this._normalFeature = Gesture.prototype.Features([Evaluate.Tl_Pch, [0.83, 0.93]]);
      this._dashFeature = Gesture.prototype.Features([Evaluate.Tl_Pch, [0.2, 0.3, 0.83, 0.93]], [Evaluate.Pch_Ns_Tl, [5, 10]]);
      this._openFeature = Gesture.prototype.Features([Evaluate.Tl_Pch, [0.2, 0.3, 0.83, 0.93]]);
      this._boldFeature = Gesture.prototype.Features([Evaluate.Tl_Pch, [1.5, 3]]);
    }

    Shape.prototype.setUp = function(scribble) {
      throw "abstract";
    };

    /*
    	| Description: Computes the degree of membership for the scribble, taking
    	|              into account the fuzzysets for the current shape.
    	|              This evaluation is made based on geometric global features.
    	| Input: A scribble
    	| Output: degree of membership
    	| Notes: This method is the same for all shapes.
    */

    Shape.prototype.evalGlobalFeatures = function(scribble) {
      this.dom = this._features(scribble);
      this.dashed = false;
      this.bold = false;
      this.open = false;
      this.scribble = null;
      if (this.dom) this.setUp(scribble);
      return this.dom;
    };

    return Shape;

  })();

  Unknown = (function() {

    __extends(Unknown, Shape);

    function Unknown() {
      this.name = "Unknown";
    }

    Unknown.prototype.evaluate = function(scribble) {
      return 0;
    };

    return Unknown;

  })();

  exports.Shape = Shape;

  exports.Unknown = Unknown;

}).call(this);

});

require.define("/gesture.coffee", function (require, module, exports, __dirname, __filename) {
(function() {
  var FuzzySet, Gesture;
  var __slice = Array.prototype.slice;

  if (typeof WEB === "undefined" || WEB === null) {
    FuzzySet = require('./fuzzy').FuzzySet;
  }

  Gesture = (function() {

    function Gesture() {
      this.scribble = null;
      this.dom = 0;
      this._prevGesture = null;
      this.name = null;
      this.type = null;
    }

    Gesture.prototype.evalGlobalFeatures = function(scribble) {
      return 0;
    };

    Gesture.prototype.evalLocalFeatures = function(scribble, shapes) {
      return 1;
    };

    Gesture.prototype.resetDom = function() {
      return this.dom = 0;
    };

    Gesture.prototype.pushAttribs = function() {
      return this._prevGesture = clone();
    };

    Gesture.prototype.popAttribs = function() {};

    return Gesture;

  })();

  Gesture.prototype.Features = function() {
    var a, awa, b, bwb, fn, fuzzySet, fuzzyVals, node, nodes, _i, _len, _list;
    nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    _list = [];
    for (_i = 0, _len = nodes.length; _i < _len; _i++) {
      node = nodes[_i];
      fn = node[0], fuzzyVals = node[1];
      awa = fuzzyVals[0], a = fuzzyVals[1], b = fuzzyVals[2], bwb = fuzzyVals[3];
      b || (b = Number.MAX_VALUE);
      bwb || (bwb = Number.MAX_VALUE);
      fuzzySet = new FuzzySet(a, b, a - awa, bwb - b);
      _list.push(function(scribble) {
        return fuzzySet.degOfMember(fn(scribble));
      });
    }
    return function(scribble) {
      var dom, fn, tmp, _j, _len2;
      if (_list == null) return 0;
      dom = 1;
      for (_j = 0, _len2 = _list.length; _j < _len2; _j++) {
        fn = _list[_j];
        tmp = fn(scribble);
        if (tmp < dom) dom = tmp;
        if (dom === 0) break;
      }
      return dom;
    };
  };

  exports.Gesture = Gesture;

}).call(this);

});

require.define("/fuzzy.coffee", function (require, module, exports, __dirname, __filename) {
(function() {
  var FuzzySet;

  FuzzySet = (function() {

    function FuzzySet(a, b, wa, wb) {
      this.a = a;
      this.b = b;
      this.wa = wa;
      this.wb = wb;
      if (!this.check()) throw "Attempting to create invalid fuzzy set";
    }

    FuzzySet.prototype.check = function() {
      return (this.a <= this.b) && (this.wa >= 0) && (this.wb >= 0);
    };

    FuzzySet.prototype.degOfMember = function(value) {
      if ((value < (this.a - this.wa)) || (value > (this.b + this.wb))) return 0;
      if (value >= this.a && value <= this.b) return 1;
      if (value > this.b && (value <= this.b + this.wb)) {
        return 1.0 - (value - this.b) / this.wb;
      }
      if (value < this.a && (value >= this.a - this.wa)) {
        return 1.0 + (value - this.a) / this.wa;
      }
      return 0.0;
    };

    FuzzySet.prototype.distance = function(value) {};

    return FuzzySet;

  })();

  exports.FuzzySet = FuzzySet;

}).call(this);

});

require.define("/evaluate.coffee", function (require, module, exports, __dirname, __filename) {
(function() {
  var Helper;

  if (typeof WEB === "undefined" || WEB === null) {
    Helper = require("./helper").Helper;
  }

  exports.Evaluate = {
    Tl_Pch: function(sc) {
      return sc._len / sc.convexHull.perimeter;
    },
    Pch2_Ach: function(sc) {
      return Math.pow(sc.convexHull.perimeter, 2) / sc.convexHull.area;
    },
    Pch_Ns_Tl: function(sc) {
      return sc.convexHull.perimeter / (sc.scribbleLength / sc.length);
    },
    Hollowness: function(sc) {
      return sc.ptsInSmallTri;
    },
    Ns: function(sc) {
      return sc.length;
    },
    Hm_Wbb: function(sc) {
      var pbb;
      pbb = sc.boundingBox;
      return Math.abs((pbb[0].x - pbb[1].x) / sc.hMovement());
    },
    Vm_Hbb: function(sc) {
      var pbb;
      pbb = sc.boundingBox;
      return Math.abs((pbb[2].y - pbb[1].y) / sc.vMovement());
    },
    Hbb_Wbb: function(sc) {
      var dh, dw, pbb, tmp;
      pbb = sc.boundingBox().getPoints();
      dw = pbb[1].x - pbb[0].x;
      dh = pbb[2].y - pbb[1].y;
      if (dw === 0 || dh === 0) return 0;
      tmp = Math.abs(dh / dw);
      if (tmp > 1) tmp = 1 / tmp;
      return tmp;
    },
    Her_Wer: function(sc) {
      var dh, dw, pbb, tmp;
      pbb = sc.enclosingRect;
      dw = Helper.distance(pbb[2], pbb[1]);
      dh = Helper.distance(pbb[1], pbb[0]);
      if (dw === 0 || dh === 0) return 0;
      tmp = dh / dw;
      if (tmp > 1) tmp = 1 / tmp;
      return tmp;
    },
    Alt_Ach: function(sc) {
      return sc.largestTriangle.area / sc.convexHull.area;
    },
    Ach_Aer: function(sc) {
      return sc.convexHull.area / sc.enclosingRect.area;
    },
    Alt_Aer: function(sc) {
      return sc.largestTriangle.area / sc.enclosingRect.area;
    },
    Ach_Abb: function(sc) {
      return sc.convexHull.area / sc.boundingBox.area;
    },
    Alt_Abb: function(sc) {
      return sc.largestTriangle.area / sc.boundingBox.area;
    },
    Alq_Ach: function(sc) {
      return sc.largestQuad.area / sc.convexHull.area;
    },
    Alq_Aer: function(sc) {
      return sc.largestQuad.area / sc.enclosingRect.area;
    },
    Alt_Alq: function(sc) {
      return sc.largestTriangle.area / sc.largestQuad.area;
    },
    Plt_Pch: function(sc) {
      return sc.largestTriangle.perimeter / sc.convexHull.perimeter;
    },
    Pch_Per: function(sc) {
      return sc.convexHull.perimeter / sc.enclosingRect.perimeter;
    },
    Plt_Per: function(sc) {
      return sc.largestTriangle.perimeter / sc.enclosingRect.perimeter;
    },
    Pch_Pbb: function(sc) {
      return sc.convexHull.perimeter / sc.boundingBox.perimeter;
    },
    Plt_Pbb: function(sc) {
      return sc.largestTriangle.perimeter / sc.boundingBox.perimeter;
    },
    Plq_Pch: function(sc) {
      return sc.largestQuad.perimeter / sc.convexHull.perimeter;
    },
    Plq_Per: function(sc) {
      return sc.largestQuad.perimeter / sc.enclosingRect.perimeter;
    },
    Plt_Plq: function(sc) {
      return sc.largestTriangle.perimeter / sc.largestQuad.perimeter;
    }
  };

}).call(this);

});

require.define("/command.coffee", function (require, module, exports, __dirname, __filename) {
(function() {
  var Command, Gesture, Tap;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  if (typeof WEB === "undefined" || WEB === null) {
    Gesture = require('./gesture').Gesture;
  }

  Command = (function() {

    __extends(Command, Gesture);

    function Command() {
      Command.__super__.constructor.apply(this, arguments);
      this.type = "Command";
    }

    Command.prototype.evalGlobalFeatures = function(scribble) {
      this.scribble = scribble;
      this.dom = this._features.evaluate(scribble);
      if (this.dom <= 0) this.scribble = null;
      return this.dom;
    };

    return Command;

  })();

  Tap = (function() {

    __extends(Tap, Command);

    function Tap() {
      Tap.__super__.constructor.apply(this, arguments);
      this.name = "Tap";
      this.point = {
        x: 0,
        y: 0
      };
    }

    Tap.prototype.setUp = function(scribble) {
      this.point = scribble.startingPoint;
      this.dom = 1;
      return this.scribble = scribble;
    };

    return Tap;

  })();

  exports.Command = Command;

  exports.Tap = Tap;

}).call(this);

});

require.define("/line.coffee", function (require, module, exports, __dirname, __filename) {
(function() {
  var Evaluate, Gesture, Line, Shape;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  if (typeof WEB === "undefined" || WEB === null) {
    Gesture = require('./gesture').Gesture;
    Shape = require('./shape').Shape;
    Evaluate = require('./evaluate').Evaluate;
  }

  Line = (function() {

    __extends(Line, Shape);

    function Line(rotated) {
      var i;
      if (rotated == null) rotated = true;
      Line.__super__.constructor.call(this, rotated);
      this.name = "Line";
      this.points = [
        (function() {
          var _results;
          _results = [];
          for (i = 0; i <= 2; i++) {
            _results.push({
              x: 0,
              y: 0
            });
          }
          return _results;
        })()
      ];
      this._normalFeature = Gesture.prototype.Features([Evaluate.Tl_Pch, [0.4, 0.45]]);
      this._dashFeature = Gesture.prototype.Features([Evaluate.Tl_Pch, [0, 0, 0.4, 0.45]], [Evaluate.Pch_Ns_Tl, [5, 10]]);
      this._features = Gesture.prototype.Features([Evaluate.Her_Wer, [0, 0, 0.06, 0.08]]);
    }

    Line.prototype.setUp = function(scribble) {
      var points;
      this.scribble = scribble;
      points = this.scribble.enclosingRect;
      this.points[0] = points[0];
      return this.points[1] = points[2];
    };

    return Line;

  })();

  exports.Line = Line;

}).call(this);

});

require.define("/rectangle.coffee", function (require, module, exports, __dirname, __filename) {
(function() {
  var Evaluate, Gesture, Rectangle, Shape;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  Gesture = require('./gesture').Gesture;

  Shape = require('./shape').Shape;

  Evaluate = require('./evaluate').Evaluate;

  Rectangle = (function() {

    __extends(Rectangle, Shape);

    function Rectangle(rotated) {
      if (rotated == null) rotated = true;
      Rectangle.__super__.constructor.call(this, rotated);
      this.name = "Rectangle";
      if (rotated) {
        this._features = Gesture.prototype.Features([Evaluate.Ach_Aer, [0.75, 0.85, 1, 1]], [Evaluate.Alq_Aer, [0.72, 0.78, 1, 1]], [Evaluate.Hollowness, [0, 0, 1, 1]]);
      } else {
        this._features = Gesture.prototype.Features([Evaluate.Ach_Abb, [0.8, 0.83, 1, 1]], [Evaluate.Pch_Pbb, [0.87, 0.9, 1, 1]], [Evaluate.Alt_Abb, [0.45, 0.47, 0.5, 0.52]]);
      }
    }

    Rectangle.prototype.setUp = function(scribble) {
      this.scribble = scribble;
      return this.points = this.scribble.enclosingRect;
    };

    return Rectangle;

  })();

  exports.Rectangle = Rectangle;

}).call(this);

});

require.define("/circle.coffee", function (require, module, exports, __dirname, __filename) {
(function() {
  var Circle, Evaluate, Gesture, Shape;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  if (typeof WEB === "undefined" || WEB === null) {
    Gesture = require('./gesture').Gesture;
    Shape = require('./shape').Shape;
    Evaluate = require('./evaluate').Evaluate;
  }

  Circle = (function() {

    __extends(Circle, Shape);

    function Circle(rotated) {
      var i;
      if (rotated == null) rotated = true;
      Circle.__super__.constructor.call(this, rotated);
      this.name = "Circle";
      this.points = [
        (function() {
          var _results;
          _results = [];
          for (i = 0; i <= 4; i++) {
            _results.push({});
          }
          return _results;
        })()
      ];
      this._features = Gesture.prototype.Features([Evaluate.Pch2_Ach, [12.5, 12.5, 13.2, 13.5]], [Evaluate.Hollowness, [0, 0, 0, 0]]);
    }

    Circle.prototype.setUp = function(scribble) {
      var d1, d2;
      this.scribble = scribble;
      this.points = this.scribble.boundingBox;
      d1 = Math.sqrt(Math.pow(this.points[0].x - this.points[1].x, 2) + Math.pow(this.points[0].y - this.points[1].y, 2));
      d2 = Math.sqrt(Math.pow(this.points[2].x - this.points[1].x, 2) + Math.pow(this.points[2].y - this.points[1].y, 2));
      this.radius = Math.floor((d1 + d2) / 2 / 2);
      return this.center = {
        x: Math.floor(this.points[0].x + d2 / 2),
        y: Math.floor(this.points[0].y + d1 / 2)
      };
    };

    return Circle;

  })();

  exports.Circle = Circle;

}).call(this);

});

require.define("/recognizer.coffee", function (require, module, exports, __dirname, __filename) {
    (function() {
  var Command, List, Recognizer, Scribble, Shape, Tap, Unknown, _ref, _ref2;

  if (typeof WEB === "undefined" || WEB === null) {
    List = require("./list").List;
    Scribble = require("./scribble").Scribble;
    _ref = require("./shape"), Shape = _ref.Shape, Unknown = _ref.Unknown;
    _ref2 = require("./command"), Command = _ref2.Command, Tap = _ref2.Tap;
  }

  Recognizer = (function() {

    function Recognizer(rotated, alfaCut) {
      this.rotated = rotated != null ? rotated : true;
      this.alfaCut = alfaCut != null ? alfaCut : 0;
      this._shapesList = [];
      this._unknownShape = new Unknown();
      this._tap = new Tap();
    }

    Recognizer.prototype.addShape = function(shape) {
      return this._shapesList.push(shape);
    };

    Recognizer.prototype.addAllShapes = function(rotated) {
      var Circle, Line, Rectangle;
      Line = require("./line").Line;
      Rectangle = require("./rectangle").Rectangle;
      Circle = require("./circle").Circle;
      this._shapesList = [];
      return this._shapesList.push(new Line(rotated), new Rectangle(rotated), new Circle(rotated));
    };

    Recognizer.prototype.recognize = function(scribble) {
      var name, shape, shapes, val, val2, _i, _j, _len, _len2, _ref3, _ref4;
      if (!(scribble instanceof Scribble)) scribble = new Scribble(scribble);
      shapes = new List();
      _ref3 = this._shapesList;
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        shape = _ref3[_i];
        shape.resetDom();
      }
      if (scribble.scribbleLength < 2) {
        this._tap.setUp(scribble);
        shapes.insertInOrder(this._tap, 1 - 0);
      } else {
        _ref4 = this._shapesList;
        for (_j = 0, _len2 = _ref4.length; _j < _len2; _j++) {
          shape = _ref4[_j];
          name = shape.name;
          val = shape.evalGlobalFeatures(scribble);
          if (val > this.alfaCut) {
            val2 = shape.evalLocalFeatures(scribble, this._shapesList);
            if (val2 < val) val = val2;
            if (val > this.alfaCut) shapes.insertInOrder(shape, 1 - val);
          }
        }
      }
      if (shapes.length === 0) {
        this._unknownShape.setUp(scribble);
        shapes.insertInOrder(this._unknownShape, 1 - 0);
      }
      return shapes;
    };

    return Recognizer;

  })();

  exports.Recognizer = Recognizer;

}).call(this);

});
require("/recognizer.coffee");
