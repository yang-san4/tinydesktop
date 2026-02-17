// ===== Calendar Widget =====

(function () {
  const body = document.getElementById('calendar-body');

  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();

  const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  function render() {
    body.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'calendar-header';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '<';
    prevBtn.addEventListener('click', function () {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      render();
    });

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '>';
    nextBtn.addEventListener('click', function () {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      render();
    });

    const title = document.createElement('span');
    title.className = 'calendar-title';
    title.textContent = MONTH_NAMES[viewMonth] + ' ' + viewYear;

    header.appendChild(prevBtn);
    header.appendChild(title);
    header.appendChild(nextBtn);
    body.appendChild(header);

    // Table
    const table = document.createElement('table');
    table.className = 'calendar-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (d) {
      const th = document.createElement('th');
      th.textContent = d;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    let day = 1;
    let nextDay = 1;

    for (let row = 0; row < 6; row++) {
      const tr = document.createElement('tr');
      let hasContent = false;

      for (let col = 0; col < 7; col++) {
        const td = document.createElement('td');
        const cellIndex = row * 7 + col;

        if (cellIndex < firstDay) {
          td.textContent = daysInPrevMonth - firstDay + 1 + cellIndex;
          td.className = 'other-month';
        } else if (day <= daysInMonth) {
          td.textContent = day;
          if (
            day === today.getDate() &&
            viewMonth === today.getMonth() &&
            viewYear === today.getFullYear()
          ) {
            td.className = 'today';
          }
          day++;
          hasContent = true;
        } else {
          td.textContent = nextDay++;
          td.className = 'other-month';
        }

        tr.appendChild(td);
      }

      tbody.appendChild(tr);
      if (!hasContent && day > daysInMonth) break;
    }

    table.appendChild(tbody);
    body.appendChild(table);
  }

  render();
})();
