(function () {
  var buttons = document.querySelectorAll('.filters [data-filter]');
  var jobs = document.querySelectorAll('#job-list .job');
  var count = document.getElementById('job-count');
  var empty = document.getElementById('job-empty');

  function apply(filter) {
    var shown = 0;
    jobs.forEach(function (job) {
      var match = filter === 'all' || job.getAttribute('data-pay') === filter;
      job.hidden = !match;
      if (match) shown += 1;
    });
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === filter));
    });
    count.textContent = shown + (shown === 1 ? ' job' : ' jobs');
    empty.hidden = shown !== 0;
  }

  apply('all');

  buttons.forEach(function (b) {
    b.addEventListener('click', function () { apply(b.getAttribute('data-filter')); });
  });
})();
