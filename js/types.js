// Copyright (C) 2011 Tri Tech Computers Ltd.
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is furnished to do
// so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
// 
//

(function(global) {
	var exports = {};
	var RRule = recur.RRule;

	function pad(n,d) {
		d = d || 2;
		neg = n < 0;
		if(neg) n *= -1;
		n = n.toString();

		var zeroes = '000000000000000000';
		return (neg ? '-' : '')+zeroes.substr(0,d-n.length)+n;
	}

	var _types = {
		'BINARY': {
			format: function(value) {
				var base64 = require('base64');
				return base64.encode(value);
			},
			parse: function(value) {
				var base64 = require('base64');
				return base64.decode(value);
			}
		},
		'BOOLEAN': {
			format: function(value) {
				return value ? "TRUE" : "FALSE";
			},
			parse: function(value) {
				return value.toUpperCase() == "TRUE";
			}
		},
		'CAL-ADDRESS': {
			format: function(value) { return value.toString(); }
		},
		'DATE': {
			format: function(value) {
				return value.getFullYear()
					+pad(value.getMonth()+1)
					+pad(value.getDate());
			},
			parse: function(value) {
				return new Date(
					parseInt(value.substr(0,4), 10),
					parseInt(value.substr(4,2), 10)-1,
					parseInt(value.substr(6,2), 10), 0,0,0);
			}
		},
		'DATE-TIME': {
			// YYYYMMDDTHHMMSS
			//  TODO: Support UTC and TZ values
			format: function(value) {
				return format_value('DATE', value)+'T'+format_value('TIME', value);
			},
			parse: function(value, parameters, calendar) {
				var tz = parameters['TZID'];
				var d = [parseInt(value.substr(0,4), 10),
				parseInt(value.substr(4,2), 10),
				parseInt(value.substr(6,2), 10),
				parseInt(value.substr(9,2), 10),
				parseInt(value.substr(11,2), 10),
				parseInt(value.substr(13,2), 10)];

				if(tz !== undefined) {
					tz = calendar.timezone(tz);
					return tz.fromLocalTime(d);
				}

				return new Date(d[0], d[1]-1, d[2], d[3], d[4], d[5]);
			}
		},
		'DURATION': {
			format: function(value) {
				// Duration values from JS should be an integer number of seconds
				var neg = value < 0;
				if(neg) value *= -1;

				var w = Math.floor(value/(60*60*24*7)); value -= w*60*60*24*7;
				var d = Math.floor(value/(60*60*24));   value -= d*60*60*24;
				var h = Math.floor(value/(60*60));      value -= h*60*60;
				var m = Math.floor(value/60);           value -= m*60;
				var s = value;

				var dur = ['P'];
				if(neg) dur.push('-');
				if(w) dur.push(w+'W');
				if(d) dur.push(d+'D');
				if((h||m||s)) dur.push('T');
				if(h) dur.push(h+'H');
				if(m) dur.push(m+'M');
				if(s) dur.push(s+'S');
				return dur.join('');
			},
			parse: function(value) {
				var match = /P(\d+W)?(\d+D)?(?:T(\d+H)?(\d+M)?(\d+S)?)/.exec(value).slice(1);
				var mul = [ 60*60*24*7, 60*60*24, 60*60, 60, 1 ];
				var dur = 0;

				for(var i=0; i < match.length; ++i) {
					if(match[i] !== undefined) dur += parseInt(match[i], 10) * mul[i];
				}

				return dur;
			}
		},
		'FLOAT': {
			format: function(value) { return value.toString(); },
		},
		'INTEGER': {
			format: function(value) { return value.toString(); },
		},
		'PERIOD': {
			format: function(value) {
				var start = format_value('DATE-TIME', value[0]);
				var end = format_value(value[1] instanceof Date ? 'DATE-TIME' : 'DURATION', value[1]);
				return start+'/'+end;
			}
		},
		'RECUR': {
			format: function(value) {
				return (value instanceof RRule ? value : new RRule(value)).toString();
			},
			parse: function(value) { return RRule.parse(value); }
		},
		'TEXT': {
			format: function(value) {
				return value.toString().replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");
			}
		},
		'TIME': {
			format: function(value) {
				// TODO: Right now we always use pure local time
				//   That means the timezone is ignored and times are always local
				return pad(value.getHours())
					+pad(value.getMinutes())
					+pad(value.getSeconds());
			},
			parse: function(value) {
				return new Date(0,0,0,
					parseInt(value.substr(0, 2), 10),
					parseInt(value.substr(2, 2), 10),
					parseInt(value.substr(4, 2), 10));
			}
		},
		'URI': {
			format: function(value) { return value.toString(); },
		},
		'UTC-OFFSET': {
			format: function(value) {
				var west = value < 0;
				if(west) value *= -1;
				return (west ? '-' : '+')+pad(value, 4);
			}
		}
	};


	var format_value = exports.format_value = function(type, value) {
		if(value === undefined)
		return '';

		var fmt = _types[type || 'TEXT'];
		if(fmt === undefined)
		throw Error("Invalid iCalendar datatype: "+type);

		return fmt.format(value);
	}

	var parse_value = exports.parse_value = function(type, value, parameters, calendar) {
		var fmt = _types[type || 'TEXT'];
		if(fmt === undefined)
		throw Error("Invalid iCalendar datatype: "+type);

		return fmt.parse ? fmt.parse(value, parameters || {}, calendar) : value;
	}

	return global.types = exports;
})(typeof window === 'undefined' ? this : window);
