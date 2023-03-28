// ==UserScript==
// @name         BambooHR Timesheet Data Entry Extension
// @version      0.1
// @description  Fill BambooHR Timesheet month with templates, inspired by https://github.com/skgsergio/greasemonkey-scripts
// @author       Asad Manji
// @match        https://*.bamboohr.com/employees/timesheet/*
// @homepageURL  https://github.com/asadmanji/bamboohr-timesheet-greasemonkey/
// @updateURL    https://raw.githubusercontent.com/asadmanji/bamboohr-timesheet-greasemonkey/main/bamboohr-timesheet-data-entry.user.js
// ==/UserScript==

'use strict';

const CONTAINER_CLASSLIST = 'TimesheetSummary__clockButtonWrapper';
const BUTTON_CLASSLIST = 'fab-Button fab-Button--small fab-Button--width100';

/* Here be dragons */
(async function() {

  let tsd = JSON.parse(document.getElementById('js-timesheet-data').innerHTML);
  let employeeId = tsd.employeeId;
  let projectsMap = new Map(tsd.projectsWithTasks.allIds.map(i => [i, tsd.projectsWithTasks.byId[i].name] ));
  let datesToFill = tsd.timesheet.dailyDetails;

  
  /* Fill Month */
  let container_fill = document.createElement('div');
  container_fill.classList.value = CONTAINER_CLASSLIST;

  let btn_fill = document.createElement('button');
  container_fill.append(btn_fill);

  btn_fill.type = 'button';
  btn_fill.classList.value = BUTTON_CLASSLIST;
  btn_fill.innerText = 'Fill Month';

  btn_fill.onclick = function () { 
		let entries = [];
    
    for (const [day, details] of Object.entries(tsd.timesheet.dailyDetails)) {
      let date = new Date(day);

      /* Skip weekend */
      if ([0, 6].includes(date.getDay())) {
        continue;
      }
      
      entries.push({
          id: null,
          trackingId: null,
          employeeId: employeeId,
          date: day,
          projectId: null,
          note: ''
        });
    }
    
    alert("Projects:\n" + JSON.stringify(...projectsMap) + "\nEntries:\n" + JSON.stringify(entries)); 
   
  }

    
  /* Delete Month */
  let container_del = document.createElement('div');
  container_del.classList.value = CONTAINER_CLASSLIST;

  let btn_del = document.createElement('button');
  container_del.append(btn_del);

  btn_del.type = 'button';
  btn_del.classList.value = BUTTON_CLASSLIST;
  btn_del.innerText = 'Delete Month';

  btn_del.onclick = function () {
    alert("Click2");
  }

  /* Add buttons */
  document.querySelector('.TimesheetSummary').prepend(container_del);
  document.querySelector('.TimesheetSummary').prepend(container_fill);
})();
