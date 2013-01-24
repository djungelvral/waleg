// load the Google data JS Client Library
google.load("gdata", "2.x", {packages: ["calendar","batch"]});

// Constants used as element IDs in the DOM
var DEFAULT_PANE = "default-pane";
var AUTHENTICATED_PANE = "authenticated-pane";
var AUTH_BUTTON = "auth-button"; 
var LOGOUT_BUTTON = "logout-button"; 
var SAVE_BUTTON = "save-button";
var EVENT_SELECT = "event-select";
var TITLE_FIELD = "title-field";
var DATE_FIELD = "date-field";
var LOCATION_FIELD = "location-field";
var ATTENDEES_FIELD = "attendees-field";
var NOTES_FIELD = "notes-field";
var STATUS_AREA = "status-area";

// Location of the event feed of the primary calendar for the authenticated user
var EVENT_FEED_URL = "https://www.google.com/calendar/feeds/";

var myCalendar;

/**
* Sets the global calendar service to a new instance.  Also resets the form 
* fields to clear out any information that may have been cached.
*/
function cal_init() {
    google.gdata.client.init(handleError);
    if (google.accounts.user.checkLogin(EVENT_FEED_URL)) {
        $(".authenticated-pane").show();
        $(".default-pane").hide();
        // document.getElementById(DEFAULT_PANE).style.display = "none";
        // document.getElementById(AUTHENTICATED_PANE).style.display = "block";
        myCalendar = new oCal();
        // getEvents();
    } else {
        $(".authenticated-pane").hide();
        $(".default-pane").show();
        // document.getElementById(DEFAULT_PANE).style.display = "block";
        // document.getElementById(AUTHENTICATED_PANE).style.display = "none";
    } 
};

// google.setOnLoadCallback(cal_init);

//Login needs to happen before transactions,
//usually via a login button on the web page
function logMeIn() {
    var token = google.accounts.user.login(EVENT_FEED_URL);
}

function logMeOut() {
    if (google.accounts.user.checkLogin(EVENT_FEED_URL)) {
        google.accounts.user.logout();
    }
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
		var _feedUri = 'https://www.google.com/calendar/feeds/default/owncalendars/full';
		// Create an instance of CalendarEntry, representing the new calendar
		this.entry = new google.gdata.calendar.CalendarEntry();
		// Set the calendar title
		this.entry.setTitle(google.gdata.atom.Text.create(title));
		// Set the calendar summary
		var summary = new google.gdata.atom.Text();
		summary.setText('This is a calendar created by wa-leg-cal-parse');
		this.entry.setSummary(summary);
		// Set the calendar timezone
		var timeZone = new google.gdata.calendar.TimeZoneProperty();
		timeZone.setValue('America/Los_Angeles');
		this.entry.setTimeZone(timeZone);
		// Set the calendar location
		var where = new google.gdata.Where();
		where.setLabel('Olympia, WA');
		where.setValueString('Olympia, WA');
		this.entry.addLocation(where);
		// Set the calendar to be visible in the Google Calendar UI
		var hidden = new google.gdata.calendar.HiddenProperty();
		hidden.setValue(false);
		this.entry.setHidden(hidden);
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


// 
// function addEvent(evt){
//     /*
//      * Create a single event
//      */
//     // Create the calendar service object
//     // var calendarService = new google.gdata.calendar.CalendarService('GoogleInc-jsguide-1.0');
//     var calendarID = '6eeg1d2ukd9s41sogkrs00gin0@group.calendar.google.com';
//     // The default "private/full" feed is used to insert event to the
//     // primary calendar of the authenticated user
//     // var feedUri = 'http://www.google.com/calendar/feeds/default/private/full';
//     var feedUri = 'https://www.google.com/calendar/feeds/'+calendarID+'/private/full';
//     // Create an instance of CalendarEventEntry representing the new event
//     var entry = new google.gdata.calendar.CalendarEventEntry({
//         "title" : google.gdata.Text.create(evt.title),
//         "times" : [new google.gdata.When({
//             startTime : new google.gdata.DateTime(evt.start),
//             endTime : new google.gdata.DateTime(evt.end)
//             })]
//     });
//     // Create a When object that will be attached to the event
//     // var when = new google.gdata.When();
//     // Set the start and end time of the When object
//     // var startTime = google.gdata.DateTime.fromIso8601("2010-03-10T09:00:00.000-08:00");
//     // var endTime = google.gdata.DateTime.fromIso8601("2010-03-10T10:00:00.000-08:00");
//     // when.setStartTime(startTime);
//     // when.setEndTime(endTime);
//     // Add the When object to the event
//     // entry.addTime(when);
//     // The callback method that will be called after a successful insertion from insertEntry()
//     var callback = function(result) {
//       alert('event '+evt.title+' created!');
//     }
//     // Error handler will be invoked if there is an error from insertEntry()
//     var handleError = function(error) {
//       alert(error);
//     }
//     // Submit the request using the calendar service object
//     myService.insertEntry(feedUri, entry, callback, handleError, google.gdata.calendar.CalendarEventEntry);
// }
// 
// // /**
// //  * Submits a query for all events that occur today.
// //  */
// // function getEvents() {
// //   var query = new google.gdata.calendar.CalendarEventQuery(EVENT_FEED_URL);
// // 
// //   // Set the start-min parameter to the beginning of today.
// //   var todayDate = new Date();
// //   todayDate.setHours(0);
// //   todayDate.setMinutes(0);
// //   todayDate.setSeconds(0);
// //   todayDate.setMilliseconds(0);
// //   var today = new google.gdata.DateTime(todayDate, false);
// //   query.setMinimumStartTime(google.gdata.DateTime.toIso8601(today));
// // 
// //   // Set the start-max parameter to the beginning of tomorrow.
// //   var tomorrowDate = new Date();
// //   tomorrowDate.setDate(todayDate.getDate() + 1);
// //   tomorrowDate.setHours(0);
// //   tomorrowDate.setMinutes(0);
// //   tomorrowDate.setSeconds(0);
// //   tomorrowDate.setMilliseconds(0);
// //   var tomorrow = new google.gdata.DateTime(tomorrowDate, false);
// //   query.setMaximumStartTime(google.gdata.DateTime.toIso8601(tomorrow));
// // 
// //   // Write the uri to the console for debugging
// //   //google.gdata.util.log("uri=" + query.getUri());
// //   myService.getEventsFeed(query, handleEventsFeed, handleError);
// // };
// // 
// // /**
// //  * Populates the dropdown menu with events returned in the query for
// //  * today's events.
// //  *
// //  * @param {JSON} The JSON object returned by the Calendar service that
// //  *   contains a collection of event entries.
// //  */
// // function handleEventsFeed(myResultsFeedRoot) {
// //   var eventList = document.getElementById(EVENT_SELECT);
// //   eventList.onchange = loadEvent;
// //   eventList.disabled = false; 
// //   eventList.options[eventList.selectedIndex].disabled = true; 
// //   eventList.options[eventList.selectedIndex].text = "Select...";
// //   
// //   myEventsFeed = myResultsFeedRoot.feed;
// //   events = myEventsFeed.getEntries();
// //   for (var i = 0; i < events.length; i++) {
// //     var option = document.createElement("option");
// //     eventTitle = events[i].getTitle().getText();
// //     option.value = i;
// //     option.appendChild(document.createTextNode(eventTitle));
// //     eventList.appendChild(option);
// //   }
// // };
// // 
// // /**
// //  * Populates the event information fields with data from the selected event
// //  * entry. 
// //  */
// // function loadEvent() {
// //   setStatus();
// // 
// //   var saveButton = document.getElementById(SAVE_BUTTON);
// //   saveButton.disabled = false;
// // 
// //   var eventList = document.getElementById(EVENT_SELECT);
// // 
// //   // If the first option (Select...) is selected, don't do anything
// //   if (eventList.selectedIndex == 0) {
// //     return;
// //   }
// //   var eventIndex = eventList.options[eventList.selectedIndex].value;
// //   var event = myEventsFeed.getEntries()[eventIndex];
// // 
// //   var title = document.getElementById(TITLE_FIELD);
// //   title.value = event.getTitle().getText();
// // 
// //   var date = document.getElementById(DATE_FIELD);
// //   date.value = event.getTimes()[0].getStartTime().getDate();
// // 
// //   var theLocation = document.getElementById(LOCATION_FIELD);
// //   theLocation.value = event.getLocations()[0].getValueString();
// //   if (theLocation.value == "undefined") {
// //     theLocation.value = "";
// //   }
// // 
// //   var attendeesDiv = document.getElementById(ATTENDEES_FIELD);
// //   attendeesDiv.innerHTML = "";
// // 
// //   var participants = event.getParticipants();
// //   for (var i = 0; i < participants.length; i++) {
// //     var element = document.createElement("div");
// //     element.innerHTML = participants[i].getEmail();
// //     attendeesDiv.appendChild(element);
// //   }
// //   
// //   var notes = document.getElementById(NOTES_FIELD);
// //   notes.value = event.getContent().getText();
// //   if (notes.value == "undefined") {
// //     notes.value = "";
// //   }
// // };
// // 
// // /**
// //  * Updates the event in Google Calendar with the data in the event information
// //  * fields.
// //  */
// // function saveEvent() {
// //   var eventList = document.getElementById(EVENT_SELECT);
// //   var eventIndex = eventList.options[eventList.selectedIndex].value;
// //   var event = myEventsFeed.getEntries()[eventIndex];
// // 
// //   var title = document.getElementById(TITLE_FIELD).value;
// //   event.getTitle().setText(title);
// //   
// //   var date = new Date(document.getElementById(DATE_FIELD).value);
// //   event.setTimes(null);
// //   var when = new google.gdata.When();
// //   when.setStartTime(date);
// //   when.setEndTime(date); 
// //   event.addTime(when);
// //   
// //   var theLocation = document.getElementById(LOCATION_FIELD).value;
// //   event.getLocations()[0].setValueString(theLocation);
// //   
// //   var notes = document.getElementById(NOTES_FIELD).value;
// //   event.getContent().setText(notes);  
// // 
// //   event.updateEntry(handleSaveSuccess, handleSaveError);
// // };
// // 
// // /**
// //  * Updates the appropriate entry in myEventsFeed and notifies the user that 
// //  * the event was saved.
// //  */
// // function handleSaveSuccess(entryRoot) {
// //   var eventList = document.getElementById(EVENT_SELECT);
// //   var option = eventList.options[eventList.selectedIndex]
// //   option.text = entryRoot.entry.getTitle().getText();
// //   var eventIndex = option.value;
// //   myEventsFeed.getEntries()[eventIndex] = entryRoot.entry;
// //   setStatus("Saved")
// // };
// // 
// // /**
// //  * Sets the status to the given string.  If none is given, then the status is
// //  * cleared.
// //  */
// // function setStatus(msg) {
// //   var eventStatus = document.getElementById(STATUS_AREA);
// //   if (msg) {
// //     eventStatus.innerHTML = msg;
// //   } else {
// //     eventStatus.innerHTML = "";
// //   }
// // };
// // 
// // /**
// //  * Notifies the user that the event was not saved.
// //  */
// // function handleSaveError(e) {
// //   setStatus("Error");
// //   handleError(e);
// // };
// // 

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

// /**
//  * Resets the form back to the same state as when the page first loads. 
//  */
// function reset() {
//   var saveButton = document.getElementById(SAVE_BUTTON);
//   saveButton.disabled = true;
// 
//   var eventList = document.getElementById(EVENT_SELECT); 
//   eventList.options[0].disabled = false; 
//   eventList.options[0].text = "Waiting...";
//   while (eventList.length > 1) {
//      eventList.remove(1);
//   }
//   eventList.disabled = true;
//   
//   document.getElementById(TITLE_FIELD).value = "";
//   document.getElementById(DATE_FIELD).value = "";
//   document.getElementById(LOCATION_FIELD).value = "";
//   var attendeesDiv = document.getElementById(ATTENDEES_FIELD);
//   attendeesDiv.innerHTML = "";
//   document.getElementById(NOTES_FIELD).value = "";
// };
// //]]>
