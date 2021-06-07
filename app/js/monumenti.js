$('.ui.search')
  .search({
    apiSettings: {
      url: '/api/suggestion/generic?q={query}'
    },
    fields: {
      results : 'search',
      title   : 'titlesnippet',
      description: 'snippet'
    },
    minCharacters : 3,
    onSelect: function(res, resp) {
        window.location.href = `/maschera?id=${res.title}`;
    }
  })
;

$( "#addMonuButton" ).click(function() {
    $("#fase2").show();
});

$( "#finButton" ).click(function(e) {
  e.preventDefault();
  window.open('/download');
  window.location = '/logout';
});

$.ajax({
    type: "GET",
    url: "/api/list",
    success: function(array) {
        //remove duplicates!
        array = array.filter((thing, index, self) =>
          index === self.findIndex((t) => (
            t.label === thing.label && t.id === thing.id
          ))
        )

        if (array.length > 0) {
            $("#monumentList").append(`<ul>`)
            for (let i = 0; i < array.length; i++) {
                $("#monumentList").append(`<li><a href="/maschera?id=${array[i].id}">${array[i].label}</a>`)
            }
            $("#monumentList").append(`</ul>`)
            $("#finButton").show()
        }
    }
});
