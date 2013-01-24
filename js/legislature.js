$(document).ready(function() {
    var debug = true;
	var baseurl = 'http://listserv.wa.gov';
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
    function proxify(str) { if(str.search(/^http:/)<0) {str=baseurl+str;} return ("proxy.php?url="+encodeURIComponent(str)); }
    $("#urlinput").click(function(){ $(this).select(); return false; });
    $('#add-to-google').attr('disabled', 'disabled');
    $('#add-to-ical').attr('disabled', 'disabled');
    $('#add-to-text').attr('disabled', 'disabled');
	function loadMessage() {
		$('.button-action-link').remove();
        $('div#container').hide();
        $('div#container').before('<p id="loading" style="margin:1em 0;">Loading <img src="images/loading.gif" alt="spinner" style="vertical-align:top;"></p>');
		var proxyurl = proxify($('#urlinput').val());
		// var proxyurl = 'wa.html';
        $('div#container').load(proxyurl, function() {
            // console.log(proxify($('#urlinput').val()));
            // Remove header saying Content-Type: text/html
            $(this).contents().eq(0).filter(function() { return this.nodeType == 3 && this.nodeValue.search(/^Content-Type/i) >= 0; }).remove();
            // Remove internal style in the loaded page
            $(this).children('style').remove();
            // Get timetable at top of page
            var $timetable = $('a[name="top"]').siblings('table').eq(0);
            var events = window.events = new Array;
            var startdate, enddate, datestr, timestr;
            $('h1').eq(0).append('<span><label for="all-events"><strong>Select / de-select all:</strong> </label><input type="checkbox" id="all-events" value="all" checked="checked"></span>');
            // $timetable.children('tbody').prepend('<tr id="selectall"><th colspan="2"></th><th style="text-align:right;">Select / de-select all:</th><th><input type="checkbox" id="all-events" value="all"></th></tr>');
            $('#all-events').click(function(){
                var $checkboxes = $("input[name='event'],input[name='day']");
                if($(this).attr("checked")) {
                    $checkboxes.attr("checked","checked");
                } else {
                    $checkboxes.removeAttr("checked");
                }
            });
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
                        if($(this).attr("checked")) {
                            $checkboxes.attr("checked","checked");
                        } else {
                            $checkboxes.removeAttr("checked");
                        }
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
            $('#add-to-google').click(function(){
				// Create new calendar, and on success add events to that calendar
				myCalendar.addCalendar($('#breadcrumb-message > a').text(),function(){
					// Create a stack to hold all the asynchronous api calls, which need to be blocking
					var eventStack = [];
                    // Get list of checked events
                    $timetable.find("input[name='event']:checked").each(function(){
                        var i = $(this).val();
						function addfn(){
							myCalendar.addEvent(ISODateString(events[i].startdate), ISODateString(events[i].enddate), events[i].title, events[i].details, events[i].location,
								function(){if(eventStack.length>0) eventStack.pop().apply();},
								function(e){$(events[i].row).css({'color':'red'});eventStack.push(addfn);});
						};
						// Add to the stack
						eventStack.push(addfn);
                    });
					// Start things rolling...
					eventStack.pop().apply();
				});
				$('#delete-google').remove(); // Delete existing link if present
                $('<a id="delete-google" class="button-action-link" href="#">Delete the created calendar</a>').insertAfter('#add-to-google').click(function(){
					myCalendar.deleteCalendar();
					$('#delete-google').remove();
					return false;
				});
            });
            // Add button to submit checked events to calendar
            $('#add-to-ical').click(function(){
				var ical = new icalendar.iCalendar();
				ical.addProperty('METHOD','PUBLISH');
				ical.addProperty('CALSCALE','GREGORIAN');
				ical.addProperty('X-WR-TIMEZONE','America/Los_Angeles');
				var tz = new icalendar.VTimezone(null, 'America/Los_Angeles');
				ical.addComponent(tz);
				var dst = tz.addComponent('DAYLIGHT');
				dst.addProperty('DTSTART', new Date(2007,2,11,2,0,0));
				dst.addProperty('RRULE', new icalendar.RRule({FREQ: 'YEARLY', BYMONTH: 3, BYDAY: '2SU'}));
				dst.addProperty('TZOFFSETFROM', -800);
				dst.addProperty('TZOFFSETTO', -700);
				dst.addProperty('TZNAME', 'PDT');
				var std = tz.addComponent('STANDARD');
				std.addProperty('DTSTART', new Date(2007,10,4,2,0,0));
				std.addProperty('RRULE', new icalendar.RRule({FREQ: 'YEARLY', BYMONTH: 11, BYDAY: '1SU'}));
				std.addProperty('TZOFFSETFROM', -700);
				std.addProperty('TZOFFSETTO', -800);
				std.addProperty('TZNAME', 'PST');
				// var tz = ical.addComponent('VTIMEZONE');
				var now = new Date();
                // Get list of checked events
                $timetable.find("input[name='event']:checked").each(function(){
                    var i = $(this).val();
					var event = ical.addComponent('VEVENT');
					event.setDate(new Date(events[i].startdate), new Date(events[i].enddate), 'America/Los_Angeles');
					event.addProperty('DTSTAMP',now);
					event.addProperty('UID',now.getTime().toString()+Math.random().toString()+"@wa-leg-schedule-app.com");
					if(events[i].details) event.setDescription(events[i].details);
					event.setSummary(events[i].title);
					if(events[i].location) event.setLocation(events[i].location);
                    // myCalendar.addEvent(events[i].startdate, events[i].enddate, events[i].title, events[i].details, events[i].location);
                });
				// Download file using data URI
				$('#download-ical').remove(); // Delete existing link if present
                $('<a id="download-ical" class="button-action-link" type="text/calendar" target="_blank">Download iCal file</a>').attr('href','data:text/calendar;charset=UTF-8,'+ical.toString()).insertAfter('#add-to-ical');
				// window.location.href='data:text/calendar;charset=UTF-8,'+ical.toString();
				// console.log(decodeURIComponent(ical));
				// window.open('data:text/plain;charset=UTF-8,'+ical.toString(),'_blank','height=1200,width=1200');
            });
            // Add button to make events global
			$('#add-to-text').click(function(){
				$('#download-text').remove(); // Delete existing link if present
                $('<a id="download-text" class="button-action-link" type="text/plain" target="_blank">Download text file</a>')
					.attr('href','data:text/plain;charset=UTF-8,'+encodeURIComponent($(events).map(function(){
							return this.title+"\n"+(new Array(this.title.length+1)).join("-")+"\n"+formatDate(new Date(this.startdate))+(this.location ? " in "+this.location : "")+
							(this.details ? "\n\n"+this.details : "");
						}).toArray().join("\n\n===========================================================\n\n")))
					.insertAfter('#add-to-text');
			});
            $('#add-to-google').removeAttr('disabled');
            $('#add-to-ical').removeAttr('disabled');
            $('#add-to-text').removeAttr('disabled');
            $('#loading').remove();
            $('div#container').fadeIn('slow');
			$('#breadcrumb-message > a > img').remove();
        });
    }
	$('#urlsubmit').click(loadMessage);
    // Initialise calendar functionality
    cal_init();
	// Get archive page and parse list of months
	$('#breadcrumb-archive > a').empty().html('WA-LEG-ARCHIVE <img src="images/loading.gif" alt="spinner" style="vertical-align:top;">');
	$('<div/>').load(proxify('/cgi-bin/wa?A0=waleg-schedule'), function(){
		// var $ul = $(this).find('ul').eq(0);
		var $ul = $('#breadcrumb-archive-list').empty();
		// Copy all the month elements into the menu
		$(this).find('ul').eq(0).children().filter(function(){ return $(this).children('a').attr('href').search('A1=ind') >= 0; }).appendTo($ul)
		// $('#breadcrumb-archive-list').append($ul.children().filter(function(){ return $(this).children('a').attr('href').search('A1=ind') < 0; }));
		// remove non month list elements
		// $ul.children().filter(function(){ return $(this).children('a').attr('href').search('A1=ind') < 0; }).remove();
		// remove links on text in each element
		// $ul.children().each(function(){ $(this).text($(this).children('a').text()); });
		// $ul.addClass('unstyled').appendTo('#breadcrumb-archive');
		$('#breadcrumb-archive > a > img').remove();
		// When we click on a month, load the page, parse it, and show the messages available for that month
		$ul.children('li').click(function(){
			var monthname = $(this).children('a').text();
			var monthurl = $(this).children('a').attr('href');
			$('#breadcrumb-month > a').empty().html(monthname+' <img src="images/loading.gif" alt="spinner" style="vertical-align:top;">');
			$('#breadcrumb-month').css('display','inline');
			$('#breadcrumb-message').hide();
			$('<div/>').load(proxify(monthurl)+' p.archive', function(){
				var $ul2 = $('#breadcrumb-month-list').empty();
				$(this).find('a').filter(function(){ return $(this).attr('href').search('A2=ind') >= 0; }).appendTo($ul2).wrap('<li></li>');
				$('#breadcrumb-month > a > img').remove();
				// When we click on a message, put its url in the box and load it
				$ul2.children('li').click(function(){
					var messagename = $(this).children('a').text();
					var messageurl = $(this).children('a').attr('href');
					$('#breadcrumb-message > a').empty().html(messagename+' <img src="images/loading.gif" alt="spinner" style="vertical-align:top;">');
					$('#breadcrumb-message').css('display','inline');
					// Load message page, retrieve text/html link, and load the message
					$('<div/>').load(proxify(messageurl)+' a[href]', function(){
						$(this).children().each(function(){if($(this).text().search('text/html')>=0){messageurl=$(this).attr('href');}});
						$('#urlinput').val(baseurl+messageurl);
						loadMessage();
					});
					// Prevent link from working
					return false;
				});
			});
			// Prevent link from working
			return false;
		});
	});
	// dropdown menu for breadcrumb
	$('#topbar .breadcrumb > li').hover(function() {
		$(this).children('ul').show();
	}, function() {
		$(this).children('ul').hide();
	});
    // For now, automatically trigger the click
	// $('#urlinput').val('http://listserv.wa.gov/cgi-bin/wa?A3=ind1201&L=WALEG-SCHEDULE&E=base64&P=426505&B=----boundary_0_f3271c78-7a10-4d2a-af95-7bfb0cee5ff9&T=text%2Fhtml;%20charset=utf-8&XSS=3');
    // $('#urlsubmit').click();
});
