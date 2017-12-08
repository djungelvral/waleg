$(document).ready(function() {
    var debug = false;
    if(debug){$('#previewpane,#previewpane2').addClass('debug');}
    var letterbullets = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    function ol2txt(obj,level,ndx,str) {
        if($(obj).length>1) {
            console.log('Error: multiple objects passed to ol2txt');
            return;
        }
        if($(obj).eq(0).is('ol')){
            // If node has children, recurse on all its children
            str += "\n";
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
            str += "\n";
        } else {
            // Print node as text
            str += $(obj).text();
        }
        return str;
    }
    function formatDate(d) {
        var d_names = new Array("Sun","Mon","Tues","Wed","Thur","Fri","Sat");
        var m_names = new Array("Jan","Feb","Mar","Apr","May","June","July","Aug","Sept","Oct","Nov","Dec");
        var hrs = d.getHours();
        var ampm = (hrs>=12) ? "pm" : "am";
        if(hrs>12){hrs -= 12;}
        var mins = d.getMinutes().toString();
        if(mins.length==1){mins="0"+mins;}
        return d_names[d.getDay()]+" "+m_names[d.getMonth()]+" "+d.getDate()+" "+d.getFullYear()+" at "+hrs+":"+mins+ampm;
    }
//     function proxify(str) { return ("proxy.php?url="+encodeURIComponent(str)); }
    $("#urlinput").click(function(){ $(this).select(); return false; });
    $('#add-to-ical').prop('disabled', true);
	function loadMessage() {
		$('.button-action-link').remove();
        $('div#container').hide();
        $('div#container').before('<p id="loading" style="margin:1em 0;">Loading <img src="images/loading.gif" alt="spinner" style="vertical-align:top;"></p>');
// 		var proxyurl = proxify($('#urlinput').val());
		// var proxyurl = 'wa.html';
	$.getJSON('http://www.whateverorigin.org/get?url=' + encodeURIComponent($('#urlinput').val()) + '&callback=?', function(data){
// 	$.getJSON('http://anyorigin.com/go?url=https%3A//content.govdelivery.com/accounts/WALEG/bulletins/189053b&callback=?', function(data){
		$('div#container').html(data.contents);
	});
        $('div#container').filter(function() { //.load(proxyurl+' #bulletin_body', function(response, status, xhr) {
            // console.log(proxify($('#urlinput').val()));
            // Remove header saying Content-Type: text/html
            $(this).contents().eq(0).filter(function() { return this.nodeType == 3 && this.nodeValue.search(/^Content-Type/i) >= 0; }).remove();
            // Remove internal style in the loaded page
            $(this).children('style').remove();
            // Get timetable at top of page
            var $timetable = $('a[name="top"]').siblings('table').eq(0);
            var events = window.events = new Array;
            var startdate, enddate, datestr, timestr;

            var $rows = $timetable.find('tr');
            $rows.each(function(rownum){
                var $row = $(this);
                if($row.attr('id') == 'selectall') { return }
                if($row.children('th').length > 0) {
                    $row.append('<th/>');
                    return;
                }
                var $cells = $row.children('td');
                if($cells.length==0) { return; } // No td children means row only contains th cells
                // If this row has a multicolumn cell, it might be the date row
                if($cells.eq(0).attr('colspan')) {
                    // If the cell says "Back to Top", it's not the date
                    if($cells.eq(0).text().match(/Back to Top/i)) { return; }
                    // Otherwise it should be the date
                    datestr = $cells.eq(0).text();
                    var dateid = (new Date(datestr)).toString();
                    $cells.eq(0).attr('colspan',2);
                    $row.append('<td style="text-align:right;"><label for="'+dateid+'">Select / de-select this day:</label></td><td><input type="checkbox" name="day" checked="checked" id="'+dateid+'"></td>');
                    $row.find('input').click(function(){
                        var checkboxdate = $row.attr('data-date');
                        var $checkboxes = $("tr[data-date='"+checkboxdate+"'] input[name='event']");
                        $checkboxes.prop("checked",$(this).prop("checked"));
                    });
                } else {
                    // Get time if present
                    timestr = $cells.eq(0).text();
                    if(timestr.length>0) {
                        startdate = new Date(datestr+", "+timestr);
                        enddate = new Date(startdate);
                        enddate.setHours(enddate.getHours()+2);
                    }
                    // Get title
                    var titlestr = $cells.eq(1).text();
                    // Swap (S) (H) (J) to front of title, if present
                    var bits = titlestr.match(/(.*)\((S|H|J)\)/);
                    if(bits && bits.length>=3) { titlestr = "("+bits[2]+")"+" "+bits[1]; }
					titlestr = titlestr.trim();
                    var theevent = {title:titlestr, startdate:startdate, enddate:enddate};
                    $row.attr({"data-title":theevent.title, "data-startdate":theevent.startdate});
                    // Get location
                    var locstr = $cells.eq(2).text();
					// TODO better test for empty location, e.g. .search(/^\s$/) to find if all are white-space
					if(locstr !== "") {
						theevent.location = locstr;
						$row.attr({"data-location":theevent.location});
					}
					theevent.row = $row.get();
                    // If the event has links to a lower part of the page with a number, it has additional details we can get
                    var eventid = ($cells.eq(1).find('a[href]').attr('href') || "").substr(1);
                    if(eventid!="") {
                        // Get details
                        var $detailsnode = $('a[name='+eventid+']').next('span').next('div').clone();
                        // Wrap all the textnodes in span tags, in order to get them to show up as html nodes later
                        $detailsnode.contents().filter(function() {return this.nodeType == 3;}).wrap('<span></span>');
                        var $details = $detailsnode.find('b').eq(1).nextAll().andSelf();
                        // Parse lists in details
                        $details.filter('ol').each(function(){
                            $(this).text(ol2txt(this,0,1,"\n"));
                        });
                        // Replace <br> elems in details with newlines
                        $details.filter('br').each(function(){
                            $(this).replaceWith("<span></span>").text("\n");
                        });
                        theevent.details = $details.text();
                        // Remove trailing newlines
                        theevent.details = theevent.details.replace(/\n+$/,"");
                        // Replace multiple consecutive newlines with a single newline
                        theevent.details = theevent.details.replace(/\n\n\n+/g,"\n\n")
                        theevent.eventid = eventid;
                        // Add details to row data
                        $row.attr({"data-details":(theevent.details).replace(/\n/g,"<br>").replace(/<br>  /g,"<br>&nbsp;&nbsp;")});
                    }
					// Show info on hover
                    $row.hover(function(){
                        $rows.removeClass('active');
                        $row.addClass('active');
                        $("#previewpane > h3").text($row.attr("data-title"));
                        $("#previewpane > h4").text(formatDate(new Date($row.attr("data-startdate")))+($row.attr("data-location") ? " in "+$row.attr("data-location") : ""));
                        $("#previewpane > .content").html($row.attr("data-details") || "No details")
                                                    .css({'top':$("#previewpane > h3").outerHeight()+$("#previewpane > h4").outerHeight()});
                        if(debug){ $("#previewpane2 > .content").html($('a[name='+eventid+']').next('span').next('div').html() || "No details").css({'top':$("#previewpane2 > h4").outerHeight()}); }
                    },function(){
                        // $(this).removeClass('active');
                        // $("#previewpane > h3").text("");
                        // $("#previewpane > .content").html("");
                    });
                    // Add event to list
                    events.push(theevent);
                    // Add checkbox to row
                    $row.append('<td><input type="checkbox" name="event" value="'+(events.length-1)+'" checked="checked"></td>');
                    // $row.append('<td><input type="checkbox" name="event" value="'+(events.length-1)+'"></td>');
					// Make the whole row clickable to toggle the checkbox
                    var $checkbox = $row.find("input[name='event']");
					$row.click(function(e){
						if($checkbox.attr("checked")) {
                            $checkbox.removeAttr("checked");
                        } else {
                            $checkbox.attr("checked","checked");
                        }
					});
					// Prevent the toggling from happening when (a) the user clicks on the checkbox itself (since this itself toggles the checkbox, causing a double toggle), or when (b) they click on the link to get more information further down the page
					$row.find('a[href], input[name="event"]').click(function(e){e.stopPropagation();});
                }
				// Store this row's date string as a data attribute
                $row.attr('data-date',datestr);
            });
            // Add button to submit checked events to calendar
            $('#add-to-ical').click(function(){
                var caltitle = "WA-LEG Schedule";
                var ICSevents = new Array();
                // Get list of checked events
                $timetable.find("input[name='event']:checked").each(function(){
                    var i = $(this).val();
					var e = createICSEvent(events[i]);
					// Add to the stack
					ICSevents.push(e);
                });
                var ICSstr = createICSCalendar(caltitle,ICSevents);
				// Download file using data URI
				$('#download-ical').remove(); // Delete existing link if present
                $('<a id="download-ical" class="button-action-link" type="text/calendar" target="_blank">Download iCal file</a>').attr('href','data:text/calendar;charset=UTF-8,'+escape(ICSstr)).insertAfter('#add-to-ical');
                if(debug)
                {
                    console.log(decodeURIComponent(ICSstr));
                }
            });
            $('#add-to-ical').prop("disabled",false);
            $('#loading').remove();
            $('div#container').fadeIn('slow');
        });
    }
	$('#urlsubmit').click(loadMessage);
    $('#urlinput').bind('keypress',function(event)
    {
          if(event.keyCode === 13)
          {
              $('#urlsubmit').click();
              return false;
          }
    });
});
