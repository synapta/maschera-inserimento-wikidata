$('.ui.search')
  .search({
    apiSettings: {
      url: '/api/suggestion/generic?q={query}'
    },
    fields: {
      results : 'search',
      title   : 'label',
      description: 'description'
    },
    minCharacters : 3,
    onSelect: function(res, resp) {
        window.location.href = `/maschera?id=${res.id}`;
    }
  })
;

$( "#addMonuButton" ).click(function() {
    $("#fase2").show();
});
