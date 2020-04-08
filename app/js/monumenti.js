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

$.ajax({
    type: "GET",
    url: "/api/list",
    success: function(array){
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
