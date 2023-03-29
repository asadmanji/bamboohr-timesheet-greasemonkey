// ==UserScript==
// @name         BambooHR Timesheet Data Entry Extension
// @version      0.4
// @description  Fill BambooHR Timesheet month with templates, inspired by https://github.com/skgsergio/greasemonkey-scripts
// @author       Asad Manji
// @match        https://*.bamboohr.com/employees/timesheet/*
// @homepageURL  https://github.com/asadmanji/bamboohr-timesheet-greasemonkey/
// @updateURL    https://raw.githubusercontent.com/asadmanji/bamboohr-timesheet-greasemonkey/main/bamboohr-timesheet-data-entry.user.js
// ==/UserScript==

'use strict';

const WRAPPER_CLASSLIST = 'TimesheetSummary';
const CONTAINER_CLASSLIST = 'TimesheetSummary__clockButtonWrapper';
const BUTTON_CLASSLIST = 'fab-Button fab-Button--small fab-Button--width100';

/* Here be dragons */
(async function() {

  let tsd = JSON.parse(document.getElementById('js-timesheet-data').innerHTML);
  let employeeId = tsd.employeeId;
  let projectsMap = new Map(tsd.projectsWithTasks.allIds.map(i => [i, tsd.projectsWithTasks.byId[i].name] ));
  let datesToFill = tsd.timesheet.dailyDetails;

  if (!tsd.timesheet.canEdit) return;
    
  /* Fill Month Button */
  let container_fill = document.createElement('div');
  container_fill.classList.value = CONTAINER_CLASSLIST;

  let btn_fill = document.createElement('button');
  container_fill.append(btn_fill);

  btn_fill.type = 'button';
  btn_fill.classList.value = BUTTON_CLASSLIST;
  btn_fill.innerText = 'Fill Month';

  btn_fill.onclick = function () { 
    let projectId = document.querySelector('#MyProjectSelector').value;
		let entries = [];
    
    for (const [day, details] of Object.entries(tsd.timesheet.dailyDetails)) {
      let date = new Date(day);

      /* Skip weekend */
      if ([0, 6].includes(date.getDay())) {
        continue;
      }
      
      /* Skip days that  have stuff in already, e.g. time off */
      if (details.totalHours > 0) {
        continue;
      }

      
      entries.push({
          id: null,
          dailyEntryId: 1,
          taskId: null,
          employeeId: employeeId,
          hours: 8, 
          date: day,
          projectId: projectId,
          note: ''
        });
    }
    
    fetch(
      `${window.location.origin}/timesheet/hour/entries`,
      {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          'x-csrf-token': unsafeWindow.CSRF_TOKEN
        },
        body: JSON.stringify({ hours: entries })
      }
    ).then(data => {
      if (data.status == 200) {
        alert(`Created ${entries.length} entries.`);
        location.reload();
      } else {
        data.text().then(t => alert(`Request error!\nHTTP Code: ${data.status}\nResponse:\n${t}`));
      }
    }).catch(err => alert(`Fetch error!\n\n${err}`));
  }

  
  /* Project Select Dropdown */  
  let select_projects = document.createElement('select');
  select_projects.id = 'MyProjectSelector';
  select_projects.name = 'MyProjectSelector';


  for (const [prjId, prjName] of projectsMap) {
    var option = document.createElement("option");
    option.value = prjId;
    option.text = prjName;
    select_projects.appendChild(option);
  }
  
  let label_projects = document.createElement('label');
  label_projects.for = "MyProjectSelector";
  label_projects.innerText = "Project: ";
  
  let container_projects = document.createElement('div');
  container_projects.classList.value = CONTAINER_CLASSLIST;
  container_projects.append(label_projects);
  container_projects.append(select_projects);

  
  /* Create wrapper for controls */
  let container_wrapper = document.createElement('div');
  container_wrapper.classList.value = WRAPPER_CLASSLIST;
  container_wrapper.append(container_projects);
  container_wrapper.append(container_fill);
  
  
  /* Add to page */
  document.querySelector('.TimesheetSummaryContainer').prepend(container_wrapper);
})();
