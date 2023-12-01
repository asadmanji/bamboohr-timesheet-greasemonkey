// ==UserScript==
// @name         BambooHR Timesheet Data Entry Extension
// @version      0.7
// @description  Fill BambooHR Timesheet month with templates, inspired by https://github.com/skgsergio/greasemonkey-scripts
// @author       Asad Manji
// @match        https://*.bamboohr.com/employees/timesheet/*
// @homepageURL  https://github.com/asadmanji/bamboohr-timesheet-greasemonkey/
// @updateURL    https://raw.githubusercontent.com/asadmanji/bamboohr-timesheet-greasemonkey/main/bamboohr-timesheet-data-entry.user.js
// ==/UserScript==

'use strict';

/* Append Script Function to page
 * This is added as a script to get around not being able to execute `onchange` functions in a sandbox
 *
 * Adapted from - https://stackoverflow.com/a/13485650
 */
function appendScript(fn) {
  let script = document.createElement('script');
  script.type = "text/javascript";
  script.textContent = "(" + fn.toString() + ")()";
  var targ = document.getElementsByTagName ('head')[0] || document.body || document.documentElement;
  targ.appendChild(script)
}

(async function() {

  let tsd = JSON.parse(document.getElementById('js-timesheet-data').innerHTML);
  let employeeId = tsd.employeeId;
  let projectsMap = new Map(tsd.projectsWithTasks.allIds.map(i => [i, tsd.projectsWithTasks.byId[i].name] ));
  let datesToFill = tsd.timesheet.dailyDetails;

  if (!tsd.timesheet.canEdit) return;
  
  /* Inject custom controls onto page */
  let container_wrapper = document.createElement('div');
  container_wrapper.classList.value = 'TimesheetSummary';
  container_wrapper.innerHTML = `
    <div class="TimesheetSummary__title">
        Auto-Fill Timesheet
    </div>
    <div class="TimesheetSummary__clockButtonWrapper">
        <label class="fab-Label" for="MyProjectSelector">Project: </label>
        <select class="fab-SelectToggle fab-SelectToggle--width100" id="MyProjectSelector" name="MyProjectSelector"></select>
    </div>
    <div id="MyTaskSelectorContainer" class="TimesheetSummary__clockButtonWrapper" style="display: none;">
        <label class="fab-Label" for="MyTaskSelector">Task: </label>
        <select class="fab-SelectToggle fab-SelectToggle--width100" id="MyTaskSelector" name="MyTaskSelector"></select>
    </div>
    <div class="TimesheetSummary__clockButtonWrapper">
        <label class="fab-Label" for="MyDateRangeField">Dates: </label>
        <input class="fab-TextInput fab-TextInput--width100" id="MyDateRangeField" name="MyDateRangeField" placeholder="e.g. 1,2,21-30"></input>
    </div>
    <div class="TimesheetSummary__clockButtonWrapper">
        <label class="fab-Label" for="MyHoursField">Hours: </label>
        <input class="fab-TextInput fab-TextInput--width100" id="MyHoursField" name="MyHoursField" type="number" value="8"></input>
    </div>
    <div class="TimesheetSummary__clockButtonWrapper">
        <button id="MyFillMonthBtn" class="fab-Button fab-Button--small fab-Button--width100">
            Fill Month
        </button>
    </div>
    `;
  
  document.querySelector('.TimesheetSummaryContainer').prepend(container_wrapper);
  
  
  /* Number range parse function - https://codereview.stackexchange.com/questions/242077/parsing-numbers-and-ranges-from-a-string-in-javascript */
  let parseIntRange = function(string) {
    let numbers = [];
    for (let match of string.match(/[0-9]+(?:\-[0-9]+)?/g)) {
        if (match.includes("-")) {
            let [begin, end] = match.split("-");
            for (let num = parseInt(begin); num <= parseInt(end); num++) {
                numbers.push(num);
            }
        } else {
            numbers.push(parseInt(match));
        }
    }
    return numbers;
  }
  
  
  /* Populate task Select Dropdown Options */
  let add_project_onchange = function() {
    let tsd = JSON.parse(document.getElementById('js-timesheet-data').innerHTML);
    let tasksMap = new Map(tsd.projectsWithTasks.allIds.map(i => { var tasks = tsd.projectsWithTasks.byId[i].tasks; return [i, new Map(tasks.allIds.map(j => [j, tasks.byId[j].name]))] } ));
  	
    let select_tasks_container = document.getElementById('MyTaskSelectorContainer');
    let select_tasks = document.getElementById('MyTaskSelector');
    
    let on_change = function () {
      let projectId = document.querySelector('#MyProjectSelector').value;

      // Clear select options
      select_tasks.innerHTML = '';
      
      let tasks = tasksMap.get(projectId);

      if (tasks.size == 0) {
        select_tasks_container.style.display = "none";
      } else {
        select_tasks_container.style.display = "block";

        for (const [taskId, taskName] of tasks) {
          var option = document.createElement("option");
          option.value = taskId;
          option.text = taskName;
          select_tasks.appendChild(option);
        }
      }
    }
    
    document.getElementById('MyProjectSelector').onchange = on_change;
    
    // Call once when then page loads for the first selected project
    document.addEventListener('DOMContentLoaded', function() {
      on_change();
    }, false);
  }
  
  appendScript(add_project_onchange);


  /* Populate project Select Dropdown Options */  
  let select_projects = document.getElementById('MyProjectSelector');
  for (const [prjId, prjName] of projectsMap) {
    var option = document.createElement("option");
    option.value = prjId;
    option.text = prjName;
    select_projects.appendChild(option);
  }


  /* Attach Fill Button Action */
  let btn_fill = document.getElementById("MyFillMonthBtn");

  btn_fill.onclick = function () { 
    let projectId = document.querySelector('#MyProjectSelector').value;
    let taskId = document.querySelector('#MyTaskSelector').value || null;
    let hoursToFill = parseInt(document.querySelector('#MyHoursField').value);
    let dateRangeToFill = parseIntRange(document.querySelector('#MyDateRangeField').value);
    let entries = [];
    
    for (const [day, details] of Object.entries(tsd.timesheet.dailyDetails)) {
      let date = new Date(day);
      
      /* Ignore any dates outside requested fill range */
      if (!dateRangeToFill.includes(date.getDate())) {
        continue;
      }

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
          taskId: taskId,
          employeeId: employeeId,
          hours: hoursToFill, 
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
        const dayLabel = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    	alert(`Added ${hoursToFill} hours for:\n${entries.map(e => new Date(e.date)).map(dt => `${dayLabel[dt.getDay()]} ${dt.getDate()}`).join("\n")}`);
        location.reload();
      } else {
        data.text().then(t => alert(`Request error!\nHTTP Code: ${data.status}\nResponse:\n${t}`));
      }
    }).catch(err => alert(`Fetch error!\n\n${err}`));
  }
  
  /* Expand timesheet entries to show project codes/hours that have been entered */
  Array
    .from(document.getElementsByClassName("TimesheetSlat--expandable"))
    .forEach(function(elem){ elem.click(); });
  
})();
