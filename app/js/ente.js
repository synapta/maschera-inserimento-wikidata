$('.ui.search')
  .search({
    apiSettings: {
      url: '/api/suggestion/comune?q={query}'
    },
    fields: {
      results : 'items',
      title   : 'title'
    },
    minCharacters : 3,
    onSelect: function(res, resp) {
        $.ajax({
            type: "POST",
            data: JSON.stringify({id: res.id}),
            contentType: "application/json",
            url: `/api/ente`,
            success: function(data){
                window.location.href = "/upload"
            },
            error: function(data) {
                window.location.href = "/login"
            }
        });
    }
  })
;
