# Copyright (C) 2011 Tri Tech Computers Ltd.
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy of
# this software and associated documentation files (the "Software"), to deal in
# the Software without restriction, including without limitation the rights to
# use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
# of the Software, and to permit persons to whom the Software is furnished to do
# so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
# 
# 
# 
# Implement RFC5545 (iCalendar)
# see: http://tools.ietf.org/html/rfc5545
#

((global) -> 
	exports = {}
	# var assert = require('assert');
	# var util = require('util');

	# var types = require('./types');
	# var parser = require('./parser');

	format_value = exports.format_value = types.format_value;
	parse_value = exports.parse_value = types.parse_value;
	RRule = exports.RRule = recur.RRule;

	# Maximum number of octets in a single iCalendar line
	MAX_LINE = 73 # spec. max is 75, but iCal seems to produce files with lines not longer than 73

	exports.PRODID = '-//Tri Tech Computers//node-icalendar//EN';



	class CalendarObject 
		constructor: (@calendar,@element) ->
			@components = {};
			@properties = {};

		addProperty: (prop,value,parameters) ->
			if not (prop instanceof CalendarProperty)
				prop = new CalendarProperty(prop, value, parameters);

			# TODO: What about multiple occurances of the same property?
			@properties[prop.name] = prop;
			return prop;

		addComponent : (comp) -> 
			if not (comp instanceof CalendarObject)
				factory = (schema[comp] || {}).factory
				comp = if factory? then new factory(@calendar) else new CalendarObject(@calendar, comp)

			@components[comp.element] or= []
			@components[comp.element].push(comp)
			comp.calendar = @calendar
			return comp;

		getProperty: (prop) ->
			return @properties[prop];

		getPropertyValue: (prop) ->
			return @properties[prop].value;

		toString: ->
			# Make sure output always includes a VCALENDAR object
			if @element == 'VCALENDAR'
				output = @format()
			else
				ical = new iCalendar()
				ical.addComponent(@)
				output = ical.format()

			output.push(''); # <-- Add empty element to ensure trailing CRLF
			return output.join(encodeURIComponent('\r\n'));

		format: ->
			lines = ['BEGIN:'+@element];
			for pname,pval of @properties
				lines.push.apply(lines, pval.format());

			for cname,cval of @components
				for e in cval
					lines.push.apply(lines, e.format());

			lines.push('END:'+@element);
			return lines;

	exports.CalendarObject = CalendarObject

	class CalendarProperty
		constructor: (@name, @value, @parameters) ->
			propdef = properties[@name]
			@type = propdef and if propdef.type then propdef.type else 'TEXT'
			@parameters or= {}

		getParameter: (param) ->
			return @parameters[param]

		replaceOneChar: (str,char,n) ->
			re = new RegExp('^(.{'+n+'}).(.*)$','')
			return str.replace(re,'$1'+char+'$2')

		format: ->
			prop = @name+(";#{pname}=#{pval}" for pname,pval of @parameters)+':'+format_value(@type, @value)
			pos = 0
			output = []
			while true
				len = MAX_LINE
				if pos+len > prop.length
					len = prop.length-pos

				# We're in the middle of a unicode character if the high bit is set and
				# the next byte is 10xxxxxx (or 0x80).  Don't split it in half.
				# Wind backward until we find the start character...
				# while((data[pos+len] & 0xc0) == 0x80)
				while unescape(encodeURIComponent(prop.substr(pos,len))).length > MAX_LINE
					len--;

				# output.push(data.toString('utf8', pos, pos+len));
				output.push(encodeURIComponent(prop.substr(pos,len)));

				if pos+len >= prop.length
					break;

				# Insert the space for the start of the next line...
				pos += len-1;
				# data[pos] = 0x20;
				prop = @replaceOneChar(prop," ",pos)

			return output;

	exports.CalendarProperty = CalendarProperty

	class iCalendar extends CalendarObject
		constructor: (empty) ->
			super(this, 'VCALENDAR');
			@calendar = this;
			if not empty
				@addProperty('PRODID', exports.PRODID);
				@addProperty('VERSION', '2.0');

		# @parse = parser.parse_calendar;

		events: -> @components['VEVENT'] || []

		timezone: (tzid) ->
			for tz in @components['VTIMEZONE']
				if(tz.getPropertyValue('TZID') == tzid)
					return tz;

	exports.iCalendar = iCalendar

	class VEvent extends CalendarObject
		constructor: (calendar, uid) ->
			if not (calendar instanceof iCalendar)
				uid = calendar;
				calendar = null;
			super(calendar, 'VEVENT');

			# TODO: Move validation to its own method
			# if(not uid?)
			#     throw Error("UID is a required parameter");

			if uid? 
				@addProperty('DTSTAMP', new Date());
				@addProperty('UID', uid);

		setSummary: (summ) ->
			@addProperty('SUMMARY', summ)
		
		setLocation: (loc) ->
			@addProperty('LOCATION',loc)

		setDescription: (desc) ->
			@addProperty('DESCRIPTION', desc);

		setDate: (start, end) ->
			@addProperty('DTSTART', start);
			if(end instanceof Date)
				@addProperty('DTEND', end);
			else
				@addProperty('DURATION', end);

		setDate: (start, end, tzid) ->
			@addProperty('DTSTART', start, {'TZID':tzid});
			if(end instanceof Date)
				@addProperty('DTEND', end, {'TZID':tzid});
			else
				@addProperty('DURATION', end, {'TZID':tzid});

	exports.VEvent = VEvent

	class VTimezone extends CalendarObject
		constructor: (calendar, tzid) ->
			super(calendar, 'VTIMEZONE');
			@addProperty('TZID', tzid);

		getOffsetForDate: (dt) ->
			# Right now we're only supporting a single element
			assert_equal = (a,b) -> if a isnt b then throw new Error('assertion failed')
			assert_equal(1, this.components['STANDARD'].length);
			assert_equal(1, this.components['DAYLIGHT'].length);

			std = @components['STANDARD'][0];
			dst = @components['DAYLIGHT'][0];
			next_std = std.getPropertyValue('RRULE').nextOccurs(std.getPropertyValue('DTSTART'), dt);
			next_dst = dst.getPropertyValue('RRULE').nextOccurs(dst.getPropertyValue('DTSTART'), dt);

			# TODO: Using prevOccurs would be a better solution
			if(next_std < next_dst)
				return dst.getPropertyValue('TZOFFSETTO')
			return std.getPropertyValue('TZOFFSETTO')

		# Convert a parsed date in localtime to a UTC date object
		fromLocalTime: (dtarray) ->
			# Create a slightly inaccurate date object
			dt = new Date(dtarray[0], dtarray[1]-1, dtarray[2], dtarray[3], dtarray[4], dtarray[5]);
			hrs = @getOffsetForDate(dt);
			min = hrs % 100;
			hrs = (hrs-min) / 100;

			return new Date(Date.UTC(dtarray[0], dtarray[1]-1, dtarray[2], dtarray[3]-hrs, dtarray[4]-min, dtarray[5]));

	exports.VTimezone = VTimezone

	# iCalendar schema, required prop
	schema = exports.schema = {
		VCALENDAR: {
			valid_properties: [],
			required_properties: ['PRODID','VERSION'],
			valid_children: ['VEVENT'],
			required_children: []
		},
		VEVENT: {
			factory: VEvent,
			valid_properties: [],
			required_properties: ['DTSTAMP','UID'],
			valid_children: [],
			required_children: []
		},
		VTODO: {
			required_properties: ['DTSTAMP','UID']
		},
		VJOURNAL: {
			required_properties: ['DTSTAMP','UID']
		},
		VFREEBUSY: {
			required_properties: ['DTSTAMP','UID']
		},
		VALARM: {
			required_properties: ['ACTION','TRIGGER']
		},
		VTIMEZONE: {
			factory: VTimezone,
		}
	};

	properties = exports.properties = {
		DTSTAMP: {
			type: 'DATE-TIME'
		},
		DTSTART: {
			params: ['TZID'],
			type: 'DATE-TIME'
		},
		DTEND: {
			type: 'DATE-TIME'
		},
		DURATION: {
			type: 'DURATION'
		},
		TZOFFSETFROM: {
			type: 'UTC-OFFSET'
		},
		TZOFFSETTO: {
			type: 'UTC-OFFSET'
		},
		RRULE: {
			type: 'RECUR'
		},
		VERSION: { },
		PRODID: { }
	};


	return global.icalendar = exports;
)(if window? then window else this);
