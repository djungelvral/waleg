<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Calendar Parser</title>
    <style type="text/css" media="screen">
    html,body{height:100%;margin:0;padding:0;}
    tr:nth-child(odd)    { background-color:#eee; }
    tr:nth-child(even)    { background-color:#fff; }
    td > input { margin-left: 1em; }
    </style>
    <script type="text/javascript" src="http://www.google.com/jsapi?key=AIzaSyC9lKLqnXY1LvMiwM-TY-irkN91O-msSHk"></script>
    <script type="text/javascript" src="gcal.js" charset="utf-8"></script>
    <script type="text/javascript" src="jquery-1.7.1.min.js" charset="utf-8"></script>
    <script type="text/javascript" charset="utf-8">
    $(document).ready(function() {
        var letterbullets = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
        function ol2txt(obj,level,ndx,str) {
            if($(obj).length>1) {
                console.log('Error: multiple objects passed to ol2txt');
                return;
            }
            if($(obj).eq(0).is('ol')){
                // If node has children, recurse on all its children
                $(obj).children().each(function(i){
                    str += ol2txt($(this),level,i,"");
                });
            } else if($(obj).eq(0).is('li')) {
                // If node is an li, print it as text
                str += new Array(level+1).join("  ");
                if((level%2)==0) {
                    str += (ndx+1)+". ";
                } else {
                    str += "  "+letterbullets[ndx]+". ";
                }
                $(obj).contents().each(function(){
                    str += ol2txt(this,level+1,0,"");
                });
            } else {
                // Print node as text
                str += $(obj).text()+"\n";
            }
            return str;
        }
        $('input#urlsubmit').click(function(){
            if (google.accounts.user.checkLogin(EVENT_FEED_URL)) {
            $('div#container').load(function() {
                // Get timetable at top of page
                var $timetable = $('a[name="top"]').siblings('table').eq(0);
                var events = new Array;
                var startdate, enddate, datestr, timestr;
                $timetable.find('tr').each(function(rownum){
                    var $cells = $(this).children('td');
                    if($cells.length==0) { return; } // No td children means row only contains th cells
                    // If this row has a multicolumn cell, it might be the date row
                    if($cells.eq(0).attr('colspan')) {
                        // If the cell says "Back to Top", it's not the date
                        if($cells.eq(0).text().match(/Back to Top/i)) { return; }
                        // Otherwise it should be the date
                        datestr = $cells.eq(0).text();
                    } else {
                        // Get time if present
                        timestr = $cells.eq(0).text();
                        var titlestr = $cells.eq(1).text();
                        var locstr = $cells.eq(2).text();
                        if(timestr.length>0) {
                            startdate = new Date(datestr+", "+timestr);
                        }
                        var enddate = new Date(startdate);
                        enddate.setHours(enddate.getHours()+1);
                        var theevent = {title:titlestr, location:locstr, startdate:ISODateString(startdate), enddate:ISODateString(enddate)};
                        // If the event has links to a lower part of the page with a number, it has additional details we can get
                        var eventid = ($cells.eq(1).find('a[href]').attr('href') || "").substr(1);
                        if(eventid!="") {
                            // Get details
                            var $details = $('a[name='+eventid+']').next('span').next('div').find('b').eq(1).nextAll().andSelf();
                            $details.filter('ol').each(function(){
                                $(this).text(ol2txt(this,0,1,"\n"));
                            });
                            theevent.details = $details.text();
                            theevent.eventid = eventid;
                        }
                        // Add event to list
                        events.push(theevent);
                        // Add checkbox to row
                        $(this).append('<td><input type="checkbox" name="event" value="'+(events.length-1)+'" checked="checked"></td>');
                        // $(this).append('<td><input type="checkbox" name="event" value="'+(events.length-1)+'"></td>');
                    }
                });
                // Add button to submit checked events to calendar
                $('<input type="submit" name="addall" id="addall" value="Add Checked Events">').click(function(){
                    // Get list of checked events
                    $timetable.find("input:checked").each(function(){
                        var i = $(this).val();
                        myCalendar.addEvent(events[i].startdate, events[i].enddate, events[i].title, events[i].details, events[i].location);
                    });
                }).appendTo($('div#topbar'));
            });
        }
        });
        // Initialise calendar functionality
        cal_init();
        // For now, automatically trigger the click
        $('input#urlsubmit').click();
    });
</script>
</head>
<body>
    <div id="topbar" style="height:25px;width:90%;">
        <input name="urlinput" id="urlinput" value="http://localhost/~oliver/legislature/schedule_html.html">
        <input type="submit" name="urlsubmit" id="urlsubmit" value="Go">
    </div>
    <div id="authenticated-pane" style="display:none;height:90%;width:90%;">
        <input id="logout-button" type="button" value="Logout" onclick="logMeOut()">
        <div id="container" style="height:90%;width:90%;margin:5%;">
        </div>
    </div>
    <div id="default-pane" style="color:red;">
        Need to login first: <input id="auth-button" type="button" value="Login" onclick="logMeIn()">
    </div>
    <img src="x.png" style="position:absolute; top: -1000px;">
</body>
</html>
