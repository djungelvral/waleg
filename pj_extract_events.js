
pjs.addSuite({
    // single URL or array
    url: 'file:///Users/oliver/Desktop/legislature/schedule_html.html',
    // single function or array, evaluated in the client
    scraper: function() {
        var $timetable = $('a[name="top"] table');
        var events = new Array;
        var currtime, datestr, timestr;
        $timetable.find('tr').each(function(){
            var $cells = $(this).children('td');
            if($cells.length==0) { return; /* No td children means row only contains th cells */ }
            // If this is the date row, update the current date
            if($cells.eq(0).attr('colspan')) {
                if($cells.eq(0).text().match(/Back to Top/i)) { return; }
                datestr = $cells.eq(0).text();
                // currdate = new Date(datestr);
                // console.log(date.getFullYear()+"/"+(date.getMonth()+1)+"/"+date.getDate());
                // events.push($(this).children('td[colspan]').text());
                // events.push(datestr);
            } else {
                // Process normal rows
                // Get current time if present
                timestr = $cells.eq(0).text();
                var titlestr = $cells.eq(1).text();
                var locstr = $cells.eq(2).text();
                if(timestr.length>0) {
                    currtime = new Date(datestr+", "+timestr);
                    // console.log(datestr+", "+timestr+" --> "+currtime.toDateString()+" at "+currtime.toTimeString());
                    // events.push(currtime);
                }
                // Add event
                events.push({"title":titlestr,"location":locstr,"time":currtime.toTimeString(),"date":currtime.toDateString()});
            }
        });
        return events;
    }
});

