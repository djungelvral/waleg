var clientId = '234167780866.apps.googleusercontent.com';
var scopes = 'https://www.googleapis.com/auth/calendar';
var apiKey = 'AIzaSyC9lKLqnXY1LvMiwM-TY-irkN91O-msSHk';

function handleClientLoad() {
    gapi.client.setApiKey(apiKey);
    window.setTimeout(checkAuth,1);
}

function checkAuth() {
    gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: true}, handleAuthResult);
}

function handleAuthResult(authResult) {
    var authorizeButton = document.getElementById('auth-button');
    if (authResult && !authResult.error) {
        authorizeButton.style.visibility = 'hidden';
        // makeApiCall();
        $(".authenticated-pane").show();
        $(".default-pane").hide();
        gapi.client.load('calendar','v3',function(){
            // var request = gapi.client.calendar.calendarList.list();
            // request.execute(function(resp) {
            //     var mydiv = document.createElement('div');
            //     mydiv.innerHTML = 'Choose a calendar to insert the event:<br />'
            //     for (var i = 0; i < resp.items.length; i++) {
            //         var calendarID = resp.items[i].id;
            //         var calendarSummary = resp.items[i].summary;
            //         var a = document.createElement('a');
            //         a.title = calendarSummary;
            //         a.innerHTML += a.title + '<br />';
            //         a.href='http://mysite.com/intakeCalInsert.cfm?calendar=' +calendarID;
            //         mydiv.appendChild(a);
            //         document.getElementById('events').appendChild(mydiv);
            // 
            //     }
            // });
        });
    } else {
        authorizeButton.style.visibility = '';
        authorizeButton.onclick = handleAuthClick;
        $(".authenticated-pane").hide();
        $(".default-pane").show();
    }
}

function handleAuthClick(event) {
    gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: false}, handleAuthResult);
    return false;
}
/* use a function for the exact format desired... */
function ISODateString(d){
    function pad(n){return n<10 ? '0'+n : n}
    return d.getUTCFullYear()+'-'
    + pad(d.getUTCMonth()+1)+'-'
    + pad(d.getUTCDate())+'T'
    + pad(d.getUTCHours())+':'
    + pad(d.getUTCMinutes())+':'
    + pad(d.getUTCSeconds())+'.000Z'}

    // Google Calendar object constructor
    // http://benhamatake.com/snippets/google-calendar-api-javascript-example/
    var oCal = function() {
        var myService;
        var updater = {};

        this.calendarID = "";// = '8n7sdnclpb24cullln953kjmsk@group.calendar.google.com'; // = 'default'
        var feedUri;// = 'https://www.google.com/calendar/feeds/'+calendarID+'/private/full';

        // function setupMyService() {
            myService = new google.gdata.calendar.CalendarService("wa-leg-cal-parse");
            // }
            this.addCalendar = function(title, success, failure) {
                var request = gapi.client.calendar.calendars.insert({
                    "summary", title,
                    "description", "This is a calendar created by wa-leg-cal-parse",
                    "timeZone", "America/Los_Angeles",
                    "location", "Olympia, WA"
                });

                // The callback method that will be called after a successful
                // insertion from insertEntry()
                self = this;
                var callback = function(result) {
                    self.entry = result.entry;
                    self.calendarID = decodeURIComponent(self.entry.getId().getValue()).match(/\/([^\/]+$)/)[1];
                    feedUri = 'https://www.google.com/calendar/feeds/'+self.calendarID+'/private/full';
                    (typeof success === 'undefined') || success(result);
                    console.log('calendar created!');
                }
                // Error handler will be invoked if there is an error from insertEntry()
                var handleError = function(e) {
                    console.log("Error creating calendar: "+(e.cause ? e.cause.statusText : e.message));
                }
                request.execute(callback);
                // Submit the request using the calendar service object
                myService.insertEntry(_feedUri, this.entry, callback, handleError, google.gdata.calendar.CalendarEntry);
            };
	
            this.deleteCalendar = function() {
                self = this;
                this.entry.deleteEntry(function(){
                    self.calendarID = "";
                });
            }

            //startdate and enddate need to be formatted in ISO = "2007-09-23T18:00:00.000Z"
            function createEvent(startdate, enddate, subject, summary, location) {
                var entry = new google.gdata.calendar.CalendarEventEntry({
                    title: {
                        type: 'text',
                        text: subject
                    },
                    content: {
                        type: 'text',
                        text: summary
                    },
                    locations: [{
                        rel: 'g.event',
                        label: 'Event Location',
                        valueString: location
                    }],
                    times: [{
                        startTime: google.gdata.DateTime.fromIso8601(startdate),
                        endTime: google.gdata.DateTime.fromIso8601(enddate)
                    }]
                });
                return entry;
            }

            var callback = function(result) {
                console.log('Calendar updated with event '+result.entry.getTitle().getText());
                // saveEvent(result.entry.getSelfLink().getHref());
            }

            function handleEntry(result) {
                var entry = result.entry;
                entry.getTitle().setText(updater.title);
                entry.getContent().setText(updater.content);
                entry.getLocations()[0].setValueString(updater.location);
                entry.getTimes()[0].setStartTime(google.gdata.DateTime.fromIso8601(updater.sdate));
                entry.getTimes()[0].setEndTime(google.gdata.DateTime.fromIso8601(updater.edate));
                entry.updateEntry(handleUpdateEntry, handleError);
            }

            function handleDelete(result) {
                result.entry.deleteEntry(handleDeletedEntry, handleError);
            }

            function handleUpdateEntry(result) {
                console.log(result.entry.getTitle().getText() + ' saved');
                // saveEvent(eid);
            }

            function handleDeletedEntry(result) {
                console.log('Calendar entry deleted');
            }

            function handleError(e) {
                console.log('Calendar Error: ' + (e.cause ? e.cause.statusText : e.message));
                // saveEvent(eid);
            }

            this.addEvent = function(startdate, enddate, subject, summary, location, success, failure) {
                console.log('Attempting to store event '+subject);
                var callback = function(result) {
                    console.log('Calendar updated with event '+result.entry.getTitle().getText());
                    (typeof success === 'undefined') || success(result);
                    // saveEvent(result.entry.getSelfLink().getHref());
                }
                function handleError(e) {
                    console.log('Calendar Error: ' + (e.cause ? e.cause.statusText : e.message));
                    (typeof failure === 'undefined') || failure(e);
                    // saveEvent(eid);
                }
                var newEntry = createEvent(startdate, enddate, subject, summary, location);
                // setupMyService('add');
                myService.insertEntry(feedUri, newEntry, callback, handleError, google.gdata.calendar.CalendarEventEntry);
            }

            this.updateEvent = function(startdate, enddate, subject, summary, location) {
                updater = {
                    sdate: startdate,
                    edate: enddate,
                    title: subject,
                    content: summary,
                    location: location
                }   
                // setupMyService();
                myService.getCalendarEventEntry(eid, handleEntry, handleError);     
            }

            this.deleteEvent = function() {
                // setupMyService();
                myService.getCalendarEventEntry(eid, handleDelete, handleError);     
            }
        }

        /**
        * Creates a popup alert to notify the user of a Google data related error.
        * 
        * @param {Object} An error that occurred while attempting to interact with
        *   the Google Calendar service.  
        */
        function handleError(e) {
            if (e instanceof Error) {
                // Alert with the error line number, file and message.
                alert('Error at line ' + e.lineNumber +
                ' in ' + e.fileName + '\n' +
                'Message: ' + e.message);
                // If available, output HTTP error code and status text
                if (e.cause) {
                    var errorStatus = e.cause.status;
                    var statusText = e.cause.statusText;
                    alert('Root cause: HTTP error ' + errorStatus + ' with status text of: ' +
                    statusText);
                }
            } else {
                alert(e.toString());
            }
        };

