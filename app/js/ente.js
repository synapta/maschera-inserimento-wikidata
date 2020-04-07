$('.ui.search')
  .search({
    apiSettings: {
      url: 'http://localhost:8080/api/suggestion/comune?q={query}'
    },
    fields: {
      results : 'items',
      title   : 'title'
    },
    minCharacters : 3,
    onSelect: function(res, resp) {
        $.ajax({
            type: "GET",
            url: `/api/store/ente?id=${res.id}`,
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
