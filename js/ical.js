/* use a function for the exact format desired... */
function padOW(n)
{
    var s = n.toString();
    if(n<10)
    {
        s = "0"+s;
    }
    return s;
}
function ISOUTCDateString(d)
{
    var str = d.getUTCFullYear().toString()
    + padOW(d.getUTCMonth()+1)
    + padOW(d.getUTCDate())+'T'
    + padOW(d.getUTCHours())
    + padOW(d.getUTCMinutes())
    + padOW(d.getUTCSeconds())+'Z';
    return str;
}
function ISOLocalDateString(d)
{
    var str = d.getFullYear().toString()
    + padOW(d.getMonth()+1)
    + padOW(d.getDate())+'T'
    + padOW(d.getHours())
    + padOW(d.getMinutes())
    + padOW(d.getSeconds());//+'Z';
    return str;
}

function wrap(str)
{
    var MAX_LINE = 75;
    // var data = new Buffer(str);
    // var pos = 0, len;
    // var output = [];
    // while(true) {
    //     len = MAX_LINE;
    //     if(pos+len >= data.length)
    //         len = data.length-pos;
    // 
    //     // We're in the middle of a unicode character if the high bit is set and
    //     // the next byte is 10xxxxxx (or 0x80).  Don't split it in half.
    //     // Wind backward until we find the start character...
    //     while((data[pos+len] & 0xc0) == 0x80)
    //         len--;
    // 
    //     output.push(data.toString('utf8', pos, pos+len));
    // 
    //     if(pos+len >= data.length)
    //         break;
    // 
    //     // Insert the space for the start of the next line...
    //     pos += len-1;
    //     data[pos] = 0x20;
    // }
    // 
    // return output;
    
    var pos = 0;
    var out = '';
    while(pos < str.length)
    {
        var nextract = MAX_LINE;
        var line = '';
        var line_esc = '';
        do
        {
            nextract--;
            line = str.substr(pos,nextract);
            line_esc = line.replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");
        }
        while(line_esc.length > MAX_LINE-1);
        if(pos > 0)
        {
            out += '\r\n ';
        }
        out += line_esc;
        pos += nextract;
    }
	return out;
}

function createICSEvent(ev)
{
	var now = new Date();
    return [
    "BEGIN:VEVENT",
    "DTSTART;TZID=America/Los_Angeles:"+ISOLocalDateString(ev.startdate),
    "DTEND;TZID=America/Los_Angeles:"+ISOLocalDateString(ev.enddate),
    "DTSTAMP:"+ISOUTCDateString(now),
    "UID:"+Math.random().toString(36).substr(2,9),
    "CREATED:"+ISOUTCDateString(now),
    wrap("DESCRIPTION:"+ev.details),
    "LAST-MODIFIED:"+ISOUTCDateString(now),
    wrap("LOCATION:"+ev.location),
    "SEQUENCE:0",
    "STATUS:CONFIRMED",
    wrap("SUMMARY:"+ev.title),
    "TRANSP:OPAQUE",
    "CATEGORIES:http://schemas.google.com/g/2005#event",
    "END:VEVENT"
    ].join('\r\n');
}

function createICSCalendar(title,events)
{
    return [
    "BEGIN:VCALENDAR",
    "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    wrap("X-WR-CALNAME:"+title),
    "X-WR-TIMEZONE:America/Los_Angeles",
    "X-WR-CALDESC:This is a calendar created by wa-leg-cal-parse"
    ].join('\r\n') + '\r\n' +
    events.join('\r\n') + '\r\n' +
    "END:VCALENDAR";
}
