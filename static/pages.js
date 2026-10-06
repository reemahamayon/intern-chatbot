(function () {
  // Open and close FAQ answers
  document.querySelectorAll('.acc-item').forEach(function (item) {
    var question = item.querySelector('.acc-q');
    var answer = item.querySelector('.acc-a');
    question.addEventListener('click', function () {
      var isOpen = item.classList.toggle('open');
      answer.style.maxHeight = isOpen ? answer.scrollHeight + 'px' : 0;
    });
  });

  // Live search filter
  var search = document.getElementById('pageSearch');
  var emptyNote = document.getElementById('emptyNote');
  if (search) {
    search.addEventListener('input', function () {
      var term = search.value.toLowerCase().trim();
      var shown = 0;
      document.querySelectorAll('[data-search]').forEach(function (el) {
        var match = el.getAttribute('data-search').indexOf(term) !== -1;
        el.style.display = match ? '' : 'none';
        if (match) shown++;
      });
      if (emptyNote) emptyNote.style.display = shown === 0 ? 'block' : 'none';
    });
  }
})();